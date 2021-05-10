import createApi from './api'
import { Worker, WorkerId } from '@joystream/types/working-group'
import { StorageKey } from '@polkadot/types';
import { AnyTuple } from '@polkadot/types/types';

// run export
main()

// export flow
async function main() {
  // prepare api connection
  const api = await createApi()

  // get results for all relevant groups
  const result = {
    storage: await getAllWorkers(api.query.storageWorkingGroup),
    gateway: await getAllWorkers(api.query.gatewayWorkingGroup),
  }

  // output results
  console.log(JSON.stringify(result))

  // disconnect api
  api.disconnect()
}

// partial interface for working with working group
interface WorkingGroup {
  workerById: {
    entries: () => Promise<[StorageKey<AnyTuple>, Worker][]> // working group entries
  }
}

// retrieves all active workers in working group
async function getAllWorkers(workingGroupApi: WorkingGroup): Promise<any[]> {
  // get working group entries
  const entries = await workingGroupApi.workerById.entries()

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
