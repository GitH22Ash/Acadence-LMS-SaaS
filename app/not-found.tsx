import Link from "next/link";
import { Home, Search } from "lucide-react";

export default function NotFound() {
  return (
    <main className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-4">
      <div className="flex size-20 items-center justify-center rounded-3xl bg-muted/60">
        <Search className="size-9 text-muted-foreground" strokeWidth={1.2} />
      </div>
      <h1 className="text-3xl sm:text-4xl">Page Not Found</h1>
      <p className="text-muted-foreground max-w-sm">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link
        href="/"
        className="btn-primary mt-2"
      >
        <Home className="size-4" strokeWidth={2} />
        Back to Home
      </Link>
    </main>
  );
}
