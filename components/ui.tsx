"use client";

import { ReactNode, useEffect, useId, useRef } from "react";
import { Loader2, Search } from "lucide-react";
import { cn } from "@/lib/cn";

/* ---------------------------------- Page header ---------------------------------- */

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
      <div className="min-w-0">
        <h1 className="font-display break-words text-[34px] text-gray-900">
          {title}
        </h1>
        {description && (
          <p className="mt-2 max-w-[62ch] text-[14px] leading-relaxed text-gray-500">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/* ---------------------------------- Card ---------------------------------- */

export function Card({
  children,
  className,
  padded = true,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-gray-200 bg-white",
        padded && "p-5",
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardTitle({ children }: { children: ReactNode }) {
  return <h2 className="text-[15px] font-bold text-gray-900">{children}</h2>;
}

/* ---------------------------------- Stat ---------------------------------- */

/**
 * A single figure with a label. Stats sit in the page without a box: a thin
 * rule on the left separates one figure from the next, so a row of them reads
 * as one instrument strip rather than a set of cards.
 */
export function Stat({
  label,
  value,
  icon,
  delta,
  deltaTone = "neutral",
}: {
  label: string;
  value: string;
  icon?: ReactNode;
  delta?: string;
  deltaTone?: "up" | "down" | "neutral";
}) {
  return (
    <div className="border-l-2 border-gray-200 py-1 pl-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[13px] font-medium text-gray-500">{label}</span>
        {icon && <span className="text-gray-400">{icon}</span>}
      </div>
      <div className="font-display tnum mt-1 text-[36px] text-gray-900">
        {value}
      </div>
      {delta && (
        <div
          className={cn(
            "mt-1 text-[12px] font-medium",
            deltaTone === "up" && "text-emerald-700",
            deltaTone === "down" && "text-rose-700",
            deltaTone === "neutral" && "text-gray-500"
          )}
        >
          {delta}
        </div>
      )}
    </div>
  );
}

/* ---------------------------------- Readout ---------------------------------- */

/**
 * The one dark surface in the console: a panel of headline figures on the
 * Overview page. Cells are separated by hairlines.
 */
export function Readout({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-gray-700 sm:grid-cols-4">
      {children}
    </div>
  );
}

export function ReadoutCell({
  label,
  value,
  note,
  noteTone = "muted",
  wide = false,
}: {
  label: string;
  value: string;
  note?: string;
  noteTone?: "ok" | "alert" | "muted";
  wide?: boolean;
}) {
  return (
    <div
      className={cn(
        "bg-gray-900 px-5 py-5 sm:px-6 sm:py-6",
        wide && "col-span-2"
      )}
    >
      <div className="text-[13px] font-medium text-gray-300">{label}</div>
      <div
        className={cn(
          "font-display tnum mt-2 text-white",
          wide ? "text-[64px] sm:text-[80px]" : "text-[40px] sm:text-[48px]"
        )}
      >
        {value}
      </div>
      {note && (
        <div
          className={cn(
            "mt-1 text-[13px] font-medium",
            noteTone === "ok" && "text-emerald-300",
            noteTone === "alert" && "text-rose-300",
            noteTone === "muted" && "text-gray-400"
          )}
        >
          {note}
        </div>
      )}
    </div>
  );
}

/* ---------------------------------- Badge ---------------------------------- */

type BadgeTone = "gray" | "green" | "red" | "amber" | "blue" | "indigo" | "purple";

/**
 * Filled badges with a dot describe a state (Active, Suspended, Trialing).
 * The "indigo" tone is the outlined tag used for names such as plans.
 */
const BADGE_TONES: Record<BadgeTone, string> = {
  gray: "bg-gray-100 text-gray-700",
  green: "bg-emerald-50 text-emerald-800",
  red: "bg-rose-50 text-rose-800",
  amber: "bg-amber-50 text-amber-800",
  blue: "bg-blue-50 text-blue-700",
  indigo: "bg-white text-gray-800 ring-1 ring-inset ring-gray-300",
  purple: "bg-purple-50 text-purple-700",
};

const BADGE_DOTS: Partial<Record<BadgeTone, string>> = {
  green: "bg-emerald-600",
  red: "bg-rose-600",
  amber: "bg-amber-500",
};

export function Badge({
  tone = "gray",
  children,
  className,
}: {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
}) {
  const dot = BADGE_DOTS[tone];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[12px] font-semibold",
        BADGE_TONES[tone],
        className
      )}
    >
      {dot && <span aria-hidden className={cn("h-1.5 w-1.5 rounded-full", dot)} />}
      {children}
    </span>
  );
}

/* ---------------------------------- Button ---------------------------------- */

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost" | "danger-outline";

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-gray-900 text-white hover:bg-gray-700",
  secondary:
    "bg-white text-gray-800 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 hover:ring-gray-400",
  danger: "bg-rose-600 text-white hover:bg-rose-700",
  "danger-outline":
    "bg-white text-rose-700 ring-1 ring-inset ring-rose-300 hover:bg-rose-50",
  ghost: "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
};

