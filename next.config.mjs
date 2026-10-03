/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // The PDF routes read assets/fonts/*.ttf at runtime with fs, which
    // Next's file tracing can't see on its own — without this the font is
    // missing from the serverless bundle on Vercel and PDF downloads 500.
    outputFileTracingIncludes: {
      "/api/finance/payments/[id]/receipt": ["./assets/fonts/**/*"],
      "/api/reports/[studentId]/[month]": ["./assets/fonts/**/*"],
    },
  },
};

export default nextConfig;
