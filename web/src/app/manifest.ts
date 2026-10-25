import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SOMANADH.OS — Somanadh K",
    short_name: "SOMANADH.OS",
    description:
      "A living intelligence portfolio: AI engineering, backend systems, grounded assistant, and verified work.",
    start_url: "/",
    display: "standalone",
    background_color: "#08090D",
    theme_color: "#08090D",
    orientation: "portrait-primary",
    categories: ["portfolio", "technology", "developer"],
  };
}
