import type { NextConfig } from "next";

// OWASP A02:2025 Security Misconfiguration — baseline response headers.
// (No full CSP: heavy inline styles would need 'unsafe-inline', which
// defeats the purpose. Revisit with nonces if the app ever serves
// untrusted HTML — it currently never uses dangerouslySetInnerHTML.)
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
