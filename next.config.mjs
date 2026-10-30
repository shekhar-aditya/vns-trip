/** @type {import('next').NextConfig} */
const nextConfig = {
  // Proxy Supabase through our own domain: some ISPs (Jio/Airtel) block *.supabase.co,
  // so browsers call /sb/* and the server forwards it.
  async rewrites() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) return [];
    return [{ source: '/sb/:path*', destination: `${supabaseUrl.replace(/\/$/, '')}/:path*` }];
  },
};

export default nextConfig;
