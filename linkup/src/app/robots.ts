import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = "https://linkup-calling.vercel.app";

  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/help"],
      disallow: ["/room/", "/api/"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
