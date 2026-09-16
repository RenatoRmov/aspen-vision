const clpFormatter = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

export function formatCLP(value: number) {
  return clpFormatter.format(value);
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat("es-CL").format(value);
}

const dateFormatter = new Intl.DateTimeFormat("es-CL", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export function formatDate(date: Date | string) {
  return dateFormatter.format(new Date(date));
}

const dateTimeFormatter = new Intl.DateTimeFormat("es-CL", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatDateTime(date: Date | string) {
  return dateTimeFormatter.format(new Date(date));
}

const dateOnlyFormatter = new Intl.DateTimeFormat("es-CL", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

/**
 * For pure calendar dates with no meaningful time-of-day (e.g. a document or
 * payment date picked from a plain <input type="date">). Reads UTC
 * components so the calendar day never shifts depending on the server's or
 * viewer's local timezone — unlike formatDate/formatDateTime, which are for
 * real timestamps and should show in local time.
 */
export function formatDateOnly(date: Date | string) {
  return dateOnlyFormatter.format(new Date(date));
}
