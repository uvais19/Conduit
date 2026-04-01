import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PLATFORM_LABELS } from "@/lib/constants";
import type { VariantComparison } from "@/lib/analytics/types";

export function VariantComparisonView({
  comparisons,
  loading,
}: {
  comparisons: VariantComparison[];
  loading: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>A/B Variant Comparison</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading comparison data...</p>
        ) : comparisons.length === 0 ? (
          <p className="text-sm text-muted-foreground">No variant comparison data yet. Publish and collect analytics for multiple variants to compare.</p>
        ) : (
          comparisons.map((group) => (
            <div key={group.variantGroup} className="rounded-md border p-3">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium">
                  {PLATFORM_LABELS[group.platform]} · {group.pillar}
                </p>
                <p className="text-xs text-muted-foreground">Group: {group.variantGroup.slice(0, 8)}</p>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b text-xs text-muted-foreground">
                      <th className="px-2 py-2 text-left font-medium">Variant</th>
                      <th className="px-2 py-2 text-left font-medium">Impressions</th>
                      <th className="px-2 py-2 text-left font-medium">Reach</th>
                      <th className="px-2 py-2 text-left font-medium">Engagement Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...group.variants]
                      .sort((a, b) => a.variantLabel.localeCompare(b.variantLabel))
                      .map((variant) => (
                        <tr key={variant.draftId} className="border-b last:border-0">
                          <td className="px-2 py-2 font-medium">{variant.variantLabel}</td>
                          <td className="px-2 py-2">{variant.impressions.toLocaleString()}</td>
                          <td className="px-2 py-2">{variant.reach.toLocaleString()}</td>
                          <td className="px-2 py-2">{(variant.engagementRate * 100).toFixed(2)}%</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
