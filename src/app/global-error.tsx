"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error("Global error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold">Something went wrong</h2>
            <p className="text-muted-foreground max-w-md">
              An unexpected error occurred. Please try again.
            </p>
          </div>
          <button
            onClick={() => unstable_retry()}
            className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
          >
            Try Again
          </button>
        </div>
      </body>
    </html>
  );
}
