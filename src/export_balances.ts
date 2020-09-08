import create_api from './api'
import { ApiPromise } from '@polkadot/api'
import { Profile, MemberId } from '@joystream/types/members'
import { Seat, SealedVote } from '@joystream/types/council'
import { Option, Null } from '@polkadot/types/'
import { AccountId, Balance, Hash } from '@polkadot/types/interfaces'
import { Exposure } from '@polkadot/types/interfaces/staking'
import { LinkedMap, SingleLinkedMapEntry } from './linkedMap'
import { ProposalId, Proposal, ActiveStake } from '@joystream/types/proposals'
import assert from 'assert'
import { StakeId, Stake, StakedState } from '@joystream/types/stake'

main()

async function main () {
    const api = await create_api()

    const memberAccounts = await enumerate_member_accounts(api)
    const councilAccounts = await enumerate_council_participant_accounts(api)
    const validatorAccounts = await enumerate_validator_accounts(api)
    

    const allAccounts = new Set([
        ...memberAccounts.root_accounts.values(), 
        ...memberAccounts.controller_accounts.values(),
        ...councilAccounts, 
        ...validatorAccounts
    ])

    const balances = await get_total_balances(api, allAccounts)

    const proposalStakes = await get_proposal_stakes(api)
    
    increment_member_root_account_balances_from_stakes(
        api, proposalStakes, memberAccounts.root_accounts, balances
    )

    console.log(balances)

    // EXPECTED OUTPUT FROM CHAINSPEC IMPORTER
    //   todo: filter accounts with 0 balance!
    // console.log(JSON.stringify({
    //     balances: balances.map(([account, balance]) => [
    //         account,
    //         balance,
    //     ])
    // }))

    api.disconnect()
}

// get sum of freebalance and reserved balances of accounts.
// council participation stakes are 'reserved balances'. So this method can be used to get
// account balances of council members and backers account balances.
async function get_total_balances(api: ApiPromise, accounts: Set<string>) {
    const balances = new Map<string, Balance>()

    for (const account of accounts) {
        const free: Balance = (await api.query.balances.freeBalance(account)) as Balance
        const reserved: Balance = (await api.query.balances.reservedBalance(account)) as Balance
        balances.set(account, free.add(reserved) as Balance)
    }

    return balances
}

// enumerate the member root and controller accounts into a unique set
async function enumerate_member_accounts(api: ApiPromise) {
    const first = 0
    const next = (await api.query.members.membersCreated() as MemberId).toNumber()

    let root_accounts = new Map<number, string>()
    let controller_accounts = new Map<number, string>()

    for (let id = first; id < next; id++ ) {
        const profile = await api.query.members.memberProfile(id) as Option<Profile>

        if (profile.isSome) {
            const p = profile.unwrap();
            root_accounts.set(id, p.root_account.toString())
            controller_accounts.set(id, p.controller_account.toString())
        }
    }

    return ({
        root_accounts,
        controller_accounts
    })
}

// active council accounts, backers
// current applicants and voters are all enforced by runtime to be members. 
// In the odd chance that a member changes their role or member account during
// an election or while in an active council
// we we need to capture the account id this way.
async function enumerate_council_participant_accounts(api: ApiPromise): Promise<Set<string>> {
    const accounts = new Set<string>()

    const seats = await api.query.council.activeCouncil() as unknown as Seat[]
    
    // Only interested in council members here.
    // backers are stored by member id, so are enumerated by enumerating member accounts
    seats.forEach(seat => accounts.add(seat.member.toString()))

    // If there is an active election include the voters account ids
    const hashes = await api.query.councilElection.commitments() as unknown as Hash[];
    const sealed_votes: SealedVote[] = await Promise.all(hashes.map(async (hash) =>
        (await api.query.councilElection.votes(hash)) as unknown as SealedVote
    ))
    sealed_votes.forEach(vote => accounts.add(vote.voter.toString()))
    
    const applicants = await api.query.councilElection.applicants() as unknown as AccountId[]
    applicants.forEach(account => accounts.add(account.toString()))

    return accounts
}

async function enumerate_validator_accounts(api: ApiPromise) : Promise<Set<string>> {
    const validators = await api.derive.staking.validators()

    // Get the nominators
    const getNominatorStashes = async (stashes: AccountId[]) => {
        let stakers: string[] = []
        for(let i = 0; i<stashes.length; i++) {
            (await api.query.staking.stakers(stashes[i]) as unknown as Exposure)
                .others.forEach(staker => stakers.push(staker.who.toString()))
        }
        return stakers
    }

    const currentNominators = await getNominatorStashes(validators.currentElected)
    const waitingNominators = await getNominatorStashes(validators.validators)
    const currentValidators = validators.currentElected.map(stash => stash.toString())
    const waitingValidators = validators.validators.map(stash => stash.toString())

    const stashes = new Set<string>([
        ...currentValidators,
        ...waitingValidators,
        ...currentNominators,
        ...waitingNominators
    ])

    const controllers = new Set<string>()

    for(const stash of stashes) {
        const controller = await api.query.staking.bonded(stash) as unknown as Option<AccountId>
        if (controller.isSome) {
            controllers.add(controller.unwrap().toString())
        }
    }

    return new Set([...stashes, ...controllers])
}

type MemberAndStake = {
    member_id: MemberId
    stake_id: StakeId
}

async function get_proposal_stakes(api: ApiPromise) : Promise<Array<MemberAndStake>> {
    const memberIdAndStakeId = []

    const activeProposalIdsMap = await api.query.proposalsEngine.activeProposalIds()
    const pendingExecutionProposalIdsMap = await api.query.proposalsEngine.pendingExecutionProposalIds()
    
    const activeIds = (new LinkedMap(ProposalId, Null, activeProposalIdsMap)).linked_keys
    const pendingIds = (new LinkedMap(ProposalId, Null, pendingExecutionProposalIdsMap)).linked_keys

    const allIds = activeIds.concat(pendingIds)

    for (let i = 0; i < allIds.length; i++) {
        const id = allIds[i]
        const proposal = await api.query.proposalsEngine.proposals(id) as unknown as Proposal
        const member_id = proposal.proposerId
        assert(proposal.status.type === 'Active')
        const maybeActiveStake = proposal.status.value as Option<ActiveStake>

        if (maybeActiveStake.isNone) {
            continue
        }
        const activeStake = maybeActiveStake.unwrap()
        // having to use getField because ActiveStake constructor is not correctly defined?!
        memberIdAndStakeId.push({
            stake_id: activeStake.getField('stake_id') as StakeId,
            member_id
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
        const balance = balances.get(root_account)
        const stakeEntry = await api.query.stake.stakes(stake.stake_id)
        const stakeInfo = new SingleLinkedMapEntry<StakeId, Stake>(StakeId, Stake, stakeEntry).value

        if (stakeInfo.staking_status.type !== 'Staked') {
            continue
        }
        const staked_amount = (stakeInfo.staking_status.value as StakedState).staked_amount

        if (balance) {
            balances.set(root_account, balance.add(staked_amount) as Balance)
        } else {
            balances.set(root_account, staked_amount)
        }
    }
}

// * working groups
//   storage -> stake_id -> staked amount (staking account)
//      role account
//      identify the member by member id and balances to the member account balance

//   content -> curators -> stake_id (role and application) -> staked amount?
//   role account
//   identify the member by member id and add balances to the member account balance

// compare the computed balance with total issuance as a sanity check.