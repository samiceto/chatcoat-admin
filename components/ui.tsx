"use client";

import { ReactNode } from "react";
import { Loader2, Search, SearchX } from "lucide-react";
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
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-gray-900">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-gray-500">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
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
        "rounded-xl border border-gray-200 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.05)]",
        padded && "p-5",
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="text-sm font-semibold text-gray-900">{children}</h2>
  );
}

/* ---------------------------------- Stat ---------------------------------- */

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
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-medium text-gray-500">{label}</span>
        {icon && <span className="text-gray-400">{icon}</span>}
      </div>
      <div className="tnum mt-2 text-[28px] font-bold tracking-tight text-gray-900">
        {value}
      </div>
      {delta && (
        <div
          className={cn(
            "mt-1 text-xs font-medium",
            deltaTone === "up" && "text-emerald-600",
            deltaTone === "down" && "text-rose-600",
            deltaTone === "neutral" && "text-gray-400"
          )}
        >
          {delta}
        </div>
      )}
    </Card>
  );
}

/* ---------------------------------- Badge ---------------------------------- */

type BadgeTone = "gray" | "green" | "red" | "amber" | "blue" | "indigo" | "purple";

const BADGE_TONES: Record<BadgeTone, string> = {
  gray: "bg-gray-100 text-gray-700 ring-gray-200",
  green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  red: "bg-rose-50 text-rose-700 ring-rose-200",
  amber: "bg-amber-50 text-amber-800 ring-amber-200",
  blue: "bg-blue-50 text-blue-700 ring-blue-200",
  indigo: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  purple: "bg-purple-50 text-purple-700 ring-purple-200",
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
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset",
        BADGE_TONES[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

/* ---------------------------------- Button ---------------------------------- */

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost" | "danger-outline";

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-indigo-600 text-white hover:bg-indigo-700 shadow-[0_1px_2px_rgba(16,24,40,0.1)]",
  secondary:
    "bg-white text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50",
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
    "focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20",
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
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
      />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(inputClassName(), "pl-9")}
      />
    </div>
  );
}

/* ---------------------------------- Table ---------------------------------- */

export function TableShell({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.05)]">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">{children}</table>
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
        "border-b border-gray-200 bg-gray-50/80 px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500",
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
      className={cn("border-b border-gray-100 px-4 py-3 align-middle", className)}
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
    <tr className={cn("transition-colors last:[&_td]:border-b-0 hover:bg-gray-50/70", className)}>
      {children}
    </tr>
  );
}

/* ---------------------------------- States ---------------------------------- */

export function LoadingRow({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2.5 py-16 text-sm text-gray-500">
      <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
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
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-100 text-gray-400">
        <SearchX size={18} />
      </span>
      <p className="mt-3 text-sm font-semibold text-gray-900">{title}</p>
      {description && (
        <p className="mt-1 max-w-sm text-[13px] text-gray-500">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorAlert({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] font-medium text-rose-800">
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
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-gray-950/50 p-4 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className={cn(
          "mt-10 w-full rounded-2xl bg-white shadow-2xl",
          wide ? "max-w-2xl" : "max-w-lg"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-gray-200 px-6 py-4">
          <h3 className="text-[15px] font-semibold text-gray-900">{title}</h3>
          {description && (
            <p className="mt-0.5 text-[13px] text-gray-500">{description}</p>
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
    <div className="mt-4 flex items-center justify-between">
      <Button
        variant="secondary"
        disabled={page <= 1}
        onClick={() => onChange(Math.max(1, page - 1))}
      >
        Previous
      </Button>
      <span className="text-[13px] text-gray-500">
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
