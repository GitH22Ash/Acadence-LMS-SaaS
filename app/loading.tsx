export default function Loading() {
  return (
    <main className="flex flex-col gap-10 animate-pulse">
      {/* Hero skeleton */}
      <section className="flex flex-col items-center gap-4 py-8">
        <div className="h-7 w-40 rounded-full bg-muted" />
        <div className="h-12 w-96 max-w-full rounded-xl bg-muted" />
        <div className="h-5 w-80 max-w-full rounded-lg bg-muted" />
        <div className="flex gap-3 mt-2">
          <div className="h-10 w-40 rounded-xl bg-muted" />
          <div className="h-10 w-32 rounded-xl bg-muted" />
        </div>
      </section>

      {/* Cards skeleton */}
      <section className="flex flex-col gap-5">
        <div className="h-8 w-52 rounded-lg bg-muted" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-border p-5 flex flex-col gap-4">
              <div className="flex justify-between">
                <div className="h-6 w-20 rounded-full bg-muted" />
                <div className="size-8 rounded-full bg-muted" />
              </div>
              <div className="h-6 w-40 rounded-lg bg-muted" />
              <div className="h-4 w-full rounded-lg bg-muted" />
              <div className="flex justify-between items-center pt-2 border-t border-border/50">
                <div className="h-4 w-16 rounded-lg bg-muted" />
                <div className="h-9 w-24 rounded-xl bg-muted" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
