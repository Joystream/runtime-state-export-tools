// @ts-check

import { ApiPromise, WsProvider } from '@polkadot/api'
import { types } from '@joystream/types'

export default async function createApi() {
  // Get URL to websocket endpoint from environment or connect to local node by default
  const WS_URL = process.env.WS_URL || 'ws://127.0.0.1:9944'

  // Initialise the provider
  const provider = new WsProvider(WS_URL)

  // Create the API and wait until ready
  const api = await ApiPromise.create({ provider, types })
  await api.isReady

  return api
}
