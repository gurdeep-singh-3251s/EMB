const colors: Record<string, string> = {
  completed: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
  partial: "bg-amber-100 text-amber-800",
  processing: "bg-blue-100 text-blue-800",
  pending: "bg-slate-100 text-slate-700",
};

export function Badge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[status] ?? colors.pending}`}
    >
      {status}
    </span>
  );
}
