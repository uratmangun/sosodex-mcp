"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { DynamicToolUIPart, ToolUIPart } from "ai";
import {
  CheckCircleIcon,
  ChevronDownIcon,
  CircleIcon,
  ClockIcon,
  WrenchIcon,
  XCircleIcon,
} from "lucide-react";
import type { ComponentProps, HTMLAttributes, ReactNode } from "react";
import { isValidElement } from "react";

export type ToolProps = ComponentProps<"details">;

export const Tool = ({ className, open, ...props }: ToolProps) => (
  <details
    open={open}
    className={cn("group mb-4 w-full rounded-md border border-[#e2e8f0]", className)}
    {...props}
  />
);

export type ToolPart = ToolUIPart | DynamicToolUIPart;

export type ToolHeaderProps = {
  title?: string;
  className?: string;
} & (
  | { type: ToolUIPart["type"]; state: ToolUIPart["state"]; toolName?: never }
  | {
      type: DynamicToolUIPart["type"];
      state: DynamicToolUIPart["state"];
      toolName: string;
    }
);

const statusLabels: Record<ToolPart["state"], string> = {
  "approval-requested": "Awaiting approval",
  "approval-responded": "Responded",
  "input-available": "Running",
  "input-streaming": "Pending",
  "output-available": "Completed",
  "output-denied": "Denied",
  "output-error": "Error",
};

const statusIcons: Record<ToolPart["state"], ReactNode> = {
  "approval-requested": <ClockIcon className="size-4 text-amber-600" />,
  "approval-responded": <CheckCircleIcon className="size-4 text-blue-600" />,
  "input-available": <ClockIcon className="size-4 animate-pulse text-[#1a73e8]" />,
  "input-streaming": <CircleIcon className="size-4" />,
  "output-available": <CheckCircleIcon className="size-4 text-emerald-600" />,
  "output-denied": <XCircleIcon className="size-4 text-orange-600" />,
  "output-error": <XCircleIcon className="size-4 text-red-600" />,
};

export const getStatusBadge = (status: ToolPart["state"]) => (
  <Badge className="gap-1.5 rounded-full text-xs" variant="secondary">
    {statusIcons[status]}
    {statusLabels[status]}
  </Badge>
);

export const ToolHeader = ({
  className,
  title,
  type,
  state,
  toolName,
  ...props
}: ToolHeaderProps) => {
  const derivedName =
    type === "dynamic-tool" ? toolName : type.split("-").slice(1).join("-");

  return (
    <summary
      className={cn(
        "flex w-full cursor-pointer list-none items-center justify-between gap-4 p-3 [&::-webkit-details-marker]:hidden",
        className,
      )}
      {...props}
    >
      <div className="flex items-center gap-2">
        <WrenchIcon className="size-4 text-[#64748b]" />
        <span className="text-sm font-medium text-[#0f172a]">
          {title ?? derivedName}
        </span>
        {getStatusBadge(state)}
      </div>
      <ChevronDownIcon className="size-4 text-[#64748b] transition-transform group-open:rotate-180" />
    </summary>
  );
};

export type ToolContentProps = HTMLAttributes<HTMLDivElement>;

export const ToolContent = ({ className, ...props }: ToolContentProps) => (
  <div className={cn("space-y-4 border-t border-[#e2e8f0] p-4", className)} {...props} />
);

export type ToolInputProps = ComponentProps<"div"> & {
  input: ToolPart["input"];
};

function JsonPre({
  value,
  variant = "default",
}: {
  value: string;
  variant?: "default" | "dark";
}) {
  return (
    <pre
      className={cn(
        "max-h-64 overflow-auto rounded-md p-3 text-xs",
        variant === "dark"
          ? "bg-[#1e293b] text-[#e2e8f0]"
          : "bg-[#f8fafc] text-[#334155]",
      )}
    >
      {value}
    </pre>
  );
}

export const ToolInput = ({ className, input, ...props }: ToolInputProps) => {
  const serializedInput =
    input === undefined
      ? "Waiting for tool input..."
      : JSON.stringify(input, null, 2);

  return (
    <div className={cn("space-y-2 overflow-hidden", className)} {...props}>
      <h4 className="text-xs font-medium uppercase tracking-wide text-[#64748b]">
        Parameters
      </h4>
      <JsonPre value={serializedInput} variant="default" />
    </div>
  );
};

export type ToolOutputProps = ComponentProps<"div"> & {
  output?: ToolPart["output"];
  errorText?: ToolPart["errorText"];
  variant?: "default" | "dark";
};

export const ToolOutput = ({
  className,
  output,
  errorText,
  variant = "default",
  ...props
}: ToolOutputProps) => {
  if (!(output || errorText)) {
    return null;
  }

  let body: ReactNode = null;

  if (errorText) {
    body = <p className="text-sm text-red-700">{errorText}</p>;
  } else if (isValidElement(output)) {
    body = output;
  } else if (typeof output === "string") {
    body = <JsonPre value={output} variant={variant} />;
  } else if (output !== undefined) {
    body = (
      <JsonPre value={JSON.stringify(output, null, 2)} variant={variant} />
    );
  }

  const isDark = variant === "dark" && !errorText;

  return (
    <div className={cn("space-y-2", className)} {...props}>
      <h4
        className={cn(
          "text-xs font-medium uppercase tracking-wide",
          isDark ? "text-[#94a3b8]" : "text-[#64748b]",
        )}
      >
        {errorText ? "Error" : "Result"}
      </h4>
      <div
        className={cn(
          "overflow-x-auto rounded-md",
          errorText
            ? "bg-red-50"
            : isDark
              ? "bg-[#0f172a]"
              : "bg-[#f8fafc]",
        )}
      >
        {body}
      </div>
    </div>
  );
};
