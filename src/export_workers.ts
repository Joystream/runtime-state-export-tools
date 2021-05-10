import createApi from './api'
import { Worker, WorkerId } from '@joystream/types/working-group'
import { StorageKey } from '@polkadot/types';
import { AnyTuple } from '@polkadot/types/types';

main()

async function main() {
  const api = await createApi()

  const result = {
    storage: await getAllWorkers(api.query.storageWorkingGroup),
    gateway: await getAllWorkers(api.query.gatewayWorkingGroup),
  }
  console.log(JSON.stringify(result))

  api.disconnect()
}

interface WorkingGroup {
  nextWorkerId: () => Promise<WorkerId>
  workerById: {
    entries: () => Promise<[StorageKey<AnyTuple>, Worker][]> // working group entries
  }
}

async function getAllWorkers(workingGroupApi: WorkingGroup): Promise<any[]> {
  const entries = await workingGroupApi.workerById.entries()
  const workers = [] as any[]
  for (const [storageKey, rawWorker] of entries) {
    const workerId = (storageKey.args[0] as any).toNumber()

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
