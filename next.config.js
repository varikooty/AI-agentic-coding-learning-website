/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Produces a self-contained .next/standalone server (just the traced
  // dependencies, no full node_modules) for a lean Docker runtime image.
  output: "standalone",
};

module.exports = nextConfig;
