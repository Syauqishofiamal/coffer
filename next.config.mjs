/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['exceljs'],
  // Refuse to be shown inside another site's frame (clickjacking), and a few
  // other safe browser defaults.
  async headers() {
    return [{
      source: '/:path*',
      headers: [
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      ],
    }];
  },
};
export default nextConfig;
