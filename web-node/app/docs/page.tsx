import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { Reveal, RevealItem } from "@/components/motion/Reveal";

export const metadata: Metadata = {
  title: "Docs — MC Marketplace",
  description: "Full documentation for the MC Marketplace site, the MCMarket Paper plugin, and the MCP server.",
};

const NAV = [
  { id: "overview", label: "Overview" },
  { id: "website", label: "Website" },
  { id: "plugin", label: "MCMarket plugin" },
  { id: "gui", label: "In-game GUI" },
  { id: "commands", label: "Commands" },
  { id: "config", label: "Configuration" },
  { id: "api-keys", label: "API keys" },
  { id: "mcp", label: "MCP server (AI publishing)" },
  { id: "moderation", label: "Moderation & roles" },
  { id: "security", label: "Security model" },
  { id: "troubleshooting", label: "Troubleshooting" },
];

function Code({ children }: { children: string }) {
  return <code className="text-xs bg-neutral-100 px-1.5 py-0.5 rounded-none">{children}</code>;
}

function H2({ id, children }: { id: string; children: string }) {
  return (
    <h2 id={id} className="text-2xl font-bold mb-4 pt-2 scroll-mt-24 border-b border-border pb-3">
      {children}
    </h2>
  );
}

function H3({ children }: { children: string }) {
  return <h3 className="text-base font-semibold mt-6 mb-2">{children}</h3>;
}

function P({ children }: { children: ReactNode }) {
  return <p className="text-sm text-muted leading-relaxed mb-3">{children}</p>;
}

