"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { PLATFORM_LABELS, PLATFORMS } from "@/lib/constants";
import type { Platform } from "@/lib/types";
import { FieldLabelWithHint } from "@/components/field-label-with-hint";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

type ConnectionInfo = {
  id: string;
  platform: Platform;
  displayName: string;
  platformUserId: string;
  platformPageId: string;
  tokenExpiresAt: string | null;
  createdAt: string;
};

const PLATFORM_GUIDES: Record<Platform, { tokenLabel: string; hint: string }> = {
  instagram: {
    tokenLabel: "Instagram Graph API Token",
    hint: "Requires a Facebook Page linked to your Instagram Business account. Use the Graph API Explorer to generate a long-lived token.",
  },
  facebook: {
    tokenLabel: "Facebook Page Access Token",
    hint: "Generate from the Graph API Explorer with pages_manage_posts and pages_read_engagement permissions.",
  },
  linkedin: {
    tokenLabel: "LinkedIn Access Token",
    hint: "Create an app at linkedin.com/developers. Use the 3-legged OAuth flow to get an access token with w_member_social scope.",
  },
  x: {
    tokenLabel: "X (Twitter) Bearer Token",
    hint: "Create a project at developer.twitter.com. Copy the Bearer Token from your app's Keys & Tokens tab.",
  },
  gbp: {
    tokenLabel: "Google Business Profile OAuth Token",
    hint: "Use Google Cloud Console to create OAuth credentials. Authorize the My Business API scope.",
  },
};

const PLATFORM_ADVANCE_MS = 1500;

const CONNECT_FIELD_HINTS = {
  platform:
    "Pick the network you want Conduit to publish to. Each integration uses that provider's API token.",
  displayName:
    "A friendly label in Conduit (e.g. your page or brand name). Shown in the dashboard and publish flows.",
  pageId:
    "The Facebook Page ID linked to your Instagram Business account or Facebook Page. Required for Meta Graph API publishing.",
} as const;

