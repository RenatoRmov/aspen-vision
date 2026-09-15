import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  differenceInCalendarDays,
} from "date-fns";

export type RangeKey = "today" | "week" | "month" | "year" | "custom";

export const RANGE_LABEL: Record<RangeKey, string> = {
  today: "Hoy",
  week: "Esta semana",
  month: "Este mes",
  year: "Este año",
  custom: "Personalizado",
};

export function resolveRange(
  range: string | undefined,
  from: string | undefined,
  to: string | undefined,
): { key: RangeKey; from: Date; to: Date } {
  const now = new Date();

  if (range === "custom" && from && to) {
    return { key: "custom", from: startOfDay(new Date(from)), to: endOfDay(new Date(to)) };
  }

  switch (range) {
    case "week":
      return {
        key: "week",
        from: startOfWeek(now, { weekStartsOn: 1 }),
        to: endOfWeek(now, { weekStartsOn: 1 }),
      };
    case "month":
      return { key: "month", from: startOfMonth(now), to: endOfMonth(now) };
    case "year":
      return { key: "year", from: startOfYear(now), to: endOfYear(now) };
    case "today":
    default:
      return { key: "today", from: startOfDay(now), to: endOfDay(now) };
  }
}

/** Bucket granularity for the sales-over-time chart, based on span length. */
export function bucketGranularity(from: Date, to: Date): "hour" | "day" | "month" {
  const days = differenceInCalendarDays(to, from);
  if (days <= 1) return "hour";
  if (days <= 92) return "day";
  return "month";
}
