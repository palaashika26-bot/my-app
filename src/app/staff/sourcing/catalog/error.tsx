'use client';

export default function StaffCatalogError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <p className="text-sm text-muted-foreground mb-2">Something went wrong loading the catalog.</p>
      <p className="text-xs text-muted-foreground/60 mb-4">Please try refreshing the page.</p>
      <button onClick={reset} className="btn-primary px-4 py-2 text-sm">
        Try again
      </button>
    </div>
  );
}
