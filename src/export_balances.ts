import create_api from './api'
import { ApiPromise } from '@polkadot/api'
import { MemberId, Membership } from '@joystream/types/members'
import { Seat, SealedVote } from '@joystream/types/council'
import { Option } from '@polkadot/types/'
import { AccountId, Balance, Hash } from '@polkadot/types/interfaces'
import { ProposalId, ActiveStake } from '@joystream/types/proposals'
import assert from 'assert'
import { StakeId, StakedState } from '@joystream/types/stake'

type MemberAndStake = {
  memberId: MemberId
  stakeId: StakeId
}

enum WorkingGroups {
  ContentCurators = 'curators',
  StorageProviders = 'storageProviders',
}

const apiModuleByGroup = {
  [WorkingGroups.StorageProviders]: 'storageWorkingGroup',
  [WorkingGroups.ContentCurators]: 'contentDirectoryWorkingGroup',
} as const

main()

async function main() {
  const api = await create_api()

  const memberAccounts = await enumerateMemberAccounts(api)
  const councilAccounts = await enumerateCouncilParticipantAccounts(api)
  const validatorAccounts = await enumerateValidatorAccounts(api)
  const storageWorkerAccounts = await enumerateWorkingGroupWorkerAccountsAndStakes(
    api,
    WorkingGroups.StorageProviders
  )
  const contentWorkerAccounts = await enumerateWorkingGroupWorkerAccountsAndStakes(
    api,
    WorkingGroups.ContentCurators
  )
  const rewardedAccounts = await enumerateRewardedAccounts(api)

  const allAccounts = new Set([
    ...memberAccounts.rootAccounts.values(),
    ...memberAccounts.controllerAccounts.values(),
    ...councilAccounts,
    ...validatorAccounts,
    ...storageWorkerAccounts.roleAccounts,
    ...contentWorkerAccounts.roleAccounts,
    ...rewardedAccounts,
    '5Co9fgda84MeR4SLwfE8EZGXKESkbtf4qAnrfVDTKsPK4qAL',
    '5CJzTaCp5fuqG7NdJQ6oUCwdmFHKichew8w4RZ3zFHM8qSe6',
    '5DcAKnrUmfes76j5ok8XcFheTdzS72NFsJA56AzVrNz9gVEz',
  ])

  // Get initial balances of accounts (free + reserved)
  const balances = await getTotalBalances(api, allAccounts)

  // Any stakes behind active proposals
  const proposalStakes = await enumerateProposalStakes(api)

  // For every stake id (associated with a member id) increment the
  // member's root account with the staked amount
  incrementMemberRootAccountBalancesFromStakes(
    api,
    [
      ...proposalStakes,
      ...storageWorkerAccounts.stakes,
      ...contentWorkerAccounts.stakes,
    ],
    memberAccounts.rootAccounts,
    balances
  )

  // Sum the total balances and filter out accounts with zero balance
  const exportedBalances = []
  let total = 0
  for (const [account, balanceBN] of balances) {
    const balance = balanceBN.toNumber()
    total += balance
    if (balance > 0) {
      exportedBalances.push({
        balance,
        account,
      })
    }
  }

  // compare the computed total balance with total issuance as a sanity check!
  const totalIssuance = ((await api.query.balances.totalIssuance()) as Balance).toNumber()
  console.error('Total Exported:', total)
  console.error('Total Issuance:', totalIssuance)
  assert(total <= totalIssuance)

  console.log(
    JSON.stringify({
      balances: exportedBalances.map((balances) => [
        balances.account,
        balances.balance,
      ]),
    })
  )

  api.disconnect()
}

// get sum of free balance and reserved balance of accounts.
// council participation stakes are 'reserved balances'. So this method can be used to get
// account balances of council members and backers account balances.
async function getTotalBalances(api: ApiPromise, accounts: Set<string>) {
  const balances = new Map<string, Balance>()

  for (const account of accounts) {
    const free: Balance = (await api.derive.balances.all(account)).freeBalance
    const reserved: Balance = (await api.derive.balances.all(account))
      .reservedBalance
    balances.set(account, free.add(reserved) as Balance)
  }

  return balances
}

// enumerate the member root and controller accounts into a unique set
async function enumerateMemberAccounts(api: ApiPromise) {
  const first = 0
  const next = ((await api.query.members.nextMemberId()) as MemberId).toNumber()

  const rootAccounts = new Map<number, string>()
  const controllerAccounts = new Map<number, string>()

  for (let id = first; id < next; id++) {
    const membership = (await api.query.members.membershipById(
      id
    )) as Membership

    rootAccounts.set(id, membership.root_account.toString())
    controllerAccounts.set(id, membership.controller_account.toString())
  }

  return {
    rootAccounts,
    controllerAccounts,
  }
}

