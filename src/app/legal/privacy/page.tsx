import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "ClipMeta Privacy Policy — how we collect, use, and protect your data when you use our AI stock footage metadata platform.",
  alternates: { canonical: "https://clipmeta.app/legal/privacy" },
  robots: { index: true, follow: false },
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-background">
      <nav className="border-b border-border">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2 text-lg font-bold text-foreground">
            <img src="/logo-icon.svg" className="h-7 w-7" alt="ClipMeta" />
            ClipMeta
          </Link>
        </div>
      </nav>

      <article className="mx-auto max-w-4xl px-6 py-12">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Privacy Policy</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: March 2026</p>

        <div className="mt-8 space-y-8 text-sm leading-7 text-foreground">
          <section>
            <h2 className="text-lg font-semibold text-foreground">1. What We Collect</h2>
            <p className="mt-3">We collect information you provide directly:</p>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li>Email address and password (for your account)</li>
              <li>Video clips and files you upload</li>
              <li>Metadata you create or edit</li>
            </ul>
            <p className="mt-3">We also collect usage data automatically (page views, feature usage) to improve the service.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">2. How We Use Your Data</h2>
            <ul className="mt-3 list-disc pl-5 space-y-1">
              <li>To provide the ClipMeta service</li>
              <li>To generate AI metadata from your uploaded clips</li>
              <li>To communicate with you about your account</li>
              <li>To improve the service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">3. Your Uploaded Content</h2>
            <p className="mt-3">Your video clips are stored securely in Cloudflare R2 cloud storage. We do not share your clips with third parties except as required to provide the service (e.g., sending frames to OpenAI for metadata generation). OpenAI does not use your content to train models by default under their API terms. Source video files are automatically deleted from storage after metadata generation is complete.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">4. Data Sharing</h2>
            <p className="mt-3">We do not sell your personal data. We share data only with:</p>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li><strong>Supabase</strong> — database and authentication</li>
              <li><strong>Cloudflare R2</strong> — file storage</li>
              <li><strong>OpenAI</strong> — AI metadata generation from video frames</li>
              <li><strong>Vercel</strong> — application hosting</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">5. Data Retention</h2>
            <p className="mt-3">We retain your data for as long as your account is active. You can request deletion of your account and all associated data at any time by contacting us.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">6. Security</h2>
            <p className="mt-3">We use industry-standard security practices including encrypted storage, row-level security on our database, and secure authentication. No system is perfectly secure, and we cannot guarantee absolute security.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">7. Your Rights</h2>
            <p className="mt-3">You have the right to access, correct, or delete your personal data. Contact us at <a href="mailto:hello@clipmeta.app" className="text-slate-900 underline">hello@clipmeta.app</a> to exercise these rights.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">8. Contact</h2>
            <p className="mt-3">Questions about this policy? Email us at <a href="mailto:hello@clipmeta.app" className="text-slate-900 underline">hello@clipmeta.app</a>.</p>
          </section>
        </div>
      </article>

      <footer className="border-t border-slate-200 py-8">
        <div className="mx-auto flex max-w-4xl flex-wrap gap-6 px-6 text-sm text-muted-foreground">
          <Link href="/legal/terms" className="hover:text-foreground">Terms of Service</Link>
          <Link href="/pricing" className="hover:text-foreground">Pricing</Link>
        </div>
      </footer>
    </main>
  );
}
