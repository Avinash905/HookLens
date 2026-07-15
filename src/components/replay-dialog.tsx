"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RefreshCw, ShieldAlert, CheckCircle, XCircle, Clock } from "lucide-react";
import { toast } from "sonner";

interface ReplayDialogProps {
  requestId: string;
  defaultUrl?: string | null;
  method?: string;
  bodySize?: number;
  onReplayed?: () => void;
}

export function ReplayDialog({ requestId, defaultUrl, method, bodySize, onReplayed }: ReplayDialogProps) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState(defaultUrl || "");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    status: string;
    responseStatus: number | null;
    responseTime: number | null;
    errorMessage: string | null;
  } | null>(null);

  const handleReplay = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(`/api/requests/${requestId}/replay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUrl: url.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Replay failed");
      }
      setResult(data);
      if (data.status === "success") {
        toast.success(`Replay succeeded — ${data.responseStatus}`);
      } else if (data.status === "blocked") {
        toast.error("URL blocked by SSRF protection");
      } else {
        toast.error(`Replay ${data.status}`);
      }
      onReplayed?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Replay failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setResult(null); }}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            <RefreshCw className="mr-2 h-3.5 w-3.5" />
            Replay
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Replay Request</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          {(method || bodySize != null) && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted rounded-md px-3 py-2">
              {method && (
                <span className="font-mono font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary">{method}</span>
              )}
              {bodySize != null && (
                <span>{bodySize > 0 ? `${bodySize} bytes` : "no body"}</span>
              )}
              <span className="ml-auto">Original request will be re-sent</span>
            </div>
          )}
          <div className="flex flex-col gap-2">
            <Label htmlFor="replay-url">Target URL</Label>
            <Input
              id="replay-url"
              placeholder="https://your-server.com/webhook"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>

          {result && (
            <div className="space-y-2">
              {result.status === "blocked" && (
                <Alert variant="destructive">
                  <ShieldAlert className="h-4 w-4" />
                  <AlertDescription>{result.errorMessage}</AlertDescription>
                </Alert>
              )}
              {result.status === "success" && (
                <Alert>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <AlertDescription>
                    Replay succeeded with status {result.responseStatus} in {result.responseTime}ms
                  </AlertDescription>
                </Alert>
              )}
              {result.status === "failed" && (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>
                    Replay failed{result.errorMessage ? `: ${result.errorMessage}` : ""}
                  </AlertDescription>
                </Alert>
              )}
              {result.status === "timeout" && (
                <Alert variant="destructive">
                  <Clock className="h-4 w-4" />
                  <AlertDescription>
                    Replay timed out after {result.responseTime}ms
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline">Close</Button>} />
          <Button onClick={handleReplay} disabled={loading || !url.trim()}>
            {loading ? "Replaying..." : "Send Replay"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
