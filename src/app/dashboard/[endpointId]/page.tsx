"use client";

import { useState, useCallback, useEffect } from "react";
import { useParams } from "next/navigation";
import { Header } from "@/components/header";
import { LiveFeed } from "@/components/live-feed";
import { RequestList } from "@/components/request-list";
import { RequestInspector } from "@/components/request-inspector";
import { Button } from "@/components/ui/button";
import { Copy, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import type { RequestItem } from "@/types";

export default function EndpointDetailPage() {
  const params = useParams();
  const endpointId = params.endpointId as string;
  const [liveRequests, setLiveRequests] = useState<RequestItem[]>([]);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [endpointUrl, setEndpointUrl] = useState<string | null>(null);
  const [endpointName, setEndpointName] = useState<string>("Endpoint");

  useEffect(() => {
    fetch(`/api/endpoints/${endpointId}`)
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data) {
          setEndpointUrl(data.url);
          setEndpointName(data.name);
        }
      });
  }, [endpointId]);

  const handleLiveRequests = useCallback((newRequests: RequestItem[]) => {
    setLiveRequests(newRequests);
  }, []);

  const copyUrl = () => {
    if (!endpointUrl) return;
    navigator.clipboard.writeText(endpointUrl);
    toast.success("URL copied");
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="mx-auto max-w-7xl w-full px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Link href="/dashboard">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-xl font-bold">{endpointName}</h1>
            <LiveFeed endpointId={endpointId} onRequests={handleLiveRequests} />
          </div>
          <Button variant="outline" size="sm" onClick={copyUrl}>
            <Copy className="mr-2 h-3.5 w-3.5" />
            Copy URL
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
          <div className="rounded-lg border border-border overflow-hidden">
            <div className="bg-muted px-3 py-2 text-sm font-medium border-b border-border">
              Requests
            </div>
            <RequestList
              endpointId={endpointId}
              liveRequests={liveRequests}
              selectedId={selectedRequestId}
              onSelect={setSelectedRequestId}
            />
          </div>

          <div className="rounded-lg border border-border p-6 overflow-auto">
            {selectedRequestId ? (
              <RequestInspector requestId={selectedRequestId} />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center py-20">
                <p className="text-sm text-muted-foreground">
                  Select a request from the left to inspect headers, body, and more
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
