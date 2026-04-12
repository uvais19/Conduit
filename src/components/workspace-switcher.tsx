"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronDown, Plus, Check, Building2 } from "lucide-react";

interface Workspace {
  id: string;
  name: string;
  role: string;
}

export function WorkspaceSwitcher() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [active, setActive] = useState<Workspace | null>(null);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        const name = data.settings?.workspaceName || "My Workspace";
        const ws: Workspace = { id: "current", name, role: "owner" };
        setWorkspaces([ws]);
        setActive(ws);
      })
      .catch(() => {
        const ws: Workspace = { id: "current", name: "My Workspace", role: "owner" };
        setWorkspaces([ws]);
        setActive(ws);
      });
  }, []);

  const handleCreate = useCallback(() => {
    if (!newName.trim()) return;
    const ws: Workspace = {
      id: `ws-${Date.now()}`,
      name: newName.trim(),
      role: "owner",
    };
    setWorkspaces((prev) => [...prev, ws]);
    setActive(ws);
    setNewName("");
    setCreating(false);
    setOpen(false);
  }, [newName]);

  if (!active) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm font-medium hover:bg-accent transition-colors"
      >
        <Building2 className="size-3.5 text-muted-foreground" />
        <span className="max-w-[120px] truncate">{active.name}</span>
        <ChevronDown className="size-3 text-muted-foreground" />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-[80]"
            onClick={() => {
              setOpen(false);
              setCreating(false);
            }}
            aria-hidden
          />
          <div className="absolute left-0 top-full z-[81] mt-1 w-56 rounded-lg border bg-card p-1 shadow-lg">
            <p className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Workspaces
            </p>
            {workspaces.map((ws) => (
              <button
                key={ws.id}
                onClick={() => {
                  setActive(ws);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted transition-colors"
              >
                <Building2 className="size-3.5 text-muted-foreground" />
                <span className="flex-1 truncate">{ws.name}</span>
                {ws.id === active.id && (
                  <Check className="size-3.5 text-primary" />
                )}
                <span className="text-[10px] text-muted-foreground capitalize">
                  {ws.role}
                </span>
              </button>
            ))}

            <div className="mt-1 border-t border-border/60 pt-1">
              {creating ? (
                <div className="flex gap-1 px-2 py-1">
                  <input
                    type="text"
                    className="h-7 flex-1 rounded border bg-transparent px-2 text-xs"
                    placeholder="Workspace name"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                    autoFocus
                  />
                  <button
                    onClick={handleCreate}
                    className="h-7 rounded bg-primary px-2 text-xs font-medium text-primary-foreground"
                  >
                    Add
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setCreating(true)}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  <Plus className="size-3.5" />
                  New workspace
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
