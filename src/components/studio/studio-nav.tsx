"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Calendar,
  CheckCircle,
  FileText,
  LayoutGrid,
  BarChart3,
  Target,
  Palette,
  Settings,
  ChevronDown,
  Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

type NavLeaf = { title: string; href: string };
type NavGroup = {
  title: string;
  icon: React.ReactNode;
  items: NavLeaf[];
};

const PRIMARY_LINKS: NavLeaf[] = [
  { title: "Overview", href: "/dashboard" },
  { title: "Calendar", href: "/calendar" },
  { title: "Approvals", href: "/approval" },
];

const GROUPS: NavGroup[] = [
  {
    title: "Content",
    icon: <FileText className="size-4" />,
    items: [
      { title: "Drafts", href: "/content/drafts" },
      { title: "Generate", href: "/content/generate" },
      { title: "Templates", href: "/content/templates" },
      { title: "Recycle", href: "/content/recycle" },
    ],
  },
  {
    title: "Insights",
    icon: <BarChart3 className="size-4" />,
    items: [
      { title: "Overview", href: "/analytics" },
      { title: "Post analysis", href: "/analysis" },
      { title: "Competitors", href: "/analytics/competitors" },
    ],
  },
  {
    title: "Strategy",
    icon: <Target className="size-4" />,
    items: [
      { title: "Plan", href: "/strategy" },
      { title: "Optimization", href: "/strategy/optimize" },
    ],
  },
  {
    title: "Brand",
    icon: <Palette className="size-4" />,
    items: [
      { title: "Manifesto", href: "/brand" },
      { title: "Voice", href: "/brand/voice" },
    ],
  },
  {
    title: "Workspace",
    icon: <Settings className="size-4" />,
    items: [
      { title: "General", href: "/settings" },
      { title: "Team", href: "/settings/team" },
      { title: "Platforms", href: "/settings/platforms" },
      { title: "Notifications", href: "/settings/notifications" },
      { title: "Activity Log", href: "/settings/activity" },
    ],
  },
];

function matches(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function groupActive(pathname: string, g: NavGroup) {
  return g.items.some((i) => matches(pathname, i.href));
}

function NavLink({
  href,
  children,
  active,
  tourId,
}: {
  href: string;
  children: React.ReactNode;
  active: boolean;
  tourId?: string;
}) {
  return (
    <Link
      href={href}
      data-tour-id={tourId}
      className={cn(
        "studio-nav-link relative px-1 py-2 text-sm font-medium transition-colors",
        active
          ? "text-primary after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:rounded-full after:bg-primary"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </Link>
  );
}

function NavDropdown({ group }: { group: NavGroup }) {
  const pathname = usePathname();
  const router = useRouter();
  const open = groupActive(pathname, group);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            data-tour-id={`nav-${group.title.toLowerCase()}`}
            className={cn(
              "relative inline-flex items-center gap-1 px-1 py-2 text-sm font-medium transition-colors after:absolute after:bottom-0 after:left-0 after:h-0.5 after:bg-primary after:transition-opacity",
              open
                ? "text-primary after:w-full after:opacity-100"
                : "text-muted-foreground after:w-full after:opacity-0 hover:text-foreground hover:after:opacity-40",
            )}
          />
        }
      >
        {group.icon}
        <span className="hidden sm:inline">{group.title}</span>
        <ChevronDown className="size-3.5 opacity-60" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[11rem]">
        {group.items.map((item) => (
          <DropdownMenuItem
            key={item.href}
            onClick={() => router.push(item.href)}
          >
            {item.title}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function MobileNav() {
  const pathname = usePathname();

  return (
    <Sheet>
      <SheetTrigger
        render={
          <Button variant="outline" size="icon" className="md:hidden" aria-label="Open menu" />
        }
      >
        <Menu className="size-5" />
      </SheetTrigger>
      <SheetContent side="left" className="w-[min(100%,18rem)] gap-0 p-0">
        <SheetHeader className="border-b px-4 py-4 text-left">
          <SheetTitle className="font-[family-name:var(--font-heading)] text-lg tracking-tight">
            Conduit
          </SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col gap-6 p-4">
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Navigate
            </p>
            <div className="flex flex-col gap-1">
              {PRIMARY_LINKS.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className={cn(
                    "rounded-lg px-3 py-2 text-sm font-medium",
                    matches(pathname, l.href)
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted/80",
                  )}
                >
                  {l.title}
                </Link>
              ))}
            </div>
          </div>
          {GROUPS.map((g) => (
            <div key={g.title}>
              <p className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                {g.title}
              </p>
              <div className="flex flex-col gap-1 border-l-2 border-border pl-3">
                {g.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "py-1.5 text-sm",
                      matches(pathname, item.href)
                        ? "font-medium text-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {item.title}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
}

export function StudioNav() {
  const pathname = usePathname();

  return (
    <>
      <MobileNav />
      <nav className="hidden min-w-0 flex-1 items-center gap-1 overflow-x-auto md:flex md:gap-0 lg:gap-1">
        <NavLink
          href="/dashboard"
          active={matches(pathname, "/dashboard")}
          tourId="nav-overview"
        >
          <span className="inline-flex items-center gap-1.5">
            <LayoutGrid className="size-4 opacity-70" />
            Overview
          </span>
        </NavLink>
        <NavLink href="/calendar" active={matches(pathname, "/calendar")} tourId="nav-calendar">
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="size-4 opacity-70" />
            Calendar
          </span>
        </NavLink>
        <NavLink href="/approval" active={matches(pathname, "/approval")} tourId="nav-approvals">
          <span className="inline-flex items-center gap-1.5">
            <CheckCircle className="size-4 opacity-70" />
            Approvals
          </span>
        </NavLink>
        <span className="mx-1 hidden h-5 w-px bg-border/60 lg:mx-2 lg:block" aria-hidden />
        {GROUPS.map((g) => (
          <NavDropdown key={g.title} group={g} />
        ))}
      </nav>
    </>
  );
}
