"use client";

import Link from "next/link";
import { Menu, Sparkles } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { LandingContent } from "@/content/landing";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export function LandingHeader({ content }: { content: LandingContent }) {
  const { nav } = content;

  const links = (
    <>
      <a
        href="#features"
        className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        {nav.features}
      </a>
      <a
        href="#workflow"
        className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        {nav.workflow}
      </a>
    </>
  );

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Sparkles className="size-4" />
          </span>
          Conduit
        </Link>

        <nav className="ml-6 hidden items-center gap-6 md:flex">{links}</nav>

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

          <Sheet>
            <SheetTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden"
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
                  <a href="#features" className="text-sm font-medium">
                    {nav.features}
                  </a>
                  <a href="#workflow" className="text-sm font-medium">
                    {nav.workflow}
                  </a>
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
