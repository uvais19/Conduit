import { Sparkles } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      {/* Left panel — animated gradient mesh with branding */}
      <div className="auth-gradient-mesh noise-overlay relative hidden w-1/2 overflow-hidden lg:flex lg:flex-col lg:justify-between p-10">
        {/* Floating orbs */}
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />

        {/* Brand mark */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm">
            <Sparkles className="size-5 text-white" />
          </div>
          <span className="text-lg font-semibold tracking-tight text-white">
            Conduit
          </span>
        </div>

        {/* Tagline */}
        <div className="relative z-10 max-w-md">
          <blockquote className="space-y-3">
            <p className="text-xl leading-relaxed font-medium text-white/90">
              Your AI-powered social media manager that plans, creates, publishes, and optimizes — so you can focus on what matters.
            </p>
            <footer className="text-sm text-white/60">
              Strategy to publishing, on autopilot.
            </footer>
          </blockquote>
        </div>
      </div>

      {/* Right panel — form area */}
      <div className="flex w-full flex-1 flex-col items-center justify-center px-6 lg:w-1/2">
        {/* Mobile brand mark */}
        <div className="mb-8 flex items-center gap-3 lg:hidden">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Sparkles className="size-5" />
          </div>
          <span className="text-lg font-semibold tracking-tight">Conduit</span>
        </div>

        {children}
      </div>
    </div>
  );
}
