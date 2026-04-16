import { TooltipProvider } from "@/components/ui/tooltip";
import { StudioChrome } from "@/components/studio/studio-chrome";
import { GuidedTour } from "@/components/guided-tour";
import { QuickCreate } from "@/components/quick-create";
import { KeyboardShortcuts } from "@/components/keyboard-shortcuts";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <TooltipProvider>
      <StudioChrome>{children}</StudioChrome>
      <GuidedTour />
      <QuickCreate />
      <KeyboardShortcuts />
    </TooltipProvider>
  );
}
