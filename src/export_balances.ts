import create_api from './api'
import { ApiPromise } from '@polkadot/api'
import {
  Profile,
  MemberId,
  ActorInRole,
  Role,
  ActorId,
  RoleKeys,
} from '@joystream/types/members'
import { Seat, SealedVote } from '@joystream/types/council'
import { Option, Null, u128 } from '@polkadot/types/'
import { AccountId, Balance, Hash } from '@polkadot/types/interfaces'
import { Exposure } from '@polkadot/types/interfaces/staking'
import { LinkedMap, SingleLinkedMapEntry } from './linkedMap'
import { ProposalId, Proposal, ActiveStake } from '@joystream/types/proposals'
import assert from 'assert'
import { StakeId, Stake, StakedState } from '@joystream/types/stake'
import { Worker, WorkerId } from '@joystream/types/working-group'
import {
  Curator,
  CuratorId,
  Lead,
  LeadId,
} from '@joystream/types/content-working-group'
import {
  RewardRelationshipId,
  RewardRelationship,
} from '@joystream/types/recurring-rewards'

type MemberAndStake = {
  member_id: MemberId
  stake_id: StakeId
}

main()

async function main() {
  const api = await create_api()

  const memberAccounts = await enumerate_member_accounts(api)
  const councilAccounts = await enumerate_council_participant_accounts(api)
  const validatorAccounts = await enumerate_validator_accounts(api)
  const storageWorkerAccounts = await enumerate_storage_working_group_worker_accounts_and_stakes(
    api
  )
  const contentWgWorkerAccounts = await enumerate_content_wg_accounts_and_stakes(
    api
  )
  const rewardedAccounts = await enumerate_rewarded_accounts(api)

  await enumerate_content_wg_accounts_and_stakes(api)

  const allAccounts = new Set([
    ...memberAccounts.root_accounts.values(),
    ...memberAccounts.controller_accounts.values(),
    ...councilAccounts,
    ...validatorAccounts,
    ...storageWorkerAccounts.roleAccounts,
    ...contentWgWorkerAccounts.roleAccounts,
    ...rewardedAccounts,
    '5Co9fgda84MeR4SLwfE8EZGXKESkbtf4qAnrfVDTKsPK4qAL',
    '5CJzTaCp5fuqG7NdJQ6oUCwdmFHKichew8w4RZ3zFHM8qSe6',
    '5DcAKnrUmfes76j5ok8XcFheTdzS72NFsJA56AzVrNz9gVEz',
  ])

  // Get initial balances of accounts (free + reserved)
  const balances = await get_total_balances(api, allAccounts)

  // Any stakes behind active proposals
  const proposalStakes = await enumerate_proposal_stakes(api)

  // For every stake id (associated with a member id) increment the
  // member's root account with the staked amount
  increment_member_root_account_balances_from_stakes(
    api,
    [
      ...proposalStakes,
      ...storageWorkerAccounts.stakes,
      ...contentWgWorkerAccounts.stakes,
    ],
    memberAccounts.root_accounts,
    balances
  )

  // Sum the total balances and filter out accounts with zero balance
  const exportedBalances = []
  let total = 0
  for (let [account, balance_bn] of balances) {
    const balance = balance_bn.toNumber()
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
      balances: exportedBalances,
    })
  )

  api.disconnect()
}

// get sum of freebalance and reserved balances of accounts.
// council participation stakes are 'reserved balances'. So this method can be used to get
// account balances of council members and backers account balances.
async function get_total_balances(api: ApiPromise, accounts: Set<string>) {
  const balances = new Map<string, Balance>()

  for (const account of accounts) {
    const free: Balance = (await api.query.balances.freeBalance(
      account
    )) as Balance
    const reserved: Balance = (await api.query.balances.reservedBalance(
      account
    )) as Balance
    balances.set(account, free.add(reserved) as Balance)
  }

  return balances
}

