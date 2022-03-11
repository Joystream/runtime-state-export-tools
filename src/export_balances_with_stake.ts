import createApi from './api'
import { ApiPromise } from '@polkadot/api'
import { CodecHash } from '@polkadot/types/interfaces'
import { encodeAddress } from '@polkadot/util-crypto'
import { Active } from '@joystream/types/proposals'
import { Stake, Staked } from '@joystream/types/stake'

main()


async function main() {
  const api = await createApi()
  const blockNumner = parseInt(process.env.AT_BLOCK_NUMBER || '')
  const hash = process.env.AT_BLOCK_NUMBER
    ? await api.rpc.chain.getBlockHash(blockNumner)
    : undefined

  // Optionally cap exported balance
  const capBalance = parseInt(process.env.CAP_BALANCE || '') || 0
  const balances = (await getAllAccountBalances(api, hash)).map(
    ([addr, balance]) => [
      addr,
      capBalance ? Math.min(capBalance, balance) : balance,
    ]
  )
  const checkStakeSum = await getSumStakeBalances(api, hash)
  let checksum = 0
  checkStakeSum.forEach((stake) => {
    checksum += stake[1]
  })
  const totalIssuance = hash
    ? await api.query.balances.totalIssuance.at(hash)
    : await api.query.balances.totalIssuance()
  
  const allStakes = await getAllStakeBalances(api, hash)
  const allAccounts: any[] = []
  let sum = 0
  balances.forEach(([addr,balance]) => {
    allAccounts.push(addr)
    sum += balance
  })
  let stakeSum = 0
  for (let stake of allStakes) {
    const index = allAccounts.indexOf(stake[0])
    stakeSum += parseInt(stake[1])
    if (index == -1) {
      balances.push([stake])
    } else {
      balances[index][1] += stake[1]
    }
  }
  if (totalIssuance.toNumber() == sum) {
    console.log(`Sum of balances ${sum} is equal to totalIssuance ${totalIssuance}`)
  }
  console.log(`all balances: ${sum}, all stake: ${stakeSum}`)
  if (stakeSum == checksum) {
    console.log(`All funds in the staking account ("5EYCAe5hXYea5XqzoWskP2pTkxxMjsWNjbracyuaMytXfwge") are accounted for, remove it!`)
    console.log(`The old staking account: "5C4hrfjw9DjXZTzV3MwzrrAr9P1MJhSrvWGWqi1eSuyUpnhM" should be added to Joystream?`)
  }
  balances.sort((a, b) => b[1] - a[1])
  api.disconnect()
  console.log("balances")
  console.log(JSON.stringify({ balances }))
}

async function getAllAccountBalances(
  api: ApiPromise,
  hash: CodecHash | undefined
): Promise<any[]> {
  const entries = hash
    ? api.query.system.account.entriesAt(hash)
    : api.query.system.account.entries()

  const balances = []
  const systemAccountsInfo = await entries
  for (const entry of systemAccountsInfo) {
    const address = encodeAddress(entry[0].slice(-32))
    const info = entry[1]
    const totalBalance = info.data.free.add(info.data.reserved).toNumber()
    balances.push([address, totalBalance])
  }
  return balances
}