export default function PlatformsPage() {
  const router = useRouter();
  const platformAdvanceTimerRef = useRef<number | null>(null);
  const [connections, setConnections] = useState<ConnectionInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [analysing, setAnalysing] = useState(false);
  const [analysisMessage, setAnalysisMessage] = useState("");

  // Connect form state
  const [connectPlatform, setConnectPlatform] = useState<Platform | "">("");
  const [displayName, setDisplayName] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [pageId, setPageId] = useState("");

  async function fetchConnections() {
    setLoading(true);
    try {
      const res = await fetch("/api/platforms");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Unable to load connections");
      setConnections(data.connections as ConnectionInfo[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchConnections();
  }, []);

  useEffect(() => {
    return () => {
      if (platformAdvanceTimerRef.current) {
        window.clearTimeout(platformAdvanceTimerRef.current);
      }
    };
  }, []);

  function triggerAnalysis() {
    setAnalysing(true);
    setAnalysisMessage("Analysing your existing posts...");
    fetch("/api/platforms/analyse", { method: "POST" })
      .then(async (res) => {
        if (res.ok) {
          setAnalysisMessage("Analysis complete! View results on your dashboard.");
        } else {
          const data = await res.json().catch(() => ({}));
          setAnalysisMessage(
            (data as { error?: string }).error ?? "Analysis could not be completed."
          );
        }
      })
      .catch(() => {
        setAnalysisMessage("Analysis failed. Try again later.");
      })
      .finally(() => {
        setAnalysing(false);
      });
  }

  async function handleConnect() {
    if (!connectPlatform || !accessToken.trim() || !displayName.trim()) return;
    const wasFirstPlatform = connections.length === 0;
    setActionLoading(true);
    setError("");
    try {
      const res = await fetch("/api/platforms/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: connectPlatform,
          displayName: displayName.trim(),
          accessToken: accessToken.trim(),
          platformPageId: pageId.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Unable to connect");

      setConnectPlatform("");
      setDisplayName("");
      setAccessToken("");
      setPageId("");
      await fetchConnections();

      // Auto-trigger post analysis in the background
      triggerAnalysis();

      if (wasFirstPlatform) {
        if (platformAdvanceTimerRef.current) {
          window.clearTimeout(platformAdvanceTimerRef.current);
        }
        platformAdvanceTimerRef.current = window.setTimeout(() => {
          platformAdvanceTimerRef.current = null;
          router.refresh();
          router.push("/dashboard");
        }, PLATFORM_ADVANCE_MS);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to connect");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDisconnect(platform: Platform) {
    setActionLoading(true);
    setError("");
    try {
      const res = await fetch("/api/platforms/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Unable to disconnect");
      await fetchConnections();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to disconnect");
    } finally {
      setActionLoading(false);
    }
  }

  const connectedPlatforms = new Set(connections.map((c) => c.platform));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Connected Platforms</h1>
        <p className="text-muted-foreground">
          Connect your social media accounts to publish content directly from Conduit.
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          You can skip this for now — your drafts and strategy are ready to use.
          Connect a platform whenever you&#39;re ready to publish directly from Conduit.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Analysis status */}
      {analysisMessage && (
        <div
          className={`rounded-lg border p-3 text-sm ${
            analysing
              ? "border-primary/30 bg-primary/5 text-primary"
              : "border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400"
          }`}
        >
          {analysing && (
            <span className="mr-2 inline-block size-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
          )}
          {analysisMessage}
        </div>
      )}

      {/* Re-analyse button */}
      {!loading && connections.length > 0 && (
        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={analysing}
            onClick={triggerAnalysis}
            className="inline-flex h-9 items-center gap-2 rounded-md border px-4 text-sm font-medium hover:bg-accent disabled:opacity-50"
          >
            {analysing ? "Analysing..." : "Re-analyse posts"}
          </button>
          <a
            href="/analysis"
            className="text-sm text-primary hover:underline"
          >
            View analysis results
          </a>
        </div>
      )}

      {/* Connected platforms */}
      <Card>
        <CardHeader>
          <CardTitle>Active Connections</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : connections.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No platforms connected yet. Use the form below to connect your first platform.
            </p>
          ) : (
            connections.map((conn) => (
              <div
                key={conn.id}
                className="flex items-center justify-between rounded-md border p-3"
              >
                <div>
                  <p className="font-medium">
                    {PLATFORM_LABELS[conn.platform]}
                    <Badge variant="outline" className="ml-2">
                      Connected
                    </Badge>
                  </p>
                  <p className="text-sm text-muted-foreground">{conn.displayName}</p>
                  {conn.platformPageId && (
                    <p className="text-xs text-muted-foreground">
                      Page ID: {conn.platformPageId}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Connected {new Date(conn.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => void handleDisconnect(conn.platform)}
                  className="inline-flex h-8 items-center rounded-md border border-destructive/30 px-3 text-sm text-destructive disabled:opacity-50"
                >
                  Disconnect
                </button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Connect new platform */}
      <Card>
        <CardHeader>
          <CardTitle>Connect a Platform</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="block space-y-2 text-sm">
            <FieldLabelWithHint
              htmlFor="connect-platform"
              label="Platform"
              hint={CONNECT_FIELD_HINTS.platform}
            />
            <select
              id="connect-platform"
              className="h-9 w-full rounded-md border bg-transparent px-3"
              value={connectPlatform}
              onChange={(e) => setConnectPlatform(e.target.value as Platform | "")}
            >
              <option value="">Select a platform...</option>
              {PLATFORMS.map((p) => (
                <option key={p} value={p} disabled={connectedPlatforms.has(p)}>
                  {PLATFORM_LABELS[p]}
                  {connectedPlatforms.has(p) ? " (already connected)" : ""}
                </option>
              ))}
            </select>
          </div>

          {connectPlatform && (
            <>
              <div className="rounded-md border bg-muted/30 p-3 text-sm">
                <p className="font-medium">{PLATFORM_GUIDES[connectPlatform].tokenLabel}</p>
                <p className="mt-1 text-muted-foreground">
                  {PLATFORM_GUIDES[connectPlatform].hint}
                </p>
              </div>

              <div className="block space-y-2 text-sm">
                <FieldLabelWithHint
                  htmlFor="connect-display-name"
                  label="Display Name"
                  hint={CONNECT_FIELD_HINTS.displayName}
                />
                <Input
                  id="connect-display-name"
                  placeholder="e.g. My Business Page"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              </div>

              <div className="block space-y-2 text-sm">
                <FieldLabelWithHint
                  htmlFor="connect-access-token"
                  label={PLATFORM_GUIDES[connectPlatform].tokenLabel}
                  hint={PLATFORM_GUIDES[connectPlatform].hint}
                />
                <Input
                  id="connect-access-token"
                  type="password"
                  placeholder="Paste your API token here"
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                />
              </div>

              {(connectPlatform === "instagram" || connectPlatform === "facebook") && (
                <div className="block space-y-2 text-sm">
                  <FieldLabelWithHint
                    htmlFor="connect-page-id"
                    label="Page ID"
                    hint={CONNECT_FIELD_HINTS.pageId}
                  />
                  <Input
                    id="connect-page-id"
                    placeholder="Facebook/Instagram Page ID"
                    value={pageId}
                    onChange={(e) => setPageId(e.target.value)}
                  />
                </div>
              )}

              <button
                type="button"
                disabled={actionLoading || !accessToken.trim() || !displayName.trim()}
                onClick={() => void handleConnect()}
                className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
              >
                {actionLoading ? "Connecting..." : "Connect Platform"}
              </button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
