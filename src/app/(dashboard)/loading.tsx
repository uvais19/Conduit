import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border p-6 space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3 w-32" />
          </div>
        ))}
      </div>

      {/* Content area */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border p-6 space-y-4">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-[200px] w-full" />
        </div>
        <div className="rounded-lg border p-6 space-y-4">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-[200px] w-full" />
        </div>
      </div>
    </div>
  );
}
