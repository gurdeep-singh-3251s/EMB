import { formatUsdPrice } from "@repo/config/plans";

export function PlanPrice({
  priceMonthlyUsd,
  compareAtUsd,
}: {
  priceMonthlyUsd: number | null;
  compareAtUsd?: number | null;
}) {
  return (
    <div className="mt-4 flex flex-wrap items-baseline gap-2">
      <span className="font-display text-3xl font-semibold text-ink">
        {formatUsdPrice(priceMonthlyUsd)}
      </span>
      {compareAtUsd != null && compareAtUsd > (priceMonthlyUsd ?? 0) ? (
        <span className="text-sm text-ink-faint line-through">{formatUsdPrice(compareAtUsd, { suffix: "" })}/mo</span>
      ) : null}
    </div>
  );
}