// enumerate the member root and controller accounts into a unique set
async function enumerate_member_accounts(api: ApiPromise) {
  const first = 0
  const next = ((await api.query.members.membersCreated()) as MemberId).toNumber()

  let root_accounts = new Map<number, string>()
  let controller_accounts = new Map<number, string>()

  for (let id = first; id < next; id++) {
    const profile = (await api.query.members.memberProfile(id)) as Option<
      Profile
    >

    if (profile.isSome) {
      const p = profile.unwrap()
      root_accounts.set(id, p.root_account.toString())
      controller_accounts.set(id, p.controller_account.toString())
    }
  }

  return {
    root_accounts,
    controller_accounts,
  }
}

// active council accounts, backers
// current applicants and voters are all enforced by runtime to be members.
// In the odd chance that a member changes their role or member account during
// an election or while in an active council
// we we need to capture the account id this way.
async function enumerate_council_participant_accounts(
  api: ApiPromise
): Promise<Set<string>> {
  const accounts = new Set<string>()

  const seats = ((await api.query.council.activeCouncil()) as unknown) as Seat[]

  // Only interested in council members here.
  // backers are stored by member id, so are enumerated by enumerating member accounts
  seats.forEach((seat) => accounts.add(seat.member.toString()))

  // If there is an active election include the voters account ids
  const hashes = ((await api.query.councilElection.commitments()) as unknown) as Hash[]
  const sealed_votes: SealedVote[] = await Promise.all(
    hashes.map(
      async (hash) =>
        ((await api.query.councilElection.votes(hash)) as unknown) as SealedVote
    )
  )
  sealed_votes.forEach((vote) => accounts.add(vote.voter.toString()))

  const applicants = ((await api.query.councilElection.applicants()) as unknown) as AccountId[]
  applicants.forEach((account) => accounts.add(account.toString()))

  return accounts
}

