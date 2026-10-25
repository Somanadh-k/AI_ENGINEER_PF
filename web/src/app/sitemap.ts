import type { MetadataRoute } from "next";
import { getPortfolio } from "@/lib/content";

const FALLBACK_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const content = await getPortfolio();
  const base = (content.seo.siteUrl || FALLBACK_URL).replace(/\/$/, "");
  const now = new Date();

  const verifiedProjects = content.projects
    .filter((project) => project.verified)
    .map((project) => ({
      url: `${base}/projects/${project.slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    }));

  return [
    {
      url: base,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    ...verifiedProjects,
    {
      url: `${base}/privacy`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.2,
    },
  ];
}
