"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PLATFORM_LABELS } from "@/lib/constants";
import type { CompetitorProfile, CompetitorAnalysis } from "@/lib/optimization/types";
import type { Platform } from "@/lib/types";

export default function CompetitorsPage() {
  const [competitors, setCompetitors] = useState<CompetitorProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [discovering, setDiscovering] = useState(false);
  const [analyzing, setAnalyzing] = useState<string | null>(null);
  const [error, setError] = useState("");

  // Add competitor form
  const [showAdd, setShowAdd] = useState(false);
  const [addName, setAddName] = useState("");
  const [addPlatform, setAddPlatform] = useState<Platform>("instagram");
  const [addUrl, setAddUrl] = useState("");
  const [adding, setAdding] = useState(false);

  // Discover form
  const [showDiscover, setShowDiscover] = useState(false);
  const [industry, setIndustry] = useState("");
  const [location, setLocation] = useState("");

  async function fetchCompetitors() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/competitors");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load competitors");
      setCompetitors(data.competitors ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load competitors");
    } finally {
      setLoading(false);
    }
  }

  async function handleDiscover() {
    if (!industry.trim() || !location.trim()) return;
    setDiscovering(true);
    setError("");
    try {
      const res = await fetch("/api/competitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "discover", industry, location }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to discover competitors");
      setShowDiscover(false);
      await fetchCompetitors();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Discovery failed");
    } finally {
      setDiscovering(false);
    }
  }

  async function handleAdd() {
    if (!addName.trim() || !addUrl.trim()) return;
    setAdding(true);
    setError("");
    try {
      const res = await fetch("/api/competitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: addName,
          platform: addPlatform,
          profileUrl: addUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to add competitor");
      setShowAdd(false);
      setAddName("");
      setAddUrl("");
      await fetchCompetitors();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add competitor");
    } finally {
      setAdding(false);
    }
  }

  async function handleAnalyze(competitorId: string) {
    setAnalyzing(competitorId);
    setError("");
    try {
      const res = await fetch("/api/competitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "analyze", competitorId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to analyze competitor");
      await fetchCompetitors();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setAnalyzing(null);
    }
  }

  useEffect(() => {
    fetchCompetitors();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Competitor Intelligence
          </h1>
          <p className="text-muted-foreground">
            AI-discovered competitors and content gap analysis.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setShowDiscover(!showDiscover);
              setShowAdd(false);
            }}
          >
            AI Discover
          </Button>
          <Button
            onClick={() => {
              setShowAdd(!showAdd);
              setShowDiscover(false);
            }}
          >
            Add Competitor
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* AI Discovery form */}
      {showDiscover && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Discover Competitors with AI
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="industry">Industry</Label>
                <Input
                  id="industry"
                  placeholder="e.g. Coffee Shops"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  placeholder="e.g. Austin, TX"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>
            </div>
            <Button
              onClick={handleDiscover}
              disabled={discovering || !industry.trim() || !location.trim()}
            >
              {discovering ? "Discovering…" : "Find Competitors"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Manual add form */}
      {showAdd && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Add Competitor Manually</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="comp-name">Name</Label>
                <Input
                  id="comp-name"
                  placeholder="Business name"
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="comp-platform">Platform</Label>
                <select
                  id="comp-platform"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
                  value={addPlatform}
                  onChange={(e) => setAddPlatform(e.target.value as Platform)}
                >
                  {(
                    Object.entries(PLATFORM_LABELS) as [Platform, string][]
                  ).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="comp-url">Profile URL</Label>
                <Input
                  id="comp-url"
                  placeholder="https://..."
                  value={addUrl}
                  onChange={(e) => setAddUrl(e.target.value)}
                />
              </div>
            </div>
            <Button
              onClick={handleAdd}
              disabled={adding || !addName.trim() || !addUrl.trim()}
            >
              {adding ? "Adding…" : "Add Competitor"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Competitors list */}
      {loading ? (
        <div className="flex h-[300px] items-center justify-center rounded-lg border border-dashed">
          <p className="text-muted-foreground">Loading competitors…</p>
        </div>
      ) : competitors.length === 0 ? (
        <div className="flex h-[300px] items-center justify-center rounded-lg border border-dashed">
          <p className="text-muted-foreground">
            No competitors tracked yet. Use &ldquo;AI Discover&rdquo; or add one
            manually.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {competitors.map((comp) => (
            <Card key={comp.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{comp.name}</CardTitle>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Badge variant="outline">
                        {PLATFORM_LABELS[comp.platform] ?? comp.platform}
                      </Badge>
                      <Badge variant="secondary">{comp.discoveryMethod}</Badge>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleAnalyze(comp.id)}
                    disabled={analyzing === comp.id}
                  >
                    {analyzing === comp.id ? "Analyzing…" : "Analyze"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <a
                  href={comp.profileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline break-all"
                >
                  {comp.profileUrl}
                </a>

                {comp.analysisData && (
                  <AnalysisSection analysis={comp.analysisData} />
                )}

                {comp.lastAnalyzedAt && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Last analyzed:{" "}
                    {new Date(comp.lastAnalyzedAt).toLocaleDateString()}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function AnalysisSection({ analysis }: { analysis: CompetitorAnalysis }) {
  return (
    <div className="mt-4 space-y-3 rounded-md bg-muted p-3">
      <p className="text-sm">{analysis.summary}</p>
      <div className="grid gap-3 sm:grid-cols-2 text-sm">
        <div>
          <p className="text-xs font-medium text-muted-foreground">
            Posting Frequency
          </p>
          <p>{analysis.postingFrequency}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground">
            Schedule Patterns
          </p>
          <p>{analysis.schedulePatterns}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground">
            Engagement Rate
          </p>
          <p>{(analysis.engagementRate * 100).toFixed(2)}%</p>
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground">
            Content Types
          </p>
          <p>{analysis.contentTypes.join(", ") || "—"}</p>
        </div>
      </div>
      {analysis.topThemes.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">
            Top Themes
          </p>
          <div className="flex flex-wrap gap-1">
            {analysis.topThemes.map((theme) => (
              <Badge key={theme} variant="secondary" className="text-xs">
                {theme}
              </Badge>
            ))}
          </div>
        </div>
      )}
      {analysis.hashtagStrategy.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">
            Hashtag Strategy
          </p>
          <p className="text-xs">{analysis.hashtagStrategy.join(" ")}</p>
        </div>
      )}
    </div>
  );
}
