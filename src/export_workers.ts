import createApi from './api'
import { WorkerId } from '@joystream/types/working-group'
import { CodecHash } from '@polkadot/types/interfaces'
import { ApiPromise } from '@polkadot/api'

export enum WorkingGroups {
  Storage = 'storageWorkingGroup',
  Content = 'contentDirectoryWorkingGroup',
  Operations = 'operationsWorkingGroup',
  Gateway = 'gatewayWorkingGroup',
}

// run export
main()

// export flow
async function main() {
  // prepare api connection
  const api = await createApi()

  const blockNumner = parseInt(process.env.AT_BLOCK_NUMBER || '')
  const hash = process.env.AT_BLOCK_NUMBER
    ? await api.rpc.chain.getBlockHash(blockNumner)
    : undefined

  // get results for all relevant groups
  const result = {
    storage: await getAllWorkers(api, WorkingGroups.Storage, hash),
    gateway: await getAllWorkers(api, WorkingGroups.Gateway, hash),
  }

  // output results
  console.log(JSON.stringify(result))

  // disconnect api
  api.disconnect()
}

// retrieves all active workers in working group
async function getAllWorkers(
  api: ApiPromise,
  group: WorkingGroups,
  hash: CodecHash | undefined
): Promise<any[]> {
  // get working group entries
  const entries = await (hash
    ? api.query[group].workerById.entriesAt(hash)
    : api.query[group].workerById.entries())

  const workers = []
  for (const [storageKey, rawWorker] of entries) {
    // prepare workerId
    const workerId = (storageKey.args[0] as WorkerId).toNumber()

    // save record
    workers.push({
      id: workerId,
      member_id: rawWorker.member_id,
      reward_relationship: rawWorker.reward_relationship,
      role_account_id: rawWorker.role_account_id,
      role_stake_profile: rawWorker.role_stake_profile,
    })
  }

  return workers
}
