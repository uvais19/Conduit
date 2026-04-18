"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { TourResetButton } from "@/components/guided-tour";
import {
  Globe,
  Clock,
  Building2,
  Save,
  Shield,
} from "lucide-react";

type WorkspaceSettings = {
  workspaceName: string;
  timezone: string;
  defaultPlatform: string;
  weekStart: string;
};

const TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Asia/Kolkata",
  "Asia/Dubai",
  "Australia/Sydney",
  "Pacific/Auckland",
];

const WEEK_STARTS = ["Monday", "Sunday"];

export default function SettingsPage() {
  const [settings, setSettings] = useState<WorkspaceSettings>({
    workspaceName: "",
    timezone: "UTC",
    defaultPlatform: "instagram",
    weekStart: "Monday",
  });
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data.settings) setSettings(data.settings);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (!res.ok) throw new Error("Failed to save");
      toast.success("Settings saved successfully");
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  if (!loaded) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">Manage your workspace, account, and preferences.</p>
        </div>
        <div className="flex h-[200px] items-center justify-center">
          <span className="text-sm text-muted-foreground">Loading settings...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your workspace, account, and preferences.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Workspace */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="size-5" />
              Workspace
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="ws-name">
                Workspace Name
              </label>
              <Input
                id="ws-name"
                value={settings.workspaceName}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, workspaceName: e.target.value }))
                }
                placeholder="My Workspace"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="ws-tz">
                Timezone
              </label>
              <select
                id="ws-tz"
                className="h-9 w-full rounded-md border bg-transparent px-3 text-sm"
                value={settings.timezone}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, timezone: e.target.value }))
                }
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Content Defaults */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="size-5" />
              Content Defaults
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="default-plat">
                Default Platform
              </label>
              <select
                id="default-plat"
                className="h-9 w-full rounded-md border bg-transparent px-3 text-sm"
                value={settings.defaultPlatform}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    defaultPlatform: e.target.value,
                  }))
                }
              >
                <option value="instagram">Instagram</option>
                <option value="facebook">Facebook</option>
                <option value="linkedin">LinkedIn</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="week-start">
                Week Starts On
              </label>
              <select
                id="week-start"
                className="h-9 w-full rounded-md border bg-transparent px-3 text-sm"
                value={settings.weekStart}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, weekStart: e.target.value }))
                }
              >
                {WEEK_STARTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Schedule Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="size-5" />
              Schedule Preferences
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Posting times and scheduling preferences are managed per-platform
              in your{" "}
              <a href="/strategy" className="text-primary hover:underline">
                Content Strategy
              </a>
              . Global scheduling overrides will be available in a future update.
            </p>
          </CardContent>
        </Card>

        {/* Security */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="size-5" />
              Security
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Two-Factor Authentication</p>
                  <p className="text-xs text-muted-foreground">
                    Managed through your Clerk account settings
                  </p>
                </div>
                <Badge variant="outline">Via Clerk</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">API Token Encryption</p>
                  <p className="text-xs text-muted-foreground">
                    Platform tokens are encrypted with AES-256-GCM
                  </p>
                </div>
                <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                  Active
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-between">
        <TourResetButton />
        <button
          type="button"
          disabled={saving}
          onClick={handleSave}
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-50"
        >
          <Save className="size-4" />
          {saving ? "Saving..." : "Save Settings"}
        </button>
      </div>
    </div>
  );
}
