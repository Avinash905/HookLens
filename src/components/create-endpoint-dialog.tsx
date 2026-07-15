"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import type { Endpoint } from "@/types";

interface CreateEndpointDialogProps {
  onCreated: (endpoint: Endpoint) => void;
}

export function CreateEndpointDialog({ onCreated }: CreateEndpointDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/endpoints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create endpoint");
      }
      const endpoint = await res.json();
      onCreated(endpoint);
      toast.success("Endpoint created! Copy the URL and point your webhook provider to it.");
      setName("");
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create endpoint");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Endpoint
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Endpoint</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="endpoint-name">Endpoint Name</Label>
            <Input
              id="endpoint-name"
              placeholder="e.g. GitHub Webhooks"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={50}
              autoFocus
            />
          </div>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline">Cancel</Button>} />
            <Button type="submit" disabled={loading || !name.trim()}>
              {loading ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
