import fallback from "@/content/portfolio.json";
import type { PortfolioContent, Project } from "@/lib/types";

// Bundled at build time so the portfolio never depends on API availability.
// When the API is reachable, its content store is the runtime source of truth
// (so the /admin studio can publish without a redeploy).
export const bundledContent = fallback as unknown as PortfolioContent;

export function internalApiBase(): string {
  return process.env.API_INTERNAL_URL ?? "http://127.0.0.1:8000";
}

export async function getPortfolio(): Promise<PortfolioContent> {
  try {
    const response = await fetch(`${internalApiBase()}/api/content`, {
      next: { revalidate: 20 },
      signal: AbortSignal.timeout(2000),
      headers: { accept: "application/json" },
    });
    if (!response.ok) return bundledContent;
    const data = (await response.json()) as PortfolioContent;
    return data.profile?.name ? data : bundledContent;
  } catch {
    return bundledContent;
  }
}

export async function getProjectBySlug(slug: string): Promise<Project | null> {
  const content = await getPortfolio();
  return content.projects.find((project) => project.slug === slug) ?? null;
}

export function allProjectSlugs(content: PortfolioContent): string[] {
  return content.projects.map((project) => project.slug);
}
