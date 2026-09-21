import { cn } from "@/lib/utils";

const fieldBase =
  "flex w-full rounded-xl border border-slate-200 bg-slate-50/80 text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/25 focus-visible:border-brand/40";

export function Input({ className, surface, ...props }) {
  return (
    <input
      className={cn(
        fieldBase,
        surface === "portal" ? "h-12 min-h-[44px] px-4 py-2 text-base placeholder:text-slate-500" : "h-10 px-3 py-2 text-sm placeholder:text-slate-400",
        className
      )}
      {...props}
    />
  );
}

export function Select({ className, surface, ...props }) {
  return (
    <select
      className={cn(
        fieldBase,
        surface === "portal" ? "h-12 min-h-[44px] px-4 py-2 text-base" : "h-10 px-3 py-2 text-sm",
        className
      )}
      {...props}
    />
  );
}