export function Button({
  variant = "secondary",
  children,
  className,
  disabled,
  ...props
}: {
  variant?: ButtonVariant;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-[13px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        BUTTON_VARIANTS[variant],
        className
      )}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}

/* ---------------------------------- Inputs ---------------------------------- */

export function inputClassName(extra?: string) {
  return cn(
    "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400",
    "focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-600/20",
    extra
  );
}

export function labelClassName() {
  return "mb-1.5 block text-[13px] font-medium text-gray-700";
}

export function SearchInput({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <Search
        size={15}
        aria-hidden
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
      />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder || "Search"}
        className={cn(inputClassName(), "pl-9")}
      />
    </div>
  );
}

/* ---------------------------------- Table ---------------------------------- */

/**
 * Tables are ledgers: a heavy rule on top, hairlines between rows, and no
 * outer box. First and last columns sit flush with the page edge.
 */
export function TableShell({ children }: { children: ReactNode }) {
  return (
    <div className="border-t-2 border-gray-900 bg-white">
      <div className="overflow-x-auto">
        <table className="w-full text-sm [&_td:first-child]:pl-0 [&_td:last-child]:pr-0 [&_th:first-child]:pl-0 [&_th:last-child]:pr-0">
          {children}
        </table>
      </div>
    </div>
  );
}

export function Th({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <th
      className={cn(
        "whitespace-nowrap border-b border-gray-200 px-4 py-3 text-left text-[12px] font-semibold text-gray-500",
        className
      )}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  className,
  colSpan,
  rowSpan,
}: {
  children: ReactNode;
  className?: string;
  colSpan?: number;
  rowSpan?: number;
}) {
  return (
    <td
      colSpan={colSpan}
      rowSpan={rowSpan}
      className={cn("border-b border-gray-200 px-4 py-3.5 align-middle", className)}
    >
      {children}
    </td>
  );
}

export function Tr({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <tr className={cn("transition-colors last:[&_td]:border-b-0 hover:bg-gray-50", className)}>
      {children}
    </tr>
  );
}

/* ---------------------------------- States ---------------------------------- */

export function LoadingRow({ label = "Loading…" }: { label?: string }) {
  return (
    <div
      role="status"
      className="flex items-center justify-center gap-2.5 py-16 text-sm text-gray-500"
    >
      <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
      <span>{label}</span>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <p className="text-[15px] font-bold text-gray-900">{title}</p>
      {description && (
        <p className="mt-1.5 max-w-sm text-[13px] leading-relaxed text-gray-500">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorAlert({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="mb-5 rounded-r-lg border-l-[3px] border-rose-600 bg-rose-50 px-4 py-3 text-[13px] font-medium text-rose-800"
    >
      {message}
    </div>
  );
}

/* ---------------------------------- Modal ---------------------------------- */

export function Modal({
  title,
  description,
  children,
  onClose,
  wide,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);

  // Escape closes the dialog; focus moves into it unless a field already took it.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const el = dialogRef.current;
    if (el && !el.contains(document.activeElement)) el.focus();
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="anim-scrim fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-gray-950/50 p-4"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(
          "anim-dialog mt-10 w-full rounded-2xl bg-white shadow-2xl outline-none",
          wide ? "max-w-2xl" : "max-w-lg"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-gray-200 px-6 py-5">
          <h3 id={titleId} className="font-display text-[24px] text-gray-900">
            {title}
          </h3>
          {description && (
            <p className="mt-1.5 text-[13px] leading-relaxed text-gray-500">
              {description}
            </p>
          )}
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

export function Pagination({
  page,
  totalPages,
  onChange,
  pageSize,
  total,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
  pageSize?: number;
  total?: number;
}) {
  return (
    <div className="mt-5 flex items-center justify-between gap-3">
      <Button
        variant="secondary"
        disabled={page <= 1}
        onClick={() => onChange(Math.max(1, page - 1))}
      >
        Previous
      </Button>
      <span className="tnum text-[13px] text-gray-500">
        {total !== undefined && pageSize !== undefined
          ? `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} of ${total.toLocaleString()}`
          : `Page ${page} of ${totalPages}`}
      </span>
      <Button
        variant="secondary"
        disabled={page >= totalPages}
        onClick={() => onChange(Math.min(totalPages, page + 1))}
      >
        Next
      </Button>
    </div>
  );
}
