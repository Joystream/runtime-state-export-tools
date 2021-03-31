import createApi from './api'
import { ApiPromise } from '@polkadot/api'
import { MemberId, Membership } from '@joystream/types/members'

main()

async function main() {
  const api = await createApi()

  const members = await getAllMembers(api)

  console.log(JSON.stringify(members))

  api.disconnect()
}

async function getAllMembers(api: ApiPromise): Promise<any[]> {
  const first = 0
  const next = ((await api.query.members.nextMemberId()) as MemberId).toNumber()

  const members = []

  for (let id = first; id < next; id++) {
    const p = (await api.query.members.membershipById(id)) as Membership

    members.push({
      member_id: id,
      root_account: p.root_account,
      controller_account: p.controller_account,
      handle: p.handle,
      avatar_uri: p.avatar_uri,
      about: p.about,
      registered_at_time: p.registered_at_time,
    })
  }

  return members
}
