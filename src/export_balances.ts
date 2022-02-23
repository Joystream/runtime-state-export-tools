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
  const capBalance = parseInt(process.env.CAP_BALANCE || '0')
  const allBalances = (await getAllAccountBalances(api, hash)).map(
    ([addr, balance]) => [
      addr,
      capBalance ? Math.min(capBalance, balance) : balance,
    ]
  )

  api.disconnect()

  // Drop any accounts with balance less than MIN_BALACE
  // Best to filter out accounts with less than existential deposit amount
  const minBalance = parseInt(process.env.MIN_BALANCE || '0')
  const balances = allBalances.filter(([, balance]) => balance >= minBalance)

  console.log(JSON.stringify({ balances }))

  const dropped = allBalances.length - balances.length
  if (dropped) {
    console.error(
      `Dropped ${dropped} accounts with less than ${minBalance} balance`
    )
  }
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
