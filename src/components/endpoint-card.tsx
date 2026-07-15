"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Copy, Trash2, Settings, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import type { Endpoint } from "@/types";

interface EndpointCardProps {
  endpoint: Endpoint;
  onDelete: (id: string) => void;
  onSettings: (endpoint: Endpoint) => void;
}

export function EndpointCard({ endpoint, onDelete, onSettings }: EndpointCardProps) {
  const copyUrl = () => {
    navigator.clipboard.writeText(endpoint.url);
    toast.success("Endpoint URL copied to clipboard");
  };

  return (
    <Card className="p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold">{endpoint.name}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {endpoint.requestCount} request{endpoint.requestCount !== 1 ? "s" : ""}
            {endpoint.lastRequestAt && ` · ${new Date(endpoint.lastRequestAt).toLocaleDateString()}`}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {endpoint.hasSigningSecret && (
            <Badge variant="secondary" className="text-xs">
              <ShieldCheck className="mr-1 h-3 w-3" />
              Signed
            </Badge>
          )}
          {endpoint.autoForward && (
            <Badge variant="secondary" className="text-xs">
              Auto-forward
            </Badge>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-md bg-muted px-3 py-2 text-sm font-mono text-muted-foreground">
        <span className="truncate flex-1">{endpoint.url}</span>
        <button onClick={copyUrl} className="shrink-0 hover:text-foreground transition-colors cursor-pointer">
          <Copy className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex items-center gap-2 mt-auto">
        <Link
          href={`/dashboard/${endpoint.id}`}
          className="text-sm text-primary hover:underline"
        >
          View requests →
        </Link>
        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={() => onSettings(endpoint)}
            className="p-1.5 rounded-md hover:bg-muted transition-colors cursor-pointer"
            title="Settings"
          >
            <Settings className="h-4 w-4" />
          </button>
          <button
            onClick={() => onDelete(endpoint.id)}
            className="p-1.5 rounded-md hover:bg-muted text-destructive transition-colors cursor-pointer"
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </Card>
  );
}
