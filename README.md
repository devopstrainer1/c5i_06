#### creating mcp server from scratch

after installing test


npx tsx src/index.ts

npx @modelcontextprotocol/inspector npx tsx src/index.ts


### connect to claude

claude mcp add --transport stdio fmcg -- npx tsx src/index.ts


### validate

claude mcp list

claude mcp get fmcg

.......................

##### using pre-existing mcp server

# Terminal 1 — CoreBank's actual API
cd corebank && npm install && npm run dev

# Terminal 2 — build the MCP wrapper once
cd corebank-mcp && npm install && npx tsc


### adding to claude code

claude mcp add corebank --env COREBANK_URL=http://localhost:3001 -- node /full/path/to/corebank-mcp/dist/server.js

#### to test

# Terminal 2, still — create test accounts and get real IDs
cd ../corebank
A=$(curl -s -X POST http://localhost:3001/accounts -H "Content-Type: application/json" -d '{"ownerId":"alice","type":"standard"}')
A_ID=$(echo "$A" | python3 -c "import json,sys;print(json.load(sys.stdin)['id'])")
B=$(curl -s -X POST http://localhost:3001/accounts -H "Content-Type: application/json" -d '{"ownerId":"bob","type":"standard"}')
B_ID=$(echo "$B" | python3 -c "import json,sys;print(json.load(sys.stdin)['id'])")
echo "A_ID=$A_ID  B_ID=$B_ID"

# Terminal 2 — now run the MCP test client against both
cd ../corebank-mcp
node dist/test-client.js "$A_ID" "$B_ID"

