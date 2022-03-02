# Runtime state export tools

Scripts to export state from a running chain over rpc.

## Run export scripts

```
# Install dependencies (there is no build step)
yarn

# optionally configure
export AT_BLOCK_NUMBER=123
# Cap exported balance
export CAP_BALANCE=10000
# Only export accounts with a minium balance (existential balance for example)
export MIN_BALANCE=10
# Use specific rpc endpoint (default is ws://localhost:9944)
WS_URL=wss://rome-rpc-endpoint.joystream.org:9944/

# Run scripts 
yarn --silent ts-node src/export_members.ts > members.json
yarn --silent ts-node src/export_forum.ts > forum.json
yarn --silent ts-node src/export_balances.ts > balances.json
```