export default function DocsPage() {
  return (
    <div className="max-w-6xl mx-auto px-6 py-16 w-full flex gap-12">
      <aside className="hidden lg:block w-56 shrink-0">
        <Reveal delay={0}>
          <div className="sticky top-8">
            <div className="text-xs uppercase tracking-wide text-muted mb-3">Contents</div>
            <nav className="flex flex-col gap-1 text-sm">
              {NAV.map((n) => (
                <a key={n.id} href={`#${n.id}`} className="text-muted hover:text-foreground transition-colors py-0.5">
                  {n.label}
                </a>
              ))}
            </nav>
          </div>
        </Reveal>
      </aside>

      <div className="min-w-0 flex-1">
        <Reveal delay={0}>
          <h1 className="text-4xl font-bold mb-2">Documentation</h1>
          <p className="text-muted text-lg leading-relaxed mb-10">
            Everything for running this marketplace: the website, the in-game
            MCMarket plugin, API keys, and AI-driven publishing over MCP.
          </p>
        </Reveal>

        <RevealItem index={0} step={40}>
        <section className="mb-14">
          <H2 id="overview">Overview</H2>
          <P>
            The marketplace has three parts. A <strong>website</strong> where
            authors register, upload plugin jars, and manage listings. A{" "}
            <strong>Paper plugin (MCMarket)</strong> that server admins install
            once, giving them an in-game inventory GUI to browse, install, and
            update marketplace plugins without ever leaving Minecraft. And an{" "}
            <strong>MCP server</strong> that lets AI agents publish and update
            plugins programmatically using a scoped API key.
          </P>
          <P>
            Every uploaded jar is scanned automatically (structural validity,
            path-traversal check, descriptor presence, heuristic scan) before
            it can be downloaded by anyone. See{" "}
            <a href="#security" className="underline underline-offset-4 hover:opacity-70">Security model</a>.
          </P>
        </section>
        </RevealItem>

        <RevealItem index={1} step={40}>
        <section className="mb-14">
          <H2 id="website">Website</H2>
          <H3>Browsing</H3>
          <P>
            <Link href="/browse" className="underline underline-offset-4 hover:opacity-70">Browse</Link>{" "}
            lists every approved plugin with category and text search. Each
            plugin page shows its description, changelog, screenshot gallery,
            and a Modrinth-style download flow: click Download, pick a
            version, then pick a loader (Paper / Spigot / Bukkit).
          </P>
          <H3>Publishing</H3>
          <P>
            Register, then from your <Code>Dashboard</Code> use{" "}
            <Code>Upload</Code> to create a new plugin listing or push a new
            version to an existing one (jar, changelog, supported MC range,
            loaders, screenshots/icon). New plugins start hidden until an
            admin approves them; new versions are scanned automatically and
            individually marked approved/rejected — a plugin can stay visible
            while a specific bad version stays rejected.
          </P>
        </section>
        </RevealItem>

        <RevealItem index={2} step={40}>
        <section className="mb-14">
          <H2 id="plugin">MCMarket plugin</H2>
          <P>
            The in-game client. Single jar, works unmodified from Paper
            1.21.11 through 1.26.2 (stable Bukkit API only, no NMS). Get it
            from the <Link href="/install" className="underline underline-offset-4 hover:opacity-70">install page</Link>,
            drop it in <Code>plugins/</Code>, restart.
          </P>
          <P>
            Paper cannot hot-swap a running plugin&apos;s classes. Every
            install or update in this system writes the jar to disk and
            checks its SHA-256 against the marketplace&apos;s record, but the
            GUI will always tell you a restart is required before the change
            takes effect — there is no claim of live reload anywhere in this
            plugin.
          </P>
        </section>
        </RevealItem>

        <RevealItem index={3} step={40}>
        <section className="mb-14">
          <H2 id="gui">In-game GUI</H2>
          <P>Open the menu with <Code>/marketplace</Code>. Four entry points, no clutter:</P>
          <ul className="text-sm text-muted leading-relaxed list-disc list-inside space-y-2 mb-3">
            <li><strong className="text-foreground">All Plugins</strong> — every approved plugin on the marketplace, paginated.</li>
            <li><strong className="text-foreground">Search</strong> — click it, then type your query in chat (type <Code>cancel</Code> to abort).</li>
            <li>
              <strong className="text-foreground">My Installed / Updates</strong> — every marketplace plugin currently on
              your server. This merges two sources: plugins this tool
              installed itself (tracked precisely, shown with a confirmed
              version and hash), and plugins it <em>auto-detects</em> by
              scanning every jar in <Code>plugins/</Code> and reading each
              one&apos;s embedded <Code>plugin.yml</Code> name — so a plugin
              you dropped in manually, under a completely different jar
              filename, still shows up here and still gets update checks.
              Each entry also lists the commands that jar registers (read
              straight from its <Code>plugin.yml</Code>), so you can see
              what&apos;s available (e.g. a <Code>reload</Code> command)
              without digging through files. Outdated entries show an anvil
              icon and install the new version with one click.
            </li>
            <li>
              <strong className="text-foreground">Update MCMarket Itself</strong> — appears in the Updates screen when a
              newer version of this plugin is published under the slug set
              in <Code>self-plugin-slug</Code>. Overwrites this plugin&apos;s
              own jar file in place (no leftover duplicate jar, no touching{" "}
              <Code>config.yml</Code> or its data folder), still requires a
              restart to load.
            </li>
            <li>
              <strong className="text-foreground">Settings</strong> — shows the exact command to set the API key.
              The key itself is set with <Code>/mcmarket setkey &lt;key&gt;</Code>, not through chat or the GUI directly:
              a chat prompt would leave the key visible to any chat-logging/Discord-bridge
              plugin and in server logs, so this one path is deliberately a
              command argument instead. Takes effect immediately, no restart needed for the key itself.
            </li>
          </ul>
        </section>
        </RevealItem>

        <RevealItem index={4} step={40}>
        <section className="mb-14">
          <H2 id="commands">Commands</H2>
          <table className="w-full text-sm border border-border">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="p-3 font-medium">Command</th>
                <th className="p-3 font-medium">Aliases</th>
                <th className="p-3 font-medium">Permission</th>
                <th className="p-3 font-medium">Does</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border">
                <td className="p-3"><Code>/marketplace</Code></td>
                <td className="p-3 text-muted"><Code>/mcmarket</Code>, <Code>/market</Code></td>
                <td className="p-3 text-muted"><Code>mcmarket.use</Code> (default: op)</td>
                <td className="p-3 text-muted">Opens the marketplace GUI. Players only.</td>
              </tr>
              <tr className="border-b border-border">
                <td className="p-3"><Code>/mcmarket reload</Code></td>
                <td className="p-3 text-muted">&mdash;</td>
                <td className="p-3 text-muted"><Code>mcmarket.admin</Code> (default: op)</td>
                <td className="p-3 text-muted">Re-reads <Code>config.yml</Code> (API URL/key, check interval) with no restart. Works from console.</td>
              </tr>
              <tr className="border-b border-border">
                <td className="p-3"><Code>/mcmarket update self</Code></td>
                <td className="p-3 text-muted">&mdash;</td>
                <td className="p-3 text-muted"><Code>mcmarket.admin</Code> (default: op)</td>
                <td className="p-3 text-muted">Updates MCMarket itself in one shot, no GUI confirmation. Works from console.</td>
              </tr>
              <tr className="border-b border-border">
                <td className="p-3"><Code>/mcmarket update &lt;slug&gt;</Code></td>
                <td className="p-3 text-muted">&mdash;</td>
                <td className="p-3 text-muted"><Code>mcmarket.admin</Code> (default: op)</td>
                <td className="p-3 text-muted">Updates one installed-via-MCMarket plugin by its marketplace slug. Works from console.</td>
              </tr>
              <tr className="border-b border-border">
                <td className="p-3"><Code>/mcmarket update all</Code></td>
                <td className="p-3 text-muted">&mdash;</td>
                <td className="p-3 text-muted"><Code>mcmarket.admin</Code> (default: op)</td>
                <td className="p-3 text-muted">Updates every outdated plugin MCMarket installed. Works from console.</td>
              </tr>
              <tr className="border-b border-border last:border-b-0">
                <td className="p-3"><Code>/mcmarket setkey &lt;key&gt;</Code></td>
                <td className="p-3 text-muted">&mdash;</td>
                <td className="p-3 text-muted"><Code>mcmarket.admin</Code> (default: op)</td>
                <td className="p-3 text-muted">Sets the API key. Deliberately a command argument, not chat &mdash; keeps the key out of chat logs/relay plugins. Prefer running it from console.</td>
              </tr>
            </tbody>
          </table>
          <P>
            <span className="mt-2 inline-block">
              Every update from these commands still writes the jar and waits
              for a restart to load it &mdash; same restart rule as the GUI.
              A plugin&apos;s own commands (e.g. its <Code>reload</Code>) are
              listed per-plugin inside{" "}
              <strong className="text-foreground">My Installed / Updates</strong> in the GUI, not here.
            </span>
          </P>
        </section>
        </RevealItem>

        <RevealItem index={5} step={40}>
        <section className="mb-14">
          <H2 id="config">Configuration</H2>
          <P>All keys live in <Code>plugins/MCMarket/config.yml</Code>:</P>
          <pre className="text-xs bg-neutral-100 border border-border p-4 overflow-x-auto">
{`# Base host of the marketplace API.
api-base-url: "https://mc-api.corelabs.network"

# Per-server API key. Can also be set with /mcmarket setkey <key> (console recommended).
api-key: ""

# Minutes between automatic update checks.
update-check-interval-minutes: 45

# Marketplace slug this plugin is published under, used by
# "Update MCMarket Itself" to find its own updates.
self-plugin-slug: "mcmarket"`}
          </pre>
        </section>
        </RevealItem>

        <RevealItem index={6} step={40}>
        <section className="mb-14">
          <H2 id="api-keys">API keys</H2>
          <P>
            Create one from your dashboard&apos;s <Code>API Keys</Code>{" "}
            section. Three scopes:
          </P>
          <ul className="text-sm text-muted leading-relaxed list-disc list-inside space-y-1 mb-3">
            <li><Code>full</Code> — everything your account can do.</li>
            <li><Code>upload_only</Code> — publish/update plugins, nothing else. What the Paper plugin needs at minimum.</li>
            <li><Code>mcp</Code> — used by the MCP server; upload-only in practice, every action attributed and audit-logged.</li>
          </ul>
          <P>
            Keys are shown once at creation and stored server-side only as a
            hash — if you lose one, revoke it and create a new one.
          </P>
        </section>
        </RevealItem>

        <RevealItem index={7} step={40}>
        <section className="mb-14">
          <H2 id="mcp">MCP server (AI publishing)</H2>
          <P>
            <Code>mcp-server/</Code> exposes marketplace publishing over the
            Model Context Protocol (stdio transport), so an AI agent (Claude
            Code, Claude Desktop, or any MCP client) can publish and update
            plugins directly. Point it at an <Code>mcp</Code>-scoped API key
            via <Code>MCP_API_KEY</Code> and <Code>API_BASE_URL</Code>.
          </P>
          <ul className="text-sm text-muted leading-relaxed list-disc list-inside space-y-1">
            <li><Code>list_my_plugins</Code></li>
            <li><Code>publish_plugin</Code></li>
            <li><Code>push_version</Code> — jar, changelog, version, MC range</li>
            <li><Code>upload_asset</Code></li>
            <li><Code>get_version_status</Code></li>
            <li><Code>update_plugin_metadata</Code></li>
          </ul>
          <P>
            <span className="mt-2 inline-block">
              Every write is attributed to the key&apos;s owning user and
              logged to the audit log, same as a human upload.
            </span>
          </P>
        </section>
        </RevealItem>

        <RevealItem index={8} step={40}>
        <section className="mb-14">
          <H2 id="moderation">Moderation & roles</H2>
          <P>
            Two independent gates. <strong className="text-foreground">Plugin visibility</strong> is manual: an admin
            reviews new plugins under <Code>/admin</Code> and approves or bans
            them. <strong className="text-foreground">Version scanning</strong> is automatic: every uploaded jar is
            scanned the moment it&apos;s pushed and marked approved or
            rejected without anyone touching a button.
          </P>
          <P>
            There is no UI yet to promote a user to admin — it&apos;s a direct
            database update:
          </P>
          <pre className="text-xs bg-neutral-100 border border-border p-4 overflow-x-auto">
{`docker compose -f deploy/docker-compose.yml exec api-go sh -c \\
  "sqlite3 /app/data/marketplace.db \\"UPDATE users SET role='admin' WHERE username='NAME';\\""`}
          </pre>
        </section>
        </RevealItem>

        <RevealItem index={9} step={40}>
        <section className="mb-14">
          <H2 id="security">Security model</H2>
          <ul className="text-sm text-muted leading-relaxed list-disc list-inside space-y-1">
            <li>Passwords hashed with argon2id, never stored or logged in plaintext.</li>
            <li>Sessions and API keys are opaque random tokens; only their SHA-256 hash is ever stored.</li>
            <li>Session cookie is httpOnly, SameSite=Lax, Secure in production.</li>
            <li>Every uploaded jar is validated (zip structure, path-traversal, descriptor presence) and heuristically scanned before it&apos;s downloadable.</li>
            <li>Every install/update in the Paper plugin verifies the downloaded file&apos;s SHA-256 against the marketplace&apos;s recorded hash before installing it.</li>
            <li>Per-IP and per-key rate limiting, tighter on auth and upload routes.</li>
            <li>All mutating actions (login, upload, approve, ban, key creation) are audit-logged.</li>
          </ul>
        </section>
        </RevealItem>

        <RevealItem index={10} step={40}>
        <section className="mb-14">
          <H2 id="troubleshooting">Troubleshooting</H2>
          <H3>Login doesn't work after registering</H3>
          <P>
            If the website and API are on different subdomains (they are in
            production), the API must set <Code>COOKIE_DOMAIN</Code> to the
            shared parent domain, or the session cookie never reaches the
            frontend. See <Code>deploy/.env.example</Code>.
          </P>
          <H3>A plugin doesn't show as installed</H3>
          <P>
            Manually-placed jars are picked up by name matching, not filename
            — if the jar&apos;s own <Code>plugin.yml</Code> name doesn&apos;t
            resemble the marketplace listing&apos;s name at all, the match can
            miss. This doesn&apos;t affect plugins installed through the GUI
            itself, which are always tracked precisely.
          </P>
          <H3>Install/update says restart required — is that a bug?</H3>
          <P>
            No — Paper cannot swap a plugin&apos;s code into a running JVM
            safely. This is expected on every install and update, including
            self-updates of MCMarket itself.
          </P>
        </section>
        </RevealItem>
      </div>
    </div>
  );
}
