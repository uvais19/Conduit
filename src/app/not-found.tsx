import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold">404</h1>
        <h2 className="text-xl font-semibold">Page Not Found</h2>
        <p className="text-muted-foreground max-w-md">
          The page you&rsquo;re looking for doesn&rsquo;t exist or has been moved.
        </p>
      </div>
      <Link
        href="/dashboard"
        className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
      >
        Go to Dashboard
      </Link>
    </div>
  );
}
