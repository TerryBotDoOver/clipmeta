import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "ClipMeta Terms of Service for using the AI metadata generation platform for stock footage.",
  alternates: { canonical: "https://clipmeta.app/legal/terms" },
  robots: { index: true, follow: false },
};

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}

export default function TermsPage() {
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
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Terms of Service</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: May 10, 2026</p>

        <div className="mt-8 space-y-8 text-sm leading-7 text-foreground">
          <Section title="1. Acceptance of Terms">
            <p>
              These Terms of Service govern your access to and use of ClipMeta, including our website,
              application, AI metadata tools, upload workflows, exports, billing features, support, and related
              services. By creating an account, clicking a button that indicates acceptance, purchasing a plan,
              uploading content, or using ClipMeta, you agree to these Terms and our{" "}
              <Link href="/legal/privacy" className="underline">Privacy Policy</Link>.
            </p>
            <p>
              If you use ClipMeta for a company or other organization, you represent that you have authority to
              bind that organization to these Terms. If you do not agree to these Terms, do not use ClipMeta.
            </p>
          </Section>

          <Section title="2. Eligibility and Accounts">
            <p>
              You must be at least 18 years old, or the age of legal majority where you live, to use ClipMeta.
              You agree to provide accurate account and billing information and to keep it current.
            </p>
            <p>
              You are responsible for maintaining the confidentiality of your login credentials and for all
              activity under your account. You must notify us promptly if you believe your account has been
              compromised. We are not responsible for losses caused by your failure to secure your account.
            </p>
          </Section>

          <Section title="3. The ClipMeta Service">
            <p>
              ClipMeta is a workflow tool for stock footage contributors. It lets users upload video clips,
              extract frames, generate AI-assisted titles, descriptions, keywords, and other metadata, review and
              edit results, and export files for use with stock footage marketplaces and other platforms.
            </p>
            <p>
              We may add, change, suspend, or discontinue features at any time. We may also impose or change
              technical limits, file-size limits, rate limits, usage limits, or plan limits to protect the service,
              control costs, or comply with law.
            </p>
          </Section>

          <Section title="4. Paid Plans, Trials, Renewals, and Credits">
            <p>
              Paid subscriptions, trials, renewals, taxes, and payment methods are handled by Stripe or another
              payment processor we use. By purchasing a subscription, you authorize recurring charges until you
              cancel. You are responsible for all applicable taxes and fees.
            </p>
            <p>
              Unless a checkout page or separate written agreement says otherwise, subscriptions renew
              automatically at the end of each billing period. You may cancel from your account settings or by
              contacting support. Canceling stops future renewals, but your plan may remain active until the end
              of the current paid period.
            </p>
            <p>
              Free trials, promotional discounts, bonus clips, rollover clips, and credits are offered at our
              discretion and may be limited, changed, revoked, or discontinued. They have no cash value, are not
              transferable, and may not be redeemed for money.
            </p>
            <p>
              Payments are non-refundable except where required by law or where we expressly agree otherwise. If
              payment fails, we may suspend, downgrade, or limit your account until payment is resolved.
            </p>
          </Section>

          <Section title="5. Your Content and Permissions">
            <p>
              You retain ownership of the video clips, files, filenames, prompts, metadata, edits, exports, and
              other content you upload to or create with ClipMeta, subject to any rights held by others.
            </p>
            <p>
              You grant ClipMeta a worldwide, non-exclusive, royalty-free license to host, store, copy, process,
              transmit, display, analyze, create frame captures from, generate metadata from, and otherwise use
              your content as needed to provide, secure, troubleshoot, improve, and support the service. This
              license extends to our service providers only as necessary to provide ClipMeta.
            </p>
            <p>
              You represent and warrant that you have all rights, licenses, releases, and permissions necessary
              to upload your content and to allow ClipMeta to process it. You are solely responsible for your
              content and for any metadata, exports, or submissions you make using ClipMeta.
            </p>
          </Section>

          <Section title="6. AI-Generated Metadata">
            <p>
              ClipMeta uses AI systems and automated processing. AI-generated metadata may be inaccurate,
              incomplete, duplicative, offensive, unsuitable, or unrelated to the uploaded clip. AI output may
              not be unique, and other users may receive similar or overlapping metadata.
            </p>
            <p>
              You are responsible for reviewing, editing, verifying, and approving all generated metadata before
              using it, publishing it, or submitting it to any stock footage marketplace. ClipMeta does not
              guarantee that any metadata will be accepted by a marketplace, improve sales, increase revenue,
              avoid rejection, avoid copyright or trademark issues, or comply with any third-party submission
              guidelines.
            </p>
          </Section>

          <Section title="7. Uploaded Files, Storage, and Deletion">
            <p>
              ClipMeta is not a backup or archival service. You should keep your own copies of all source files,
              metadata, exports, and other materials. We are not responsible for lost, corrupted, deleted, or
              unavailable content except to the limited extent required by law.
            </p>
            <p>
              We may delete uploaded source files after processing, after a retention period, when an account is
              deleted, when storage limits are exceeded, or when we determine that content violates these Terms.
              Deletion may not be immediate, and residual copies may remain in backups, logs, caches, abuse
              monitoring systems, or third-party systems for a limited time.
            </p>
            <p>
              Do not upload sensitive personal information, confidential third-party materials, illegal content,
              or content you do not have the right to process through ClipMeta.
            </p>
          </Section>

          <Section title="8. Acceptable Use">
            <p>You agree not to use ClipMeta to:</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>violate any law, regulation, contract, privacy right, publicity right, or intellectual property right;</li>
              <li>upload content you do not own or have permission to use;</li>
              <li>upload malware, harmful code, exploit files, or content designed to disrupt systems;</li>
              <li>upload or process sexual exploitation content, abuse content, non-consensual intimate content, or content involving minors in a sexual context;</li>
              <li>harass, threaten, defame, impersonate, deceive, or discriminate against others;</li>
              <li>circumvent plan limits, rate limits, access controls, security measures, or payment systems;</li>
              <li>scrape, reverse engineer, resell, sublicense, or build a competing service using ClipMeta except where prohibited by law;</li>
              <li>interfere with the availability, integrity, or security of ClipMeta or our providers; or</li>
              <li>use ClipMeta in violation of export controls, sanctions, or other trade restrictions.</li>
            </ul>
          </Section>

          <Section title="9. Third-Party Services and Marketplaces">
            <p>
              ClipMeta depends on third-party services, which may include OpenAI, Supabase, Cloudflare, Vercel,
              Stripe, Resend, analytics providers, storage providers, email providers, and other infrastructure
              or AI services. Your use of ClipMeta may also involve third-party stock footage marketplaces,
              including services that receive your exported files or metadata.
            </p>
            <p>
              We do not control and are not responsible for third-party services, marketplace rules, upload
              systems, review decisions, delays, outages, rejected submissions, lost revenue, account actions,
              or changes to third-party terms or APIs. Third-party services may have their own terms and privacy
              practices.
            </p>
          </Section>

          <Section title="10. ClipMeta Intellectual Property and Feedback">
            <p>
              ClipMeta, including our software, user interface, design, workflows, documentation, branding, and
              other materials, is owned by us or our licensors and is protected by intellectual property laws.
              These Terms do not transfer any ClipMeta intellectual property rights to you.
            </p>
            <p>
              If you send us ideas, suggestions, feedback, or feature requests, you grant us the right to use
              them without restriction, attribution, or compensation.
            </p>
          </Section>

          <Section title="11. Privacy">
            <p>
              Our Privacy Policy explains how we collect, use, share, and retain personal information. By using
              ClipMeta, you acknowledge our{" "}
              <Link href="/legal/privacy" className="underline">Privacy Policy</Link>. If the Privacy Policy
              conflicts with these Terms, these Terms govern your use of the service and the Privacy Policy
              governs our handling of personal information.
            </p>
          </Section>

          <Section title="12. Copyright Complaints and Repeat Infringers">
            <p>
              If you believe content processed or made available through ClipMeta infringes your copyright, send
              a notice to <a href="mailto:hello@clipmeta.app" className="underline">hello@clipmeta.app</a> with
              enough information for us to identify the copyrighted work, the allegedly infringing material, your
              contact information, a good-faith statement, and a statement under penalty of perjury that you are
              the copyright owner or authorized to act for the owner.
            </p>
            <p>
              We may remove or restrict content alleged to be infringing and may suspend or terminate accounts of
              repeat infringers. We may also require additional information before taking action.
            </p>
          </Section>

          <Section title="13. Suspension and Termination">
            <p>
              You may stop using ClipMeta at any time. We may suspend, limit, or terminate your access if we
              believe you violated these Terms, created risk for ClipMeta or others, failed to pay, abused the
              service, violated third-party rights, or if we are required to do so by law.
            </p>
            <p>
              Upon termination, your right to use ClipMeta ends immediately. Sections that by their nature should
              survive termination will survive, including ownership, payment obligations, disclaimers, limitations
              of liability, indemnity, dispute terms, and general provisions.
            </p>
          </Section>

          <Section title="14. Disclaimer of Warranties">
            <p>
              ClipMeta is provided &quot;as is&quot; and &quot;as available.&quot; To the maximum extent permitted by law, we
              disclaim all warranties, whether express, implied, statutory, or otherwise, including warranties of
              merchantability, fitness for a particular purpose, title, non-infringement, quiet enjoyment,
              accuracy, availability, and uninterrupted operation.
            </p>
            <p>
              We do not warrant that ClipMeta will be error-free, secure, uninterrupted, accurate, compatible
              with every file, accepted by any marketplace, or that any content will be preserved, recovered, or
              free from loss or alteration.
            </p>
          </Section>

          <Section title="15. Limitation of Liability">
            <p>
              To the maximum extent permitted by law, ClipMeta and its owners, employees, contractors, service
              providers, affiliates, and licensors will not be liable for any indirect, incidental, special,
              consequential, exemplary, punitive, or enhanced damages, or for lost profits, lost revenue, lost
              business, lost data, lost content, marketplace rejection, account suspension, business
              interruption, or cost of substitute services, even if we were advised that such damages were
              possible.
            </p>
            <p>
              To the maximum extent permitted by law, our total aggregate liability for all claims relating to
              ClipMeta or these Terms will not exceed the greater of (a) the amount you paid to ClipMeta for the
              service giving rise to the claim during the 12 months before the event giving rise to liability, or
              (b) one hundred U.S. dollars ($100).
            </p>
            <p>
              Some jurisdictions do not allow certain warranty disclaimers or liability limitations. In those
              jurisdictions, the limitations in these Terms apply only to the maximum extent permitted by law.
            </p>
          </Section>

          <Section title="16. Indemnification">
            <p>
              To the maximum extent permitted by law, you agree to defend, indemnify, and hold harmless ClipMeta
              and its owners, employees, contractors, service providers, affiliates, and licensors from and
              against any claims, damages, losses, liabilities, costs, and expenses, including reasonable
              attorneys&apos; fees, arising out of or related to your content, your use of ClipMeta, your exports or
              marketplace submissions, your violation of these Terms, your violation of law, or your violation of
              another person&apos;s rights.
            </p>
          </Section>

          <Section title="17. Disputes, Arbitration, and Governing Law">
            <p>
              Before filing a legal claim, you agree to contact us at{" "}
              <a href="mailto:hello@clipmeta.app" className="underline">hello@clipmeta.app</a> and try to resolve
              the dispute informally. We will do the same when practical. If the dispute is not resolved within
              30 days, either party may proceed as described below.
            </p>
            <p>
              Except for disputes that qualify for small claims court or requests for injunctive relief related
              to intellectual property, security, or unauthorized access, disputes arising out of or relating to
              ClipMeta or these Terms will be resolved by binding individual arbitration under the Federal
              Arbitration Act. You and ClipMeta waive the right to a jury trial and agree that disputes must be
              brought only on an individual basis, not as a class, consolidated, representative, or private
              attorney general action.
            </p>
            <p>
              You may opt out of arbitration within 30 days after first accepting these Terms by emailing{" "}
              <a href="mailto:hello@clipmeta.app" className="underline">hello@clipmeta.app</a> with the subject
              line &quot;Arbitration Opt-Out&quot; and the email address associated with your account.
            </p>
            <p>
              These Terms are governed by the laws of the State of Florida, excluding conflict-of-law rules.
              Subject to the arbitration requirement above, state and federal courts located in Florida will have
              exclusive jurisdiction over disputes relating to ClipMeta or these Terms.
            </p>
          </Section>

          <Section title="18. Changes to These Terms">
            <p>
              We may update these Terms from time to time. If we make material changes, we may notify you by
              email, in-product notice, or posting an updated version on this page. The updated Terms are
              effective when posted unless a later effective date is stated. Your continued use of ClipMeta after
              the effective date means you accept the updated Terms.
            </p>
          </Section>

          <Section title="19. General Terms">
            <p>
              You may not assign these Terms without our consent. We may assign these Terms in connection with a
              merger, acquisition, financing, reorganization, sale of assets, or similar transaction. If any part
              of these Terms is found unenforceable, the remaining parts will remain in effect. Our failure to
              enforce a provision is not a waiver. These Terms, together with policies referenced in them, are
              the entire agreement between you and ClipMeta regarding the service.
            </p>
          </Section>

          <Section title="20. Contact">
            <p>
              Questions about these Terms? Contact us at{" "}
              <a href="mailto:hello@clipmeta.app" className="underline">hello@clipmeta.app</a>.
            </p>
          </Section>
        </div>
      </article>

      <footer className="border-t border-slate-200 py-8">
        <div className="mx-auto flex max-w-4xl flex-wrap gap-6 px-6 text-sm text-muted-foreground">
          <Link href="/legal/privacy" className="hover:text-foreground">Privacy Policy</Link>
          <Link href="/pricing" className="hover:text-foreground">Pricing</Link>
        </div>
      </footer>
    </main>
  );
}
