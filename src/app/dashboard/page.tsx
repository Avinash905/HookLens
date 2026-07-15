"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Header } from "@/components/header";
import { Skeleton } from "@/components/ui/skeleton";
import { EndpointCard } from "@/components/endpoint-card";
import { CreateEndpointDialog } from "@/components/create-endpoint-dialog";
import { EndpointSettingsDialog } from "@/components/endpoint-settings-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Webhook } from "lucide-react";
import { toast } from "sonner";
import type { Endpoint } from "@/types";

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [settingsEndpoint, setSettingsEndpoint] = useState<Endpoint | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchEndpoints = useCallback(async () => {
    try {
      const res = await fetch("/api/endpoints");
      if (res.ok) {
        const data = await res.json();
        setEndpoints(data.data);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/api/auth/signin");
    }
    if (status === "authenticated") {
      fetchEndpoints();
    }
  }, [status, router, fetchEndpoints]);

  const handleCreated = (endpoint: Endpoint) => {
    setEndpoints((prev) => [endpoint, ...prev]);
  };

  const handleUpdated = (updated: Endpoint) => {
    setEndpoints((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const res = await fetch(`/api/endpoints/${deleteId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete endpoint");
      setEndpoints((prev) => prev.filter((e) => e.id !== deleteId));
      toast.success("Endpoint deleted");
    } catch {
      toast.error("Failed to delete endpoint");
    } finally {
      setDeleteId(null);
    }
  };

  if (status === "loading" || (status === "authenticated" && loading)) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="mx-auto max-w-7xl w-full px-4 py-8">
          <Skeleton className="h-8 w-48 mb-6" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-32 rounded-lg" />
            <Skeleton className="h-32 rounded-lg" />
            <Skeleton className="h-32 rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="mx-auto max-w-7xl w-full px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Endpoints</h1>
          <CreateEndpointDialog onCreated={handleCreated} />
        </div>

        {endpoints.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <Webhook className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-semibold">No endpoints yet</h2>
            <p className="mt-1 text-sm text-muted-foreground max-w-xs">
              An endpoint gives you a unique URL to receive and inspect webhooks from any service.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {endpoints.map((endpoint) => (
              <EndpointCard
                key={endpoint.id}
                endpoint={endpoint}
                onDelete={(id) => setDeleteId(id)}
                onSettings={(ep) => {
                  setSettingsEndpoint(ep);
                  setSettingsOpen(true);
                }}
              />
            ))}
          </div>
        )}
      </div>

      <EndpointSettingsDialog
        endpoint={settingsEndpoint}
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        onUpdated={handleUpdated}
      />

      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Endpoint?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will permanently delete the endpoint and all captured requests. This cannot be undone.
          </p>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline">Cancel</Button>} />
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
