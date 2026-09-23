import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
// This server is a thin adapter: it exposes CoreBank's existing HTTP
// API as MCP tools, rather than reimplementing any banking logic here.
// This is the most common real-world MCP pattern — wrap what already
// exists, don't duplicate it.
const COREBANK_URL = process.env.COREBANK_URL ?? "http://localhost:3001";
const server = new McpServer({
    name: "corebank",
    version: "1.0.0",
});
// --- Tool 1: get_account — read-only, safe to call freely -----------
server.registerTool("get_account", {
    title: "Get account details",
    description: "Look up a CoreBank account by its ID. Returns balance, type, and frozen status.",
    inputSchema: {
        accountId: z.string().describe("The account's UUID"),
    },
}, async ({ accountId }) => {
    const res = await fetch(`${COREBANK_URL}/accounts/${accountId}`);
    const body = await res.json();
    if (!res.ok) {
        return {
            content: [{ type: "text", text: `Error: ${body.error}` }],
            isError: true,
        };
    }
    return { content: [{ type: "text", text: JSON.stringify(body, null, 2) }] };
});
// --- Tool 2: transfer_funds — mutating, scoped and audit-logged ------
server.registerTool("transfer_funds", {
    title: "Transfer funds between two accounts",
    description: "Move money from one CoreBank account to another. Subject to CoreBank's own daily limit and overdraft rules — this tool does not bypass them.",
    inputSchema: {
        fromAccountId: z.string().describe("Source account UUID"),
        toAccountId: z.string().describe("Destination account UUID"),
        amount: z.number().positive().describe("Amount in dollars, must be positive"),
        description: z.string().max(140).describe("A short note for the transaction record"),
    },
}, async ({ fromAccountId, toAccountId, amount, description }) => {
    // Invocation audit log — every attempt, success or failure, is
    // recorded with who/what/when before the call is made. In a real
    // deployment this would write to a durable, append-only log, not
    // stdout — stdout is used here only so the pattern is visible in
    // the demo.
    console.error(JSON.stringify({
        audit: "transfer_funds_attempt",
        fromAccountId,
        toAccountId,
        amount,
        at: new Date().toISOString(),
    }));
    const res = await fetch(`${COREBANK_URL}/transfers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromAccountId, toAccountId, amount, description }),
    });
    const body = await res.json();
    console.error(JSON.stringify({
        audit: "transfer_funds_result",
        ok: res.ok,
        error: body.error ?? null,
        at: new Date().toISOString(),
    }));
    if (!res.ok) {
        return {
            content: [{ type: "text", text: `Transfer failed: ${body.error}` }],
            isError: true,
        };
    }
    return { content: [{ type: "text", text: "Transfer completed successfully." }] };
});
// --- Tool 3: get_statement — read-only ------------------------------
server.registerTool("get_statement", {
    title: "Get monthly statement",
    description: "Get the current month's statement for a CoreBank account.",
    inputSchema: {
        accountId: z.string().describe("The account's UUID"),
    },
}, async ({ accountId }) => {
    const res = await fetch(`${COREBANK_URL}/accounts/${accountId}/statement`);
    const body = await res.json();
    if (!res.ok) {
        return { content: [{ type: "text", text: `Error: ${body.error}` }], isError: true };
    }
    return { content: [{ type: "text", text: JSON.stringify(body, null, 2) }] };
});
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("CoreBank MCP server running on stdio");
}
main().catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
});
