export default function ApprovalPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Approval Queue</h1>
        <p className="text-muted-foreground">
          Review, approve, or request revisions on content drafts.
          Multi-stage workflow: Draft → Review → Revise → Approve → Scheduled.
        </p>
      </div>
      <div className="flex h-[400px] items-center justify-center rounded-lg border border-dashed">
        <p className="text-muted-foreground">
          Approval workflow will be implemented in Phase 6
        </p>
      </div>
    </div>
  );
}
