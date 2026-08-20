# mcp-server

MCP server (stdio transport) exposing the marketplace's publishing workflow as tools for AI
agents: `list_my_plugins`, `publish_plugin`, `push_version`, `upload_asset`,
`get_version_status`, `update_plugin_metadata`.

Auth is a bearer API key (env `MCP_API_KEY`) created via the dashboard with `scope: mcp`
(upload-only — cannot delete or transfer plugin ownership; enforced server-side by the Go API).
Every write is attributed to that key's owning user and logged to `audit_log`.

`upload_asset` calls `POST /v1/plugins/{slug}/images`, which doesn't exist in the Go API yet as
of this build — the tool is wired up ahead of that endpoint landing; expect a 404 until it does.

## Setup

```
npm install
npm run build
```

## Environment variables

- `API_BASE_URL` — base URL of the Go API (default `http://localhost:8080`)
- `MCP_API_KEY` — bearer token for an `api_keys` row scoped `mcp`

## Example client config

For Claude Desktop / Claude Code (`claude_desktop_config.json` or equivalent):

```json
{
  "mcpServers": {
    "mcmarket": {
      "command": "node",
      "args": ["C:/Users/capit/Desktop/PluginMarketplace/mcp-server/dist/index.js"],
      "env": {
        "API_BASE_URL": "http://localhost:8080",
        "MCP_API_KEY": "mcp_xxxxxxxxxxxxxxxxxxxxxxxx"
      }
    }
  }
}
```
