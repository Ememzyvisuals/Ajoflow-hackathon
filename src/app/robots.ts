import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://ajoflow.vercel.app";

  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/api/", "/dashboard", "/groups", "/onboarding", "/settings", "/wallet", "/profile"] },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
