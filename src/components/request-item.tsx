"use client";

import { Badge } from "@/components/ui/badge";
import { ShieldCheck, ShieldX, AlertCircle, Clock, CheckCircle, XCircle } from "lucide-react";
import type { RequestItem } from "@/types";

function formatBodySize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

interface RequestItemRowProps {
  request: RequestItem;
  isSelected: boolean;
  onClick: () => void;
}

const methodColors: Record<string, string> = {
  GET: "bg-blue-500/10 text-blue-500",
  POST: "bg-green-500/10 text-green-500",
  PUT: "bg-yellow-500/10 text-yellow-500",
  PATCH: "bg-orange-500/10 text-orange-500",
  DELETE: "bg-red-500/10 text-red-500",
};

export function RequestItemRow({ request, isSelected, onClick }: RequestItemRowProps) {
  const time = new Date(request.createdAt).toLocaleTimeString();

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2 text-left border-b border-border hover:bg-muted transition-colors cursor-pointer ${
        isSelected ? "bg-muted" : ""
      }`}
    >
      <span
        className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded ${methodColors[request.method] || "bg-muted text-muted-foreground"}`}
      >
        {request.method}
      </span>

      <span className="text-xs text-muted-foreground font-mono shrink-0">{time}</span>

      <span className="text-xs text-muted-foreground font-mono shrink-0 hidden sm:inline">
        {request.bodySize > 0 ? `${formatBodySize(request.bodySize)}` : "no body"}
      </span>

      <div className="flex items-center gap-1 ml-auto">
        {request.signatureVerified === true && (
          <ShieldCheck className="h-3.5 w-3.5 text-green-500" />
        )}
        {request.signatureVerified === false && (
          <ShieldX className="h-3.5 w-3.5 text-red-500" />
        )}

        {request.forwardStatus === "success" && (
          <CheckCircle className="h-3.5 w-3.5 text-green-500" />
        )}
        {request.forwardStatus === "failed" && (
          <XCircle className="h-3.5 w-3.5 text-red-500" />
        )}
        {request.forwardStatus === "timeout" && (
          <Clock className="h-3.5 w-3.5 text-yellow-500" />
        )}

        {request.failureStatus && (
          <Badge
            variant={request.failureStatus === "recovered" ? "default" : "destructive"}
            className="text-xs px-1 py-0"
          >
            {request.failureStatus === "recovered" ? (
              <CheckCircle className="mr-1 h-3 w-3" />
            ) : (
              <AlertCircle className="mr-1 h-3 w-3" />
            )}
            {request.failureStatus}
          </Badge>
        )}
      </div>
    </button>
  );
}
