import { cn } from "@/lib/utils";

export function AspenLogo({
  className,
  markClassName,
  wordmarkClassName,
}: {
  className?: string;
  markClassName?: string;
  wordmarkClassName?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <svg
        viewBox="0 0 24 24"
        aria-hidden
        className={cn("h-5 w-5 shrink-0", markClassName)}
      >
        <path d="M12 2.5 22 21H2z" fill="currentColor" />
      </svg>
      <span
        className={cn(
          "font-semibold tracking-[0.14em] text-[15px] uppercase",
          wordmarkClassName,
        )}
      >
        Aspen
      </span>
    </div>
  );
}
