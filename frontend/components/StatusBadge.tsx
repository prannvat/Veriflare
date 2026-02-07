"use client";

import { JOB_STATUS } from "@/lib/contracts";
import { getStatusClass, getStatusLabel } from "@/lib/utils";

interface StatusBadgeProps {
  status: number;
  size?: "sm" | "md" | "lg";
}

export function StatusBadge({ status, size = "md" }: StatusBadgeProps) {
  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-3 py-1 text-xs",
    lg: "px-4 py-1.5 text-sm",
  };

  return (
    <span className={`status-badge ${getStatusClass(status)} ${sizeClasses[size]}`}>
      {getStatusLabel(status)}
    </span>
  );
}
