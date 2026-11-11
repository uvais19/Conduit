import type { PlatformConnection } from "@/lib/platforms/store";

export type PublishBranch =
  | { kind: "live"; connection: PlatformConnection }
  | { kind: "blocked"; reason: "not_connected" };

export function decidePublishBranch(connection: PlatformConnection | null): PublishBranch {
  if (!connection) return { kind: "blocked", reason: "not_connected" };
  return { kind: "live", connection };
}
