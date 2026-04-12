"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  UserPlus,
  Shield,
  Pencil,
  Trash2,
  Users,
  Crown,
  Eye,
} from "lucide-react";

type TeamMember = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "creator" | "approver";
  avatarUrl: string | null;
  createdAt: string;
};

const ROLE_CONFIG = {
  admin: {
    label: "Admin",
    icon: Crown,
    color: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
    description: "Full access — manage workspace, team, platforms, content",
  },
  creator: {
    label: "Content Creator",
    icon: Pencil,
    color: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
    description: "Create and edit content, submit for approval",
  },
  approver: {
    label: "Approver",
    icon: Eye,
    color: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    description: "Review, approve, and schedule content",
  },
} as const;

export default function TeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"creator" | "approver">("creator");
  const [inviting, setInviting] = useState(false);
  const [changingRole, setChangingRole] = useState<string | null>(null);

  async function fetchMembers() {
    try {
      const res = await fetch("/api/team");
      const data = await res.json();
      if (res.ok) setMembers(data.members ?? []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchMembers();
  }, []);

  async function handleInvite() {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    try {
      const res = await fetch("/api/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to invite");
      }
      toast.success(`Invited ${inviteEmail.trim()} as ${ROLE_CONFIG[inviteRole].label}`);
      setInviteEmail("");
      await fetchMembers();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to invite");
    } finally {
      setInviting(false);
    }
  }

  async function handleRoleChange(memberId: string, newRole: string) {
    setChangingRole(memberId);
    try {
      const res = await fetch("/api/team", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: memberId, role: newRole }),
      });
      if (!res.ok) throw new Error("Failed to update role");
      toast.success("Role updated");
      await fetchMembers();
    } catch {
      toast.error("Failed to update role");
    } finally {
      setChangingRole(null);
    }
  }

  async function handleRemove(memberId: string, name: string) {
    if (!confirm(`Remove ${name} from the team?`)) return;
    try {
      const res = await fetch("/api/team", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: memberId }),
      });
      if (!res.ok) throw new Error("Failed to remove");
      toast.success(`${name} has been removed`);
      await fetchMembers();
    } catch {
      toast.error("Failed to remove member");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Team Members</h1>
        <p className="text-muted-foreground">
          Manage your team. Assign roles: Admin, Content Creator, Approver.
        </p>
      </div>

      {/* Role legend */}
      <div className="grid gap-3 sm:grid-cols-3">
        {(Object.keys(ROLE_CONFIG) as Array<keyof typeof ROLE_CONFIG>).map(
          (role) => {
            const cfg = ROLE_CONFIG[role];
            return (
              <div
                key={role}
                className="flex items-start gap-3 rounded-lg border p-3"
              >
                <div
                  className={`flex size-8 items-center justify-center rounded-lg ${cfg.color}`}
                >
                  <cfg.icon className="size-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{cfg.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {cfg.description}
                  </p>
                </div>
              </div>
            );
          },
        )}
      </div>

      {/* Invite form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="size-5" />
            Invite Team Member
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              type="email"
              placeholder="colleague@company.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="flex-1"
            />
            <select
              className="h-9 rounded-md border bg-transparent px-3 text-sm"
              value={inviteRole}
              onChange={(e) =>
                setInviteRole(e.target.value as "creator" | "approver")
              }
            >
              <option value="creator">Content Creator</option>
              <option value="approver">Approver</option>
            </select>
            <button
              type="button"
              disabled={inviting || !inviteEmail.trim()}
              onClick={handleInvite}
              className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              <UserPlus className="size-3.5" />
              {inviting ? "Inviting..." : "Invite"}
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Members list */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="size-5" />
            Current Members
            {!loading && (
              <Badge variant="outline" className="ml-2">
                {members.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading team...</p>
          ) : members.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Users className="size-10 text-muted-foreground/30" />
              <p className="mt-3 text-sm text-muted-foreground">
                No team members yet. Invite your first colleague above.
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {members.map((m) => {
                const cfg = ROLE_CONFIG[m.role];
                return (
                  <div
                    key={m.id}
                    className="flex items-center gap-4 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="flex size-10 items-center justify-center rounded-full bg-muted text-sm font-bold uppercase">
                      {m.avatarUrl ? (
                        <img
                          src={m.avatarUrl}
                          alt={m.name}
                          className="size-10 rounded-full object-cover"
                        />
                      ) : (
                        m.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .slice(0, 2)
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{m.name}</p>
                      <p className="text-xs text-muted-foreground">{m.email}</p>
                    </div>
                    <select
                      className="h-8 rounded-md border bg-transparent px-2 text-xs"
                      value={m.role}
                      disabled={changingRole === m.id}
                      onChange={(e) => handleRoleChange(m.id, e.target.value)}
                    >
                      <option value="admin">Admin</option>
                      <option value="creator">Creator</option>
                      <option value="approver">Approver</option>
                    </select>
                    <Badge className={cfg.color}>{cfg.label}</Badge>
                    <button
                      type="button"
                      onClick={() => handleRemove(m.id, m.name)}
                      className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      aria-label={`Remove ${m.name}`}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