// active council accounts, backers
// current applicants and voters are all enforced by runtime to be members.
// In the odd chance that a member changes their role or member account during
// an election or while in an active council
// we we need to capture the account id this way.
async function enumerateCouncilParticipantAccounts(
  api: ApiPromise
): Promise<Set<string>> {
  const accounts = new Set<string>()

  const seats = ((await api.query.council.activeCouncil()) as unknown) as Seat[]

  // Only interested in council members here.
  // backers are stored by member id, so are enumerated by enumerating member accounts
  seats.forEach((seat) => accounts.add(seat.member.toString()))

  // If there is an active election include the voters account ids
  const hashes = ((await api.query.councilElection.commitments()) as unknown) as Hash[]
  const sealedVotes: SealedVote[] = await Promise.all(
    hashes.map(
      async (hash) =>
        ((await api.query.councilElection.votes(hash)) as unknown) as SealedVote
    )
  )
  sealedVotes.forEach((vote) => accounts.add(vote.voter.toString()))

  const applicants = ((await api.query.councilElection.applicants()) as unknown) as AccountId[]
  applicants.forEach((account) => accounts.add(account.toString()))

  return accounts
}

async function enumerateValidatorAccounts(
  api: ApiPromise
): Promise<Set<string>> {
  const validators = await api.derive.staking.validators()
  const currentEra = (await api.query.staking.currentEra()).unwrap()

  // Get the nominators
  const getNominatorStashes = async (stashes: AccountId[]) => {
    const stakers: string[] = []
    for (let i = 0; i < stashes.length; i++) {
      ;(
        await api.query.staking.erasStakers(currentEra, stashes[i])
      ).others.forEach((staker) => stakers.push(staker.who.toString()))
    }
    return stakers
  }

  const currentNominators = await getNominatorStashes(validators.validators)
  const waitingNominators = await getNominatorStashes(validators.nextElected)
  const currentValidators = validators.validators.map((stash) =>
    stash.toString()
  )
  const waitingValidators = validators.nextElected.map((stash) =>
    stash.toString()
  )

  const stashes = new Set<string>([
    ...currentValidators,
    ...waitingValidators,
    ...currentNominators,
    ...waitingNominators,
  ])

  const controllers = new Set<string>()

  for (const stash of stashes) {
    const controller = ((await api.query.staking.bonded(
      stash
    )) as unknown) as Option<AccountId>
    if (controller.isSome) {
      controllers.add(controller.unwrap().toString())
    }
  }

  return new Set([...stashes, ...controllers])
}

async function enumerateProposalStakes(
  api: ApiPromise
): Promise<Array<MemberAndStake>> {
  const memberIdAndStakeId = []

  const activeIds = await api.query.proposalsEngine.activeProposalIds.keys()
  const pendingIds = await api.query.proposalsEngine.pendingExecutionProposalIds.keys()

  const allIds = activeIds.concat(pendingIds)

  for (let i = 0; i < allIds.length; i++) {
    const id = allIds[i].args[0] as ProposalId
    const proposal = await api.query.proposalsEngine.proposals(id)
    const memberId = proposal.proposerId
    assert(proposal.status.type === 'Active')
    const maybeActiveStake = proposal.status.value as Option<ActiveStake>

    if (maybeActiveStake.isNone) {
      continue
    }

    const activeStake = maybeActiveStake.unwrap()
    const stakeId = activeStake.stake_id
    memberIdAndStakeId.push({
      memberId,
      stakeId,
    })
  }

  return memberIdAndStakeId
}

async function incrementMemberRootAccountBalancesFromStakes(
  api: ApiPromise,
  stakes: Array<MemberAndStake>,
  rootAccounts: Map<number, string>,
  balances: Map<string, Balance>
) {
  for (let i = 0; i < stakes.length; i++) {
    const stake = stakes[i]
    const rootAccount = rootAccounts.get(stake.memberId.toNumber())
    // All role stakes must have been for members so there must be a root account
    // in the rootAccounts map
    assert(rootAccount)
    const stakeInfo = await api.query.stake.stakes(stake.stakeId)

    if (stakeInfo.staking_status.type !== 'Staked') {
      continue
    }

    const stakedAmount = (stakeInfo.staking_status.value as StakedState)
      .staked_amount

    const balance = balances.get(rootAccount) || api.createType('u128', 0)
    balances.set(rootAccount, balance.add(stakedAmount) as Balance)
  }
}

// Active worker role accounts and stakes. We don't check stakes in applications
async function enumerateWorkingGroupWorkerAccountsAndStakes(
  api: ApiPromise,
  group: WorkingGroups
) {
  const module = apiModuleByGroup[group]
  const workers = await api.query[module].workerById.entries()

  const roleAccounts = new Set<string>()
  const stakes = []

  for (let i = 0; i < workers.length; i++) {
    const worker = workers[i][1]

    roleAccounts.add(worker.role_account_id.toString())

    if (worker.role_stake_profile.isNone) continue

    const stakeProfile = worker.role_stake_profile.unwrap()

    stakes.push({
      memberId: worker.member_id,
      stakeId: stakeProfile.stake_id,
    })
  }

  return {
    roleAccounts,
    stakes,
  }
}

async function enumerateRewardedAccounts(api: ApiPromise) {
  const relationships = await api.query.recurringRewards.rewardRelationships.entries()

  const accounts = new Set<string>()

  relationships.forEach((relationshipEntry) => {
    const relationship = relationshipEntry[1]
    accounts.add(relationship.getField('account').toString())
  })

  return accounts
}
