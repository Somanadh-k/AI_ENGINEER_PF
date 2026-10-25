export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export function formatMonth(value?: string | null): string {
  if (!value) return "Present";
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) return value;
  const month = Number(match[2]);
  return `${MONTHS[Math.min(Math.max(month, 1), 12) - 1]} ${match[1]}`;
}

export function formatRange(start?: string | null, end?: string | null, current?: boolean): string {
  if (!start) return "Dates not published";
  return `${formatMonth(start)} — ${current ? "Present" : formatMonth(end)}`;
}

export function shortDate(value?: string | null): string {
  if (!value) return "";
  const date = new Date(value.length <= 7 ? `${value}-01` : value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en", { month: "short", year: "numeric" }).format(date);
}

export function isExternalHref(href: string): boolean {
  return /^https?:\/\//i.test(href);
}

export function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1).trimEnd()}…`;
}

export const CATEGORY_TONE: Record<string, { text: string; bg: string; border: string; dot: string }> = {
  cyan: { text: "text-cyan", bg: "bg-cyan/10", border: "border-cyan/30", dot: "bg-cyan" },
  violet: { text: "text-violet", bg: "bg-violet/10", border: "border-violet/30", dot: "bg-violet" },
  mint: { text: "text-mint", bg: "bg-mint/10", border: "border-mint/30", dot: "bg-mint" },
  silver: { text: "text-silver", bg: "bg-silver/10", border: "border-silver/25", dot: "bg-silver" },
};
