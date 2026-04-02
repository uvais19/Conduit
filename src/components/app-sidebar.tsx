"use client";

import * as React from "react";
import {
  LayoutDashboard,
  Calendar,
  FileText,
  CheckCircle,
  BarChart3,
  Target,
  Palette,
  Settings,
  Sparkles,
} from "lucide-react";

import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const navData = {
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: <LayoutDashboard />,
    },
    {
      title: "Calendar",
      url: "/calendar",
      icon: <Calendar />,
    },
    {
      title: "Content",
      url: "/content/drafts",
      icon: <FileText />,
      items: [
        { title: "All Drafts", url: "/content/drafts" },
        { title: "Generate", url: "/content/generate" },
      ],
    },
    {
      title: "Approval",
      url: "/approval",
      icon: <CheckCircle />,
    },
    {
      title: "Analytics",
      url: "/analytics",
      icon: <BarChart3 />,
      items: [
        { title: "Overview", url: "/analytics" },
        { title: "Competitors", url: "/analytics/competitors" },
      ],
    },
    {
      title: "Strategy",
      url: "/strategy",
      icon: <Target />,
      items: [
        { title: "Content Strategy", url: "/strategy" },
        { title: "Optimization", url: "/strategy/optimize" },
      ],
    },
    {
      title: "Brand",
      url: "/brand",
      icon: <Palette />,
      items: [
        { title: "Brand Manifesto", url: "/brand" },
        { title: "Voice Settings", url: "/brand/voice" },
      ],
    },
    {
      title: "Settings",
      url: "/settings",
      icon: <Settings />,
      items: [
        { title: "General", url: "/settings" },
        { title: "Team", url: "/settings/team" },
        { title: "Platforms", url: "/settings/platforms" },
      ],
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<a href="/dashboard" />}>
              <div className="flex aspect-square size-8 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-sm">
                <Sparkles className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold tracking-tight">
                  Conduit
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  Social Media Manager
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navData.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