async function getAllStakeBalances(
  api: ApiPromise,
  hash: CodecHash | undefined
): Promise<any[]> {
  const contentEntries = hash
    ? api.query.contentWorkingGroup.applicationById.entriesAt(hash)
    : api.query.contentWorkingGroup.applicationById.entries()

    const storageEntries = hash
    ? api.query.storageWorkingGroup.applicationById.entriesAt(hash)
    : api.query.storageWorkingGroup.applicationById.entries()

    const distributorEntries = hash
    ? api.query.distributionWorkingGroup.applicationById.entriesAt(hash)
    : api.query.distributionWorkingGroup.applicationById.entries()

    const gatewayEntries = hash
    ? api.query.gatewayWorkingGroup.applicationById.entriesAt(hash)
    : api.query.gatewayWorkingGroup.applicationById.entries()

    const alphaEntries = hash
    ? api.query.operationsWorkingGroupAlpha.applicationById.entriesAt(hash)
    : api.query.operationsWorkingGroupAlpha.applicationById.entries()

    const betaEntries = hash
    ? api.query.operationsWorkingGroupBeta.applicationById.entriesAt(hash)
    : api.query.operationsWorkingGroupBeta.applicationById.entries()

    const gammaEntries = hash
    ? api.query.operationsWorkingGroupGamma.applicationById.entriesAt(hash)
    : api.query.operationsWorkingGroupGamma.applicationById.entries()

    const proposalEntries = hash
    ? api.query.proposalsEngine.proposals.entriesAt(hash)
    : api.query.proposalsEngine.proposals.entries()

    const contentStakes = await contentEntries
    const storageStakes = await storageEntries
    const distributorStakes = await distributorEntries
    const gatewayStakes = await gatewayEntries
    const alphaStakes = await alphaEntries
    const betaStakes = await betaEntries
    const gammaStakes = await gammaEntries
    const proposalStakes = await proposalEntries
    const wgStakeInfo = [
      contentStakes,
      storageStakes,
      distributorStakes,
      gatewayStakes,
      alphaStakes,
      betaStakes,
      gammaStakes,
    ]

    const stakedAccountsData: any[] = []
    for (const entry of proposalStakes) {
      const proposal = entry[1]
      const proposalStatus = proposal.status.value
      if (proposalStatus instanceof Active) {
        const stakingData = proposalStatus.unwrapOr(undefined)
        if (stakingData) {
          const stakeInfo: Stake = hash
          ? await api.query.stake.stakes.at(hash,stakingData.stake_id)
          : await api.query.stake.stakes(stakingData.stake_id)
          
          const stakeStatus = stakeInfo.staking_status.value
          if (stakeStatus instanceof Staked) {
            stakedAccountsData.push([stakingData.source_account_id.toString(),stakeStatus.staked_amount.toNumber()])
          }
        }
      }
    }
    for (const entries of wgStakeInfo) {
      for (const entry of entries) {
        const applicant = entry[1]
        const applicationId = applicant.application_id
        const memberId = applicant.member_id
        const controllerAccount = hash 
        ? await api.query.members.membershipById.at(hash,memberId)
        : await api.query.members.membershipById(memberId)

        const application = hash
        ? await api.query.hiring.applicationById.at(hash,applicationId)
        : await api.query.hiring.applicationById(applicationId)
  
        const applicationStake = application.active_application_staking_id.unwrapOr(undefined)
        const roleStake = application.active_role_staking_id.unwrapOr(undefined)
        if (applicationStake) {
          const applicationStakeInfo: Stake = hash
          ? await api.query.stake.stakes.at(hash,applicationStake)
          : await api.query.stake.stakes(applicationStake)
          
          const stakeStatus = applicationStakeInfo.staking_status.value
          if (stakeStatus instanceof Staked) {
            stakedAccountsData.push([controllerAccount.controller_account.toString(),stakeStatus.staked_amount.toNumber()])
          }
        }
        if (roleStake) {
          const roleStakeInfo: Stake = hash
          ? await api.query.stake.stakes.at(hash,roleStake)
          : await api.query.stake.stakes(roleStake)
          
          const stakeStatus = roleStakeInfo.staking_status.value
          if (stakeStatus instanceof Staked) {
            stakedAccountsData.push([controllerAccount.controller_account.toString(),stakeStatus.staked_amount.toNumber()])
          }
        }
      }
    }
    return stakedAccountsData
  }


  async function getSumStakeBalances(
    api: ApiPromise,
    hash: CodecHash | undefined
  ): Promise<any[]> {
    const entries = hash
  ? api.query.stake.stakes.entriesAt(hash)
  : api.query.stake.stakes.entries()

  const staked = []
  const stakeInfo = await entries
  for (const entry of stakeInfo) {
    const stakeId = entry[0].args[0]
    const stakeStatusPre = entry[1]
    const stakeStatus = stakeStatusPre.staking_status
    const stakeStatusPost = stakeStatus.value
    if (stakeStatusPost instanceof Staked) {
      staked.push([stakeId.toNumber(),stakeStatusPost.staked_amount.toNumber()])
    }
  }
  return staked
}
