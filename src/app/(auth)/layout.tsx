"use client";

import { Sparkles } from "lucide-react";
import { motion } from "framer-motion";

const ease = [0.22, 1, 0.36, 1] as const;

const ORBS = [
  { size: 380, x: "10%", y: "15%", delay: 0, duration: 16, color: "oklch(0.65 0.2 25 / 35%)" },
  { size: 300, x: "60%", y: "55%", delay: 1.5, duration: 20, color: "oklch(0.7 0.16 50 / 30%)" },
  { size: 240, x: "45%", y: "5%", delay: 3, duration: 18, color: "oklch(0.63 0.14 340 / 25%)" },
];

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      {/* Left panel — animated warm panel with floating orbs */}
      <div className="auth-gradient-mesh relative hidden w-1/2 overflow-hidden lg:flex lg:flex-col lg:justify-between p-10">
        {/* Floating gradient orbs */}
        {ORBS.map((orb, i) => (
          <motion.div
            key={i}
            className="pointer-events-none absolute rounded-full blur-2xl"
            style={{
              width: orb.size,
              height: orb.size,
              left: orb.x,
              top: orb.y,
              background: `radial-gradient(circle, ${orb.color}, transparent 70%)`,
            }}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{
              opacity: [0, 0.9, 1, 0.7, 0.9],
              scale: [0.6, 1, 1.15, 0.9, 1],
              x: [0, 50, -40, 30, 0],
              y: [0, -40, 30, -20, 0],
            }}
            transition={{
              duration: orb.duration,
              delay: orb.delay,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            aria-hidden
          />
        ))}

        {/* Logo — fade in + slide down */}
        <motion.div
          className="relative z-10 flex items-center gap-3"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease }}
        >
          <motion.div
            className="flex size-11 items-center justify-center rounded-xl bg-primary/15 text-primary"
            initial={{ rotate: -8, scale: 0.85 }}
            animate={{ rotate: 0, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.15, ease }}
          >
            <Sparkles className="size-5" />
          </motion.div>
          <span className="font-[family-name:var(--font-heading)] text-xl font-semibold tracking-tight text-foreground">
            Conduit
          </span>
        </motion.div>

        {/* Blockquote — fade in + slide up */}
        <motion.div
          className="relative z-10 max-w-md"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3, ease }}
        >
          <blockquote className="space-y-4 border-l-4 border-primary/30 pl-6">
            <p className="text-xl leading-relaxed font-medium text-foreground/90">
              Your AI-powered social media manager that plans, creates, publishes, and optimizes — so you can focus on what matters.
            </p>
            <footer className="text-sm text-muted-foreground">
              Strategy to publishing, on autopilot.
            </footer>
          </blockquote>
        </motion.div>
      </div>

      {/* Right panel — form area */}
      <div className="flex w-full flex-1 flex-col items-center justify-center px-6 lg:w-1/2">
        {/* Mobile brand mark */}
        <div className="mb-8 flex items-center gap-3 lg:hidden">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Sparkles className="size-5" />
          </div>
          <span className="font-[family-name:var(--font-heading)] text-lg font-semibold tracking-tight">
            Conduit
          </span>
        </div>

        {children}
      </div>
    </div>
  );
}
