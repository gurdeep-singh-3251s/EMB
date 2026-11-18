type IconName =
  | "overview"
  | "pipeline"
  | "results"
  | "emails"
  | "developers"
  | "integrations"
  | "plans"
  | "settings"
  | "company";

const paths: Record<IconName, string> = {
  overview: "M4 6h6v6H4V6zm10 0h6v4h-6V6zm0 6h6v6h-6v-6zM4 14h6v4H4v-4z",
  pipeline: "M5 7h3v10H5V7zm5.5 0H14v4H10.5V7zm0 6H19v4H10.5v-4z",
  results: "M6 18V8l4-2v12H6zm8 0V6l4 2v10h-4z",
  emails: "M5 7h14v10H5V7zm0 2.5 7 4.5 7-4.5",
  developers: "M8 9l-3 3 3 3M16 9l3 3-3 3M13 6l-2 12",
  integrations: "M8 12h8M7 8h3v8H7V8zm7 0h3v8h-3V8z",
  plans: "M6 6h12v5H6V6zm0 7h12v5H6v-5z",
  settings: "M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8zm7-1v2m0 8v2M5 7v2m0 8v2",
  company: "M4 20V9l8-4 8 4v11M9 20v-6h6v6M9 11h2M13 11h2M9 15h2M13 15h2",
};

export function DashboardNavIcon({ name, className = "" }: { name: IconName; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`h-4 w-4 shrink-0 opacity-80 ${className}`}
      aria-hidden
    >
      <path d={paths[name]} />
    </svg>
  );
}
