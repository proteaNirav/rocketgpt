/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Re-enable lint failures on production builds
    ignoreDuringBuilds: false,
  },
  // Keep TS errors blocking (recommended)
  typescript: { ignoreBuildErrors: false },
}

module.exports = nextConfig
