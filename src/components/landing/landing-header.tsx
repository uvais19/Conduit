"use client";

import Link from "next/link";
import { useCallback, useState, type ReactNode } from "react";
import { Menu } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { scrollToLandingSection } from "@/lib/landing-scroll";
import type { LandingContent } from "@/content/landing";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const SECTION_LINK_CLASS =
  "text-sm font-medium text-muted-foreground transition-colors hover:text-primary";

function SectionNavLink({
  id,
  children,
  onBeforeScroll,
  className,
}: {
  id: string;
  children: ReactNode;
  onBeforeScroll?: () => void;
  className?: string;
}) {
  const href = `#${id}`;
  return (
    <a
      href={href}
      className={cn(SECTION_LINK_CLASS, className)}
      onClick={(e) => {
        e.preventDefault();
        onBeforeScroll?.();
        const delay = onBeforeScroll ? 220 : 0;
        window.setTimeout(() => scrollToLandingSection(id), delay);
      }}
    >
      {children}
    </a>
  );
}

export function LandingHeader({ content }: { content: LandingContent }) {
  const { nav } = content;
  const [mobileOpen, setMobileOpen] = useState(false);

  const closeMobileThenScroll = useCallback(() => {
    setMobileOpen(false);
  }, []);

  const links = (
    <>
      <SectionNavLink id="features">{nav.features}</SectionNavLink>
      <SectionNavLink id="workflow">{nav.workflow}</SectionNavLink>
      <SectionNavLink id="today">{nav.whatYouGet}</SectionNavLink>
      <SectionNavLink id="pricing">Pricing</SectionNavLink>
      <SectionNavLink id="faq">{nav.faq}</SectionNavLink>
    </>
  );

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-[3.25rem] max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Link
          href="/"
          className="font-[family-name:var(--font-heading)] text-lg font-semibold tracking-tight text-foreground"
        >
          Conduit<span className="text-gradient">.</span>
        </Link>

        <nav className="ml-4 hidden items-center gap-5 lg:ml-6 lg:flex xl:gap-6">{links}</nav>

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <ThemeToggle />

          <Link
            href="/login"
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "hidden sm:inline-flex",
            )}
          >
            {nav.logIn}
          </Link>
          <Link
            href="/register"
            className={cn(buttonVariants({ size: "sm" }), "hidden sm:inline-flex")}
          >
            {nav.getStarted}
          </Link>

          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden"
                  aria-label={nav.menuOpen}
                />
              }
            >
              <Menu className="size-5" />
            </SheetTrigger>
            <SheetContent side="right" className="w-[min(100%,20rem)]">
              <SheetHeader>
                <SheetTitle className="text-left">Conduit</SheetTitle>
              </SheetHeader>
              <div className="mt-6 flex flex-col gap-4 px-4">
                <div className="flex flex-col gap-3 border-b border-border pb-4">
                  <SectionNavLink
                    id="features"
                    onBeforeScroll={closeMobileThenScroll}
                    className="text-foreground"
                  >
                    {nav.features}
                  </SectionNavLink>
                  <SectionNavLink
                    id="workflow"
                    onBeforeScroll={closeMobileThenScroll}
                    className="text-foreground"
                  >
                    {nav.workflow}
                  </SectionNavLink>
                  <SectionNavLink
                    id="today"
                    onBeforeScroll={closeMobileThenScroll}
                    className="text-foreground"
                  >
                    {nav.whatYouGet}
                  </SectionNavLink>
                  <SectionNavLink
                    id="pricing"
                    onBeforeScroll={closeMobileThenScroll}
                    className="text-foreground"
                  >
                    Pricing
                  </SectionNavLink>
                  <SectionNavLink
                    id="faq"
                    onBeforeScroll={closeMobileThenScroll}
                    className="text-foreground"
                  >
                    {nav.faq}
                  </SectionNavLink>
                </div>
                <Link
                  href="/login"
                  className={cn(buttonVariants({ variant: "outline", size: "default" }), "w-full")}
                >
                  {nav.logIn}
                </Link>
                <Link href="/register" className={cn(buttonVariants({ size: "default" }), "w-full")}>
                  {nav.getStarted}
                </Link>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
