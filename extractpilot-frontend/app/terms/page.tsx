import Link from "next/link";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-paper px-6 py-16">
      <article className="mx-auto max-w-2xl">
        <h1 className="font-display text-3xl font-semibold text-ink">Terms of service</h1>
        <p className="mt-2 text-sm text-ink-muted">Last updated: November 2025 · Replace with counsel-approved text before launch.</p>

        <section className="mt-8 space-y-4 text-sm leading-relaxed text-ink-muted">
          <p>
            By using ExtractPilot you agree to use the service only on mailboxes you are authorized to access and to
            comply with applicable email and data protection laws.
          </p>
          <p>
            Plans, quotas, and pricing are described at checkout. We may change beta limits with notice during early
            access.
          </p>
          <p>
            The service is provided as-is during beta. Critical business processes should include human review of
            extractions.
          </p>
        </section>

        <Link href="/" className="mt-10 inline-block text-sm font-semibold text-rust hover:underline">
          ← Home
        </Link>
      </article>
    </div>
  );
}
