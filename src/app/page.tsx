import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background">

      {/* Nav */}
      <nav className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <span className="text-lg font-bold text-foreground">ClipMeta</span>
          <Link
            href="/auth"
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            Sign In
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 py-24 text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          For stock footage contributors
        </p>
        <h1 className="mt-4 text-5xl font-bold tracking-tight text-slate-900 md:text-6xl">
          Metadata that needs less fixing
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
          Upload your clips. Get AI-generated titles, descriptions, and keywords built
          for stock platforms. Review, edit, and export — all in one workflow.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/sign-up"
            className="rounded-lg bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Get Started Free
          </Link>
          <Link
            href="/auth"
            className="rounded-lg border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-muted"
          >
            Sign In
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-slate-100 bg-muted/50 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-8 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-card p-8 shadow-sm">
              <div className="text-3xl">📤</div>
              <h3 className="mt-4 text-lg font-semibold text-foreground">Upload & Organize</h3>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                Create projects, upload clips directly to storage, and organize your
                footage into batches. Large files supported.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-card p-8 shadow-sm">
              <div className="text-3xl">🤖</div>
              <h3 className="mt-4 text-lg font-semibold text-foreground">AI Metadata Generation</h3>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                ClipMeta extracts frames from your clips and generates stock-ready
                titles, descriptions, keywords, categories, and location — automatically.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-card p-8 shadow-sm">
              <div className="text-3xl">📋</div>
              <h3 className="mt-4 text-lg font-semibold text-foreground">Review, Edit & Export</h3>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                Review every result before it ships. Edit anything inline. Export a
                clean CSV file ready for stock platform submission.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-6 px-6 text-sm text-muted-foreground">
          <span>© 2026 ClipMeta</span>
          <Link href="/pricing" className="hover:text-foreground">Pricing</Link>
          <Link href="/legal/terms" className="hover:text-foreground">Terms</Link>
          <Link href="/legal/privacy" className="hover:text-foreground">Privacy</Link>
        </div>
      </footer>

    </main>
  );
}
