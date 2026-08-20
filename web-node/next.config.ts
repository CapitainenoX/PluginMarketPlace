import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Pin the workspace root explicitly: this project isn't at the top of a
  // monorepo git checkout, so Turbopack's root auto-detection picks the
  // wrong ancestor and warns about the stray package-lock.json.
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