async function enumerate_validator_accounts(
  api: ApiPromise
): Promise<Set<string>> {
  const validators = await api.derive.staking.validators()

  // Get the nominators
  const getNominatorStashes = async (stashes: AccountId[]) => {
    let stakers: string[] = []
    for (let i = 0; i < stashes.length; i++) {
      ;(((await api.query.staking.stakers(
        stashes[i]
      )) as unknown) as Exposure).others.forEach((staker) =>
        stakers.push(staker.who.toString())
      )
    }
    return stakers
  }

  const currentNominators = await getNominatorStashes(validators.currentElected)
  const waitingNominators = await getNominatorStashes(validators.validators)
  const currentValidators = validators.currentElected.map((stash) =>
    stash.toString()
  )
  const waitingValidators = validators.validators.map((stash) =>
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

async function enumerate_proposal_stakes(
  api: ApiPromise
): Promise<Array<MemberAndStake>> {
  const memberIdAndStakeId = []

  const activeProposalIdsMap = await api.query.proposalsEngine.activeProposalIds()
  const pendingExecutionProposalIdsMap = await api.query.proposalsEngine.pendingExecutionProposalIds()

  const activeIds = new LinkedMap(ProposalId, Null, activeProposalIdsMap)
    .linked_keys
  const pendingIds = new LinkedMap(
    ProposalId,
    Null,
    pendingExecutionProposalIdsMap
  ).linked_keys

  const allIds = activeIds.concat(pendingIds)

  for (let i = 0; i < allIds.length; i++) {
    const id = allIds[i]
    const proposal = ((await api.query.proposalsEngine.proposals(
      id
    )) as unknown) as Proposal
    const member_id = proposal.proposerId
    assert(proposal.status.type === 'Active')
    const maybeActiveStake = proposal.status.value as Option<ActiveStake>

    if (maybeActiveStake.isNone) {
      continue
    }
    const activeStake = maybeActiveStake.unwrap()
    // having to use getField because ActiveStake constructor is not correctly defined?!
    memberIdAndStakeId.push({
      member_id,
      stake_id: activeStake.getField('stake_id') as StakeId,
    })
  }

  return memberIdAndStakeId
}

async function increment_member_root_account_balances_from_stakes(
  api: ApiPromise,
  stakes: Array<MemberAndStake>,
  root_accounts: Map<number, string>,
  balances: Map<string, Balance>
) {
  for (let i = 0; i < stakes.length; i++) {
    const stake = stakes[i]
    const root_account = root_accounts.get(stake.member_id.toNumber())
    if (!root_account) continue

    const stakeEntry = await api.query.stake.stakes(stake.stake_id)
    const stakeInfo = new SingleLinkedMapEntry<StakeId, Stake>(
      StakeId,
      Stake,
      stakeEntry
    ).value

    if (stakeInfo.staking_status.type !== 'Staked') {
      continue
    }
    const staked_amount = (stakeInfo.staking_status.value as StakedState)
      .staked_amount

    const balance = balances.get(root_account) || new u128(0)
    balances.set(root_account, balance.add(staked_amount) as Balance)
  }
}

// Active worker role accounts and stakes. We don't check stakes in applications
async function enumerate_storage_working_group_worker_accounts_and_stakes(
  api: ApiPromise
) {
  const workers = new LinkedMap(
    WorkerId,
    Worker,
    await api.query.storageWorkingGroup.workerById()
  ).linked_values

  const roleAccounts = new Set<string>()
  const stakes = []

  for (let i = 0; i < workers.length; i++) {
    const worker = workers[i]

    roleAccounts.add(worker.role_account_id.toString())

    if (worker.role_stake_profile.isNone) continue

    const stakeProfile = worker.role_stake_profile.unwrap()

    stakes.push({
      member_id: worker.member_id,
      stake_id: stakeProfile.stake_id,
    })
  }

  return {
    roleAccounts,
    stakes,
  }
}

async function enumerate_content_wg_accounts_and_stakes(api: ApiPromise) {
  const roleAccounts = new Set<string>()
  const stakes = []

  const curatorsMap = new LinkedMap(
    CuratorId,
    Curator,
    await api.query.contentWorkingGroup.curatorById()
  )

  for (let i = 0; i < curatorsMap.linked_values.length; i++) {
    const curator = curatorsMap.linked_values[i]

    roleAccounts.add(curator.role_account_id.toString())

    if (curator.role_stake_profile.isNone) continue

    const stakeProfile = curator.role_stake_profile.unwrap()

    stakes.push({
      member_id: await memberIdFromCuratorId(api, curatorsMap.linked_keys[i]),
      stake_id: stakeProfile.stake_id,
    })
  }

  // lead role account
  const maybeLeadId = ((await api.query.contentWorkingGroup.currentLeadId()) as unknown) as Option<
    LeadId
  >
  if (maybeLeadId.isSome) {
    const lead = new SingleLinkedMapEntry(
      LeadId,
      Lead,
      await api.query.contentWorkingGroup.leadById(maybeLeadId.unwrap())
    ).value

    roleAccounts.add(lead.role_account.toString())
  }

  return {
    roleAccounts,
    stakes,
  }
}

// From pioneer transport
async function memberIdFromRoleAndActorId(
  api: ApiPromise,
  role: Role,
  id: ActorId
): Promise<MemberId> {
  const memberId = (await api.query.members.membershipIdByActorInRole(
    new ActorInRole({
      role: role,
      actor_id: id,
    })
  )) as MemberId

  return memberId
}

function memberIdFromCuratorId(
  api: ApiPromise,
  curatorId: CuratorId
): Promise<MemberId> {
  return memberIdFromRoleAndActorId(api, new Role(RoleKeys.Curator), curatorId)
}

async function enumerate_rewarded_accounts(api: ApiPromise) {
  const rewards = new LinkedMap(
    RewardRelationshipId,
    RewardRelationship,
    await api.query.recurringRewards.rewardRelationships()
  ).linked_values

  const accounts = new Set<string>()

  rewards.forEach((reward) =>
    accounts.add(reward.getField('account').toString())
  )

  return accounts
}
