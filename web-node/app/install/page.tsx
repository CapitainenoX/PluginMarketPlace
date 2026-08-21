import type { Metadata } from "next";
import { Reveal } from "@/components/motion/Reveal";

export const metadata: Metadata = {
  title: "Get the plugin — MC Marketplace",
  description: "Install the MCMarket Paper plugin to browse and install marketplace plugins in-game.",
};

const PLUGIN_VERSION = "1.0.5";
const DOWNLOAD_URL = "/downloads/mcmarket-plugin.jar";

export default function InstallPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-16 w-full">
      <Reveal delay={0}>
        <h1 className="text-4xl font-bold mb-2">Get the plugin</h1>
        <p className="text-muted text-lg leading-relaxed">
          MCMarket is the in-game client for this marketplace. Drop it into your
          Paper server and browse, install, and update plugins entirely from an
          inventory GUI &mdash; no manual downloads.
        </p>

        <div className="flex items-center gap-4 mt-8">
          <a
            href={DOWNLOAD_URL}
            download
            className="bg-foreground text-background px-6 py-3 text-sm uppercase tracking-wide font-medium hover:bg-neutral-800 transition-colors"
          >
            Download mcmarket-plugin.jar
          </a>
          <span className="text-sm text-muted">v{PLUGIN_VERSION} &middot; single jar</span>
        </div>
      </Reveal>

      <Reveal delay={100}>
      <section className="mt-14">
        <h2 className="text-xl font-semibold mb-4">Requirements</h2>
        <ul className="text-sm text-muted leading-relaxed list-disc list-inside space-y-1">
          <li>Paper (or a Paper fork) server, version 1.21.11 through 1.26.2</li>
          <li>Java 21 or newer</li>
          <li>An account on this marketplace, and a server API key from your dashboard</li>
        </ul>
      </section>
      </Reveal>

      <Reveal delay={180}>
      <section className="mt-10">
        <h2 className="text-xl font-semibold mb-4">Setup</h2>
        <ol className="text-sm leading-relaxed space-y-4">
          <li>
            <span className="font-medium">1. Drop the jar in.</span>
            <p className="text-muted mt-1">
              Place <code className="text-xs bg-neutral-100 px-1.5 py-0.5">mcmarket-plugin.jar</code> in
              your server&apos;s <code className="text-xs bg-neutral-100 px-1.5 py-0.5">plugins/</code> folder
              and restart the server.
            </p>
          </li>
          <li>
            <span className="font-medium">2. Get an API key.</span>
            <p className="text-muted mt-1">
              From your dashboard, go to{" "}
              <code className="text-xs bg-neutral-100 px-1.5 py-0.5">API Keys</code>, create one scoped{" "}
              <code className="text-xs bg-neutral-100 px-1.5 py-0.5">full</code> or{" "}
              <code className="text-xs bg-neutral-100 px-1.5 py-0.5">upload_only</code>, and copy the token
              &mdash; it&apos;s only shown once.
            </p>
          </li>
          <li>
            <span className="font-medium">3. Configure the plugin.</span>
            <p className="text-muted mt-1">
              Edit <code className="text-xs bg-neutral-100 px-1.5 py-0.5">plugins/MCMarket/config.yml</code>{" "}
              and set your API base URL and key:
            </p>
            <pre className="mt-2 text-xs bg-neutral-100 border border-border p-4 overflow-x-auto">
{`api-base-url: "https://mc-api.corelabs.network"
api-key: "your-server-api-key"`}
            </pre>
            <p className="text-muted mt-1">
              Or skip the file entirely: run{" "}
              <code className="text-xs bg-neutral-100 px-1.5 py-0.5">/mcmarket setkey your-server-api-key</code>{" "}
              (console recommended — never chat, it&apos;s a secret) — takes effect immediately, no restart.
            </p>
          </li>
          <li>
            <span className="font-medium">4. Restart, then open the menu.</span>
            <p className="text-muted mt-1">
              Restart the server once more to load the config, then run{" "}
              <code className="text-xs bg-neutral-100 px-1.5 py-0.5">/marketplace</code> in-game (aliases:{" "}
              <code className="text-xs bg-neutral-100 px-1.5 py-0.5">/mcmarket</code>,{" "}
              <code className="text-xs bg-neutral-100 px-1.5 py-0.5">/market</code>).
            </p>
          </li>
        </ol>
      </section>
      </Reveal>

      <Reveal delay={260}>
      <section className="mt-10">
        <h2 className="text-xl font-semibold mb-4">Good to know</h2>
        <p className="text-sm text-muted leading-relaxed">
          Installing or updating a plugin through the GUI downloads the jar onto
          your server and verifies its checksum, but Paper doesn&apos;t support
          swapping a plugin&apos;s code into a running server. You&apos;ll need
          to restart after an install or update for it to take effect &mdash;
          the GUI will tell you when that&apos;s needed.
        </p>
      </section>
      </Reveal>
    </div>
  );
}
