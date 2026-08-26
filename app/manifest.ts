import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Miras - Family Tree Builder",
    short_name: "Miras",
    description: "Privacy-first, local-first family tree builder.",
    start_url: "/",
    display: "standalone",
    background_color: "#f4f2ed",
    theme_color: "#a94713",
  };
}
