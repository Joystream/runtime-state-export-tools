// @ts-check

import { ApiPromise, WsProvider } from '@polkadot/api'
import { registerJoystreamTypes } from '@joystream/types'
import { getTypeRegistry } from '@polkadot/types'
import { ActiveStake } from './overrideTypes'

export default async function create_api() {
  // Get URL to websocket endpoint from environment or connect to local node by default
  const WS_URL = process.env['WS_URL'] || 'ws://127.0.0.1:9944'

  // Initialise the provider
  const provider = new WsProvider(WS_URL)

  // register types before creating the api
  registerJoystreamTypes()

  // override incorrectly registerd type: ActiveStake
  const typeRegistry = getTypeRegistry()
  typeRegistry.register({
    ActiveStake,
  })

  // Create the API and wait until ready
  const api = await ApiPromise.create({ provider })
  await api.isReady

  return api
}
