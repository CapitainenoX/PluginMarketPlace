import { api } from "@/lib/api-client";
import { ApiKeysManager } from "./ApiKeysManager";
import { Reveal } from "@/components/motion/Reveal";

export default async function ApiKeysPage() {
  const { api_keys } = await api.listApiKeys().catch(() => ({ api_keys: [] }));

  return (
    <div>
      <Reveal delay={0}>
        <h1 className="text-2xl font-bold mb-8">API keys</h1>
        <p className="text-sm text-muted max-w-lg mb-8 leading-relaxed">
          API keys authenticate programmatic access (e.g. the MCP server) via a{" "}
          <code className="text-xs">Bearer</code> token. Scoped keys limit what
          the holder can do: <code className="text-xs">full</code> mirrors your
          account, <code className="text-xs">upload_only</code> can publish
          versions but not manage your account, <code className="text-xs">mcp</code>{" "}
          is for AI-agent publishing.
        </p>
      </Reveal>
      <ApiKeysManager initialKeys={api_keys} />
    </div>
  );
}
