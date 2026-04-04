import {
  BarChart3,
  Calendar,
  CheckCircle2,
  Mic2,
  Target,
  Wand2,
  type LucideIcon,
} from "lucide-react";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { LandingContent, LandingFeatureIconId } from "@/content/landing";

const FEATURE_ICONS: Record<LandingFeatureIconId, LucideIcon> = {
  strategy: Target,
  content: Wand2,
  calendar: Calendar,
  approval: CheckCircle2,
  analytics: BarChart3,
  brand: Mic2,
};

export function LandingFeatures({
  section,
}: {
  section: LandingContent["features"];
}) {
  return (
    <section id="features" className="scroll-mt-20 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mb-10 max-w-2xl">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {section.sectionTitle}
          </h2>
          <p className="mt-2 text-muted-foreground">{section.sectionSubtitle}</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {section.items.map((item) => {
            const Icon = FEATURE_ICONS[item.icon];
            return (
              <Card
                key={item.id}
                data-hoverable=""
                className="border-border/80 transition-shadow"
              >
                <CardHeader className="pb-2">
                  <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="size-5" />
                  </div>
                  <CardTitle>{item.title}</CardTitle>
                  <CardDescription>{item.description}</CardDescription>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}