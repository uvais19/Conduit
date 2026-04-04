function siteOrigin(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (explicit) return explicit;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

export function LandingJsonLd() {
  const base = siteOrigin();
  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        name: "Conduit",
        url: base,
        description:
          "AI-powered social media planning, scheduling, approval workflows, and analytics.",
      },
      {
        "@type": "Organization",
        name: "Conduit",
        url: base,
        description: "AI social media manager from strategy to publish.",
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
    />
  );
}
