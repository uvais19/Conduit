"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Bell, MessageSquare, CheckCircle, Calendar, BarChart3, Shield } from "lucide-react";

type NotifCategory = {
  id: string;
  label: string;
  description: string;
  icon: typeof Bell;
  enabled: boolean;
};

const DEFAULT_CATEGORIES: NotifCategory[] = [
  { id: "draft_ready", label: "Draft Ready for Review", description: "When a new draft is submitted for approval", icon: MessageSquare, enabled: true },
  { id: "draft_approved", label: "Draft Approved", description: "When your draft gets approved", icon: CheckCircle, enabled: true },
  { id: "draft_revision", label: "Revision Requested", description: "When changes are requested on your draft", icon: MessageSquare, enabled: true },
  { id: "draft_published", label: "Post Published", description: "When a scheduled post goes live", icon: Calendar, enabled: true },
  { id: "draft_failed", label: "Publishing Failed", description: "When a post fails to publish", icon: Shield, enabled: true },
  { id: "analytics_report", label: "Analytics Reports", description: "Weekly performance summary", icon: BarChart3, enabled: true },
  { id: "mention", label: "Mentions", description: "When someone @mentions you in a comment", icon: MessageSquare, enabled: true },
  { id: "team_invite", label: "Team Updates", description: "When someone joins or leaves the team", icon: Bell, enabled: false },
];

export default function NotificationPreferencesPage() {
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [pushEnabled, setPushEnabled] = useState(true);

  function toggleCategory(id: string) {
    setCategories((prev) =>
      prev.map((c) => (c.id === id ? { ...c, enabled: !c.enabled } : c)),
    );
    toast.success("Preference updated");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Notification Preferences</h1>
        <p className="text-muted-foreground">
          Control which notifications you receive and how they are delivered.
        </p>
      </div>

      {/* Delivery channels */}
      <Card>
        <CardHeader>
          <CardTitle>Delivery Channels</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">In-app notifications</p>
              <p className="text-xs text-muted-foreground">Bell icon in the top bar</p>
            </div>
            <div className="relative inline-flex h-6 w-11 cursor-pointer items-center rounded-full bg-primary transition-colors">
              <span className="pointer-events-none inline-block size-5 translate-x-5 rounded-full bg-white shadow-sm transition-transform" />
            </div>
          </label>
          <label className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Email notifications</p>
              <p className="text-xs text-muted-foreground">Sent to your account email</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setEmailEnabled((v) => !v);
                toast.success("Email notifications " + (!emailEnabled ? "enabled" : "disabled"));
              }}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                emailEnabled ? "bg-primary" : "bg-muted"
              }`}
            >
              <span
                className={`pointer-events-none inline-block size-5 rounded-full bg-white shadow-sm transition-transform ${
                  emailEnabled ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </button>
          </label>
          <label className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Push notifications</p>
              <p className="text-xs text-muted-foreground">Browser push when tab is not focused</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setPushEnabled((v) => !v);
                toast.success("Push notifications " + (!pushEnabled ? "enabled" : "disabled"));
              }}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                pushEnabled ? "bg-primary" : "bg-muted"
              }`}
            >
              <span
                className={`pointer-events-none inline-block size-5 rounded-full bg-white shadow-sm transition-transform ${
                  pushEnabled ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </button>
          </label>
        </CardContent>
      </Card>

      {/* Per-category toggles */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Categories</CardTitle>
        </CardHeader>
        <CardContent className="divide-y">
          {categories.map((cat) => (
            <div key={cat.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
              <div className="flex items-center gap-3">
                <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <cat.icon className="size-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">{cat.label}</p>
                  <p className="text-xs text-muted-foreground">{cat.description}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => toggleCategory(cat.id)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  cat.enabled ? "bg-primary" : "bg-muted"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block size-5 rounded-full bg-white shadow-sm transition-transform ${
                    cat.enabled ? "translate-x-5" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
