const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
]
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    serverComponentsExternalPackages: ['pdfjs-dist', 'xlsx'],
  },
  webpack(config, { isServer }) {
    if (isServer) {
      // pdfjs-dist/legacy/build/pdf.mjs is an ESM subpath; webpack can't resolve it
      // statically. Mark it as an external ESM module so webpack skips bundling it
      // but still includes it in Vercel's serverless package via nft tracing.
      config.externals.push(({ request }, callback) => {
        if (request === 'pdfjs-dist/legacy/build/pdf.mjs') {
          return callback(null, `module ${request}`)
        }
        callback()
      })
    }
    return config
  },
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }]
  },
}
export default nextConfig
