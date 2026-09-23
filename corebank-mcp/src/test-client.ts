import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

async function main() {
  const transport = new StdioClientTransport({
    command: "node",
    args: ["dist/server.js"],
    env: { ...process.env, COREBANK_URL: "http://localhost:3001" },
  });

  const client = new Client({ name: "test-client", version: "1.0.0" });
  await client.connect(transport);

  console.log("=== Connected. Listing tools exposed by the server: ===");
  const { tools } = await client.listTools();
  for (const t of tools) {
    console.log(`- ${t.name}: ${t.description}`);
  }

  const accountId = process.argv[2];
  const otherAccountId = process.argv[3];

  console.log("\n=== Calling get_account via the real MCP protocol: ===");
  const getResult = await client.callTool({
    name: "get_account",
    arguments: { accountId },
  });
  console.log((getResult.content as any)[0].text);

  console.log("\n=== Calling transfer_funds via the real MCP protocol (should hit the daily-limit defect): ===");
  const transferResult = await client.callTool({
    name: "transfer_funds",
    arguments: {
      fromAccountId: accountId,
      toAccountId: otherAccountId,
      amount: 4600,
      description: "MCP test transfer",
    },
  });
  console.log((transferResult.content as any)[0].text, "| isError:", transferResult.isError ?? false);

  await client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
