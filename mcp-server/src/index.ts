#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { apiGet, apiJson, apiUpload } from "./apiClient.js";

const server = new McpServer({
  name: "mcmarket-mcp-server",
  version: "0.1.0",
});

server.registerTool(
  "list_my_plugins",
  {
    title: "List my plugins",
    description:
      "List every plugin owned by the authenticated user, across all statuses, with their versions.",
    inputSchema: {},
  },
  async () => {
    const result = await apiGet("/v1/dashboard/uploads");
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  },
);

server.registerTool(
  "publish_plugin",
  {
    title: "Publish a new plugin",
    description: "Create a new plugin listing owned by the authenticated user.",
    inputSchema: {
      name: z.string().describe("Plugin display name"),
      summary: z.string().optional().describe("One-line summary"),
      description: z.string().optional().describe("Full description (markdown)"),
      category_id: z.number().int().optional(),
      tags: z.array(z.string()).optional(),
    },
  },
  async ({ name, summary, description, category_id, tags }) => {
    const result = await apiJson("POST", "/v1/plugins", {
      name,
      summary: summary ?? "",
      description: description ?? "",
      category_id: category_id ?? null,
      tags: tags ?? [],
    });
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  },
);

server.registerTool(
  "push_version",
  {
    title: "Push a new plugin version",
    description:
      "Upload a new jar version for an existing plugin. The jar is read from a local file path and goes through the marketplace's scan pipeline before becoming publicly visible.",
    inputSchema: {
      slug: z.string().describe("Plugin slug"),
      version: z.string().describe("Version string, e.g. 1.2.0"),
      file_path: z.string().describe("Local filesystem path to the jar file"),
      changelog: z.string().optional(),
      mc_version_min: z.string().optional().describe("e.g. 1.21"),
      mc_version_max: z.string().optional().describe("e.g. 1.26"),
    },
  },
  async ({ slug, version, file_path, changelog, mc_version_min, mc_version_max }) => {
    const result = await apiUpload(
      `/v1/plugins/${encodeURIComponent(slug)}/versions`,
      {
        version,
        changelog: changelog ?? "",
        mc_version_min: mc_version_min ?? "",
        mc_version_max: mc_version_max ?? "",
      },
      { fieldName: "file", filePath: file_path },
    );
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  },
);

server.registerTool(
  "upload_asset",
  {
    title: "Upload a plugin icon or screenshot",
    description:
      "Upload an image asset (icon or screenshot) for a plugin. NOTE: depends on an image-asset endpoint on the Go API that may not exist yet in early phases; if the API returns 404, image uploads aren't wired up server-side yet.",
    inputSchema: {
      slug: z.string().describe("Plugin slug"),
      file_path: z.string().describe("Local filesystem path to the image file"),
      kind: z.enum(["icon", "screenshot"]).default("screenshot"),
    },
  },
  async ({ slug, file_path, kind }) => {
    const result = await apiUpload(
      `/v1/plugins/${encodeURIComponent(slug)}/images`,
      { kind },
      { fieldName: "file", filePath: file_path },
    );
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  },
);

server.registerTool(
  "get_version_status",
  {
    title: "Get version scan/approval status",
    description: "Check the scan/approval status of a plugin version by its numeric id.",
    inputSchema: {
      version_id: z.number().int().describe("Version id returned by push_version"),
    },
  },
  async ({ version_id }) => {
    const result = await apiGet(`/v1/versions/${version_id}/status`);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  },
);

server.registerTool(
  "update_plugin_metadata",
  {
    title: "Update plugin metadata",
    description: "Patch a plugin's name, summary, description, or category.",
    inputSchema: {
      slug: z.string().describe("Plugin slug"),
      name: z.string().optional(),
      summary: z.string().optional(),
      description: z.string().optional(),
      category_id: z.number().int().optional(),
    },
  },
  async ({ slug, name, summary, description, category_id }) => {
    const result = await apiJson("PATCH", `/v1/plugins/${encodeURIComponent(slug)}`, {
      name,
      summary,
      description,
      category_id,
    });
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  },
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("mcmarket-mcp-server failed to start:", err);
  process.exit(1);
});
