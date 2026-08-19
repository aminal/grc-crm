import type { NextConfig } from "next";

function getFirebaseAuthHelperDomain(): string | null {
  const configuredDomain = process.env.FIREBASE_AUTH_HELPER_DOMAIN || process.env.NEXT_PUBLIC_FIREBASE_AUTH_HELPER_DOMAIN;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
  const domain = (configuredDomain || (projectId ? `${projectId}.firebaseapp.com` : ""))
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "");

  return domain || null;
}

const firebaseAuthHelperDomain = getFirebaseAuthHelperDomain();

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "21mb",
    },
  },
  async rewrites() {
    if (!firebaseAuthHelperDomain) {
      return [];
    }

    return [
      {
        source: "/__/auth/:path*",
        destination: `https://${firebaseAuthHelperDomain}/__/auth/:path*`,
      },
      {
        source: "/__/firebase/:path*",
        destination: `https://${firebaseAuthHelperDomain}/__/firebase/:path*`,
      },
    ];
  },
};

export default nextConfig;
