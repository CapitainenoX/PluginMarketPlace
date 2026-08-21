import { Reveal } from "@/components/motion/Reveal";

export function Footer() {
  return (
    <footer className="border-t border-border mt-auto">
      <Reveal
        className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row justify-between gap-2 text-xs text-muted"
        y={10}
        duration={450}
        delay={150}
      >
        <span>MC Marketplace &mdash; self-hosted Paper plugin marketplace</span>
        <span>Built for Minecraft Paper servers</span>
      </Reveal>
    </footer>
  );
}
