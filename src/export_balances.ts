import createApi from './api'
import { ApiPromise } from '@polkadot/api'
import { CodecHash } from '@polkadot/types/interfaces'
import { encodeAddress } from '@polkadot/util-crypto'

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

  api.disconnect()

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
