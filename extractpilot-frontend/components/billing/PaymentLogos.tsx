export function RazorpayLogo({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect width="32" height="32" rx="8" fill="#072654" />
      <path
        fill="#3395FF"
        d="M9 8h8.2c3.4 0 5.6 1.8 5.6 4.5 0 2-1.1 3.5-2.9 4.2L23.6 24h-4.2l-3.2-6.6H13V24H9V8zm4 3.1v4.2h3.7c1.5 0 2.4-.7 2.4-2.1s-.9-2.1-2.4-2.1H13z"
      />
    </svg>
  );
}

export function PaymentLogos() {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-2" aria-label="Cards accepted through Razorpay">
      <span className="mr-1 inline-flex items-center gap-2 text-[13px] font-semibold text-ink-muted">
        <RazorpayLogo />
        Razorpay
      </span>
      <CardBadge label="VISA" className="bg-[#1A1F71] text-white" />
      <MastercardBadge />
      <CardBadge label="AMEX" className="bg-[#2E77BC] text-white" />
    </div>
  );
}

function CardBadge({ label, className }: { label: string; className: string }) {
  return (
    <span className={`inline-flex h-7 items-center rounded-md px-2 text-[11px] font-bold tracking-[0.08em] ${className}`}>
      {label}
    </span>
  );
}

function MastercardBadge() {
  return (
    <span className="inline-flex h-7 items-center gap-0 rounded-md bg-paper-elevated px-2 ring-1 ring-ink/10" aria-label="Mastercard">
      <span className="h-4 w-4 rounded-full bg-[#EB001B]" />
      <span className="-ml-1.5 h-4 w-4 rounded-full bg-[#F79E1B]" />
    </span>
  );
}
