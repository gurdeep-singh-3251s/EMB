import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-paper px-6 py-16">
      <article className="prose prose-slate mx-auto max-w-2xl">
        <h1 className="font-display text-3xl font-semibold text-ink">Privacy policy</h1>
        <p className="text-sm text-ink-muted">Last updated: November 2025 · Replace with counsel-approved text before launch.</p>

        <section className="mt-8 space-y-4 text-sm leading-relaxed text-ink-muted">
          <p>
            ExtractPilot processes email and attachment content you connect via IMAP to produce structured JSON
            according to your schema. We store mailbox credentials encrypted and associate data with your account.
          </p>
          <p>
            LLM processing may use OpenRouter or configured providers. Do not submit regulated data until you have a
            data processing agreement in place.
          </p>
          <p>
            Attachments may be deleted after <strong>ATTACHMENT_RETENTION_DAYS</strong> (default 7). Extracted JSON
            remains in your workspace until you delete it.
          </p>
          <p>
            Contact your workspace administrator or support email for export or deletion requests.
          </p>
        </section>

        <Link href="/" className="mt-10 inline-block text-sm font-semibold text-rust hover:underline">
          ← Home
        </Link>
      </article>
    </div>
  );
}
