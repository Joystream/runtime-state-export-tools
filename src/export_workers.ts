import createApi from './api'
import { Worker, WorkerId } from '@joystream/types/working-group'

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
  workerById: (id: number) => Promise<Worker>
}

async function getAllWorkers(workingGroupApi: WorkingGroup): Promise<any[]> {
  const next = ((await workingGroupApi.nextWorkerId()) as WorkerId).toNumber()

  const workers = []
  for (let id = 0; id < next; id++) {
    const rawWorker = (await workingGroupApi.workerById(id)) as Worker

    workers.push({
      member_id: rawWorker.member_id,
      reward_relationship: rawWorker.reward_relationship,
      role_account_id: rawWorker.role_account_id,
      role_stake_profile: rawWorker.role_stake_profile,
    })
  }

  return workers
}
