"use client";

import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { StudioNav } from "@/components/studio/studio-nav";
import { StudioUserMenu } from "@/components/studio/studio-user-menu";
import { NotificationBell } from "@/components/notification-bell";
import { WorkspaceSwitcher } from "@/components/workspace-switcher";

export function StudioChrome({ children }: { children: React.ReactNode }) {
  return (
    <div className="studio-shell flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex min-h-14 max-w-[1680px] flex-wrap items-center gap-x-2 gap-y-2 px-3 py-2 sm:px-5">
          <Link
            href="/dashboard"
            className="shrink-0 font-[family-name:var(--font-heading)] text-xl font-semibold tracking-tight text-foreground"
          >
            Conduit<span className="text-gradient">.</span>
          </Link>
          <WorkspaceSwitcher />
          <StudioNav />
          <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
            <ThemeToggle />
            <NotificationBell />
            <StudioUserMenu />
          </div>
        </div>
      </header>
      <div className="studio-canvas relative flex-1">
        <div className="relative mx-auto max-w-[1680px] px-3 py-6 sm:px-5 sm:py-10">
          {children}
        </div>
      </div>
    </div>
  );
}
