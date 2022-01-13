import createApi from './api'
import { ApiPromise } from '@polkadot/api'
import { CodecHash } from '@polkadot/types/interfaces'
import { MemberId, Membership } from '@joystream/types/members'

main()

async function main() {
  const api = await createApi()
  const blockNumner = parseInt(process.env.AT_BLOCK_NUMBER || '')
  const hash = process.env.AT_BLOCK_NUMBER
    ? await api.rpc.chain.getBlockHash(blockNumner)
    : undefined

  const members = await getAllMembers(api, hash)

  console.log(JSON.stringify(members))

  api.disconnect()
}

async function getAllMembers(
  api: ApiPromise,
  hash: CodecHash | undefined
): Promise<any[]> {
  const first = 0
  const nextMemberId = hash
    ? api.query.members.nextMemberId.at(hash)
    : api.query.members.nextMemberId()
  const next = ((await nextMemberId) as MemberId).toNumber()
  const members = []
  console.error(first, next)
  for (let id = first; id < next; id++) {
    const membership = hash
      ? api.query.members.membershipById.at(hash, id)
      : api.query.members.membershipById(id)

    const p = (await membership) as Membership

    members.push({
      member_id: id,
      root_account: p.root_account,
      controller_account: p.controller_account,
      handle: p.handle,
      name: ``,
      avatar_uri: p.avatar_uri,
      about: p.about,
      registered_at_time: p.registered_at_time.toNumber(),
    })
  }

  return members
}
