import create_api from './api'
import { ApiPromise } from '@polkadot/api'
import { Profile, MemberId } from '@joystream/types/members'
import { Option } from '@polkadot/types/'
import { Balance } from '@polkadot/types/interfaces'

main()

async function main () {
    const api = await create_api()

    const accounts = await enumerate_member_accounts(api)
    const balances = await get_account_balances(api, accounts)

    console.log(JSON.stringify({
        balances: balances.map(([account, balance]) => [
            account,
            balance,
        ])
    }))

    api.disconnect()
}

async function get_account_balances(api: ApiPromise, accounts: string[]) {
    let balances = [];

    for (let i = 0; i < accounts.length; i++) {
        const account = accounts[i]
        const free_balance: Balance = (await api.query.balances.freeBalance(account)) as Balance
        balances.push([account, free_balance.toNumber()])
    }

    return balances
}

// member accounts: get freebalance and reserved balances (council participation)
async function enumerate_member_accounts(api: ApiPromise) : Promise<string[]> {
    const first = 0
    const next = (await api.query.members.membersCreated() as MemberId).toNumber()

    let accounts: string[] = []

    for (let id = first; id < next; id++ ) {
        const profile = await api.query.members.memberProfile(id) as Option<Profile>

        if (profile.isSome) {
            const p = profile.unwrap();
            const root_account = p.root_account.toString()
            const controller_account = p.controller_account.toString()

            if (!accounts.includes(root_account)) {
                accounts.push(root_account)
            }
            if (!accounts.includes(controller_account)) {
                accounts.push(controller_account)
            }
        }
    }

    return accounts
}

// TODO:
// staked amounts: we will computer the staked amount associated with various roles and
// add it to the free balance to be the starting freebalance on new chain.

// * enumerate council seat accounts and backers
//   calculated stake amount from council/election structures or just reserved balance from balances module?
// * working groups
//   storage -> stake_id -> staked amount (staking account)
//      role account
//      identify the member by member id and balances to the member account balance
//   content -> curators -> stake_id (role and application) -> staked amount?
//   role account
//   identify the member by member id and add balances to the member account balance
// * Stake behind an active proposal - proposal created by a member -> add to their root account balance
// * Validators -> stash and controller accounts - can't identify an associated member so just include the
//   the accounts as is, read lock information real balance in the stash account, controller just free balance.

// since we have not enabled the account indices OnNewAccount hook, we cannot enumerate accounts.
// there may be accounts used in past roles that have balances but at snapshot time are not associated 
// with a member or active role.
// To enumerate these accounts we must iterate over past Events from the system
//   transfer event and or account created events
// assume no locks, reservation or stake is associated, so just lookup the freebalance for these accounts

// to avoid doing this search for accounts, we can advise members if they have any balance in accounts
// not associated with a member or role to transfer that balance to one of their member accounts

// compare the computed balance with total issuance as a sanity check.