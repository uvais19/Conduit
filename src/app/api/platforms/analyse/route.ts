import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { brandManifestos, contentStrategies } from "@/lib/db/schema";
import { listPlatformConnections, getPlatformConnection } from "@/lib/platforms/store";
import { fetchRecentPostsWithDiagnostics } from "@/lib/platforms/fetchers";
import { saveFetchedPosts, saveAnalysis, getAnalyses } from "@/lib/platforms/post-store";
import { runPostAnalyserAgent } from "@/lib/agents/analysis";
import type { BrandManifesto, ContentStrategy } from "@/lib/types";

type AnalysisRunDiagnostic = {
  platform: string;
  dataSource: "live" | "simulated";
  fallbackReason: string | null;
  postsFetched: number;
};

export async function POST() {
    const diagnostics: AnalysisRunDiagnostic[] = [];
  try {
    const session = await requireAuth();
    const tenantId = session.user.tenantId;

    // Must have a brand manifesto to compare against
    const [latestManifesto] = await db
      .select()
      .from(brandManifestos)
      .where(eq(brandManifestos.tenantId, tenantId))
      .orderBy(desc(brandManifestos.createdAt))
      .limit(1);

    if (!latestManifesto?.data) {
      return NextResponse.json(
        { error: "Complete onboarding first so Conduit has a Brand Manifesto to analyse against." },
        { status: 400 }
      );
    }

    const manifesto = latestManifesto.data as BrandManifesto;

    // Fetch strategy if available (optional — analysis works without it)
    const [latestStrategy] = await db
      .select()
      .from(contentStrategies)
      .where(eq(contentStrategies.tenantId, tenantId))
      .orderBy(desc(contentStrategies.createdAt), desc(contentStrategies.id))
      .limit(1);

    const strategy = latestStrategy?.data as ContentStrategy | undefined;

    // Get all connected platforms
    const connections = listPlatformConnections(tenantId);
    if (connections.length === 0) {
      return NextResponse.json(
        { error: "No platforms connected. Connect at least one platform first." },
        { status: 400 }
      );
    }

    // Analyse each connected platform
    for (const conn of connections) {
      const fullConnection = getPlatformConnection(tenantId, conn.platform);
      if (!fullConnection) continue;

      const fetched = await fetchRecentPostsWithDiagnostics(fullConnection, 30);
      const posts = fetched.posts;
      await saveFetchedPosts(tenantId, posts);
      diagnostics.push({
        platform: conn.platform,
        dataSource: fetched.dataSource,
        fallbackReason: fetched.fallbackReason,
        postsFetched: posts.length,
      });

      const analysis = await runPostAnalyserAgent({
        posts,
        platform: conn.platform,
        manifesto,
        strategy,
      });

      await saveAnalysis(tenantId, conn.platform, analysis, posts.length);
    }

    const analyses = await getAnalyses(tenantId);

    return NextResponse.json({ analyses, diagnostics });
  } catch (error) {
    console.error("Post analysis failed:", error);
    return NextResponse.json(
      { error: "Unable to analyse platform posts" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const session = await requireAuth();
    const tenantId = session.user.tenantId;

    const analyses = await getAnalyses(tenantId);
    return NextResponse.json({ analyses });
  } catch (error) {
    console.error("Failed to fetch analyses:", error);
    return NextResponse.json(
      { error: "Unable to fetch analyses" },
      { status: 500 }
    );
  }
}
