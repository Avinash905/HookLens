"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ShieldAlert, Info } from "lucide-react";
import { toast } from "sonner";
import type { Endpoint } from "@/types";

interface EndpointSettingsDialogProps {
  endpoint: Endpoint | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: (endpoint: Endpoint) => void;
}

function SettingsForm({
  endpoint,
  onOpenChange,
  onUpdated,
}: {
  endpoint: Endpoint;
  onOpenChange: (open: boolean) => void;
  onUpdated: (endpoint: Endpoint) => void;
}) {
  const [name, setName] = useState(endpoint.name);
  const [forwardUrl, setForwardUrl] = useState(endpoint.forwardUrl || "");
  const [autoForward, setAutoForward] = useState(endpoint.autoForward);
  const [signingSecret, setSigningSecret] = useState("");
  const [loading, setLoading] = useState(false);
  const [ssrfError, setSsrfError] = useState<string | null>(null);

  const handleSave = async () => {
    setLoading(true);
    setSsrfError(null);

    const data: Record<string, unknown> = {};
    if (name !== endpoint.name) data.name = name;
    if (forwardUrl !== (endpoint.forwardUrl || "")) {
      data.forwardUrl = forwardUrl || null;
    }
    if (autoForward !== endpoint.autoForward) data.autoForward = autoForward;
    if (signingSecret) data.signingSecret = signingSecret;

    if (Object.keys(data).length === 0) {
      onOpenChange(false);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/endpoints/${endpoint.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        if (err.error?.includes("blocked")) {
          setSsrfError(err.error);
          setLoading(false);
          return;
        }
        throw new Error(err.error || "Failed to update endpoint");
      }

      const updated = await res.json();
      onUpdated(updated);
      toast.success("Endpoint settings saved");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update endpoint");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Endpoint Settings</DialogTitle>
      </DialogHeader>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="settings-name">Name</Label>
          <Input id="settings-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={50} />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="settings-forward-url">Forward URL</Label>
          <Input
            id="settings-forward-url"
            placeholder="https://your-server.com/webhook"
            value={forwardUrl}
            onChange={(e) => setForwardUrl(e.target.value)}
          />
          {ssrfError && (
            <Alert variant="destructive">
              <ShieldAlert className="h-4 w-4" />
              <AlertDescription>{ssrfError}</AlertDescription>
            </Alert>
          )}
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="settings-auto-forward"
            checked={autoForward}
            onChange={(e) => setAutoForward(e.target.checked)}
            className="h-4 w-4 rounded border-border cursor-pointer"
          />
          <Label htmlFor="settings-auto-forward">Auto-forward incoming requests</Label>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="settings-secret" className="flex items-center gap-1.5">
            Webhook Signing Secret
            <span title="Secret used by the webhook provider (Stripe, GitHub, etc.) to sign payloads. HookLens verifies the signature to confirm the request is authentic." className="inline-flex">
              <Info className="h-3.5 w-3.5 text-muted-foreground cursor-pointer" />
            </span>
            {endpoint.hasSigningSecret && (
              <span className="ml-1 text-xs text-muted-foreground">(configured — enter new to replace)</span>
            )}
          </Label>
          <Input
            id="settings-secret"
            type="password"
            placeholder="Enter webhook signing secret"
            value={signingSecret}
            onChange={(e) => setSigningSecret(e.target.value)}
            maxLength={100}
          />
        </div>
      </div>
      <DialogFooter>
        <DialogClose render={<Button type="button" variant="outline">Cancel</Button>} />
        <Button onClick={handleSave} disabled={loading}>
          {loading ? "Saving..." : "Save"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

export function EndpointSettingsDialog({
  endpoint,
  open,
  onOpenChange,
  onUpdated,
}: EndpointSettingsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {endpoint && (
        <SettingsForm
          key={endpoint.id}
          endpoint={endpoint}
          onOpenChange={onOpenChange}
          onUpdated={onUpdated}
        />
      )}
    </Dialog>
  );
}
