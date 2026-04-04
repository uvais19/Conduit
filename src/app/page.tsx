import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { LandingPage } from "@/components/landing/landing-page";
import { getLandingContent } from "@/content/landing";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Conduit — AI Social Media Manager",
  description:
    "AI-powered social media planning, scheduling, approval workflows, and analytics. Strategy to publishing, on autopilot.",
  openGraph: {
    title: "Conduit — AI Social Media Manager",
    description:
      "Plan, create, approve, and schedule in one place. Strategy to publishing, on autopilot.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Conduit — AI Social Media Manager",
    description:
      "Plan, create, approve, and schedule in one place. Strategy to publishing, on autopilot.",
  },
};

export default async function Home() {
  const { userId } = await auth();
  if (userId) {
    redirect("/dashboard");
  }

  return <LandingPage content={getLandingContent()} />;
}
