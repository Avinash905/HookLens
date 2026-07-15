"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { RequestItemRow } from "@/components/request-item";
import { Loader2 } from "lucide-react";
import type { RequestItem } from "@/types";

interface RequestListProps {
  endpointId: string;
  liveRequests: RequestItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function RequestList({ endpointId, liveRequests, selectedId, onSelect }: RequestListProps) {
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const liveIdsRef = useRef<Set<string>>(new Set());

  const fetchInitial = useCallback(async () => {
    try {
      const res = await fetch(`/api/endpoints/${endpointId}/requests?limit=20`);
      if (res.ok) {
        const data = await res.json();
        setRequests(data.data);
        setCursor(data.nextCursor);
        setHasMore(data.hasMore);
        data.data.forEach((r: RequestItem) => liveIdsRef.current.add(r.id));
      }
    } finally {
      setLoading(false);
    }
  }, [endpointId]);

  useEffect(() => {
    fetchInitial();
  }, [fetchInitial]);

  // Merge live requests
  useEffect(() => {
    if (liveRequests.length === 0) return;
    setRequests((prev) => {
      const newReqs = liveRequests.filter((r) => !liveIdsRef.current.has(r.id));
      newReqs.forEach((r) => liveIdsRef.current.add(r.id));
      return [...newReqs, ...prev];
    });
  }, [liveRequests]);

  const loadMore = async () => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await fetch(`/api/endpoints/${endpointId}/requests?cursor=${cursor}&limit=20`);
      if (res.ok) {
        const data = await res.json();
        setRequests((prev) => [...prev, ...data.data]);
        setCursor(data.nextCursor);
        setHasMore(data.hasMore);
        data.data.forEach((r: RequestItem) => liveIdsRef.current.add(r.id));
      }
    } finally {
      setLoadingMore(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-sm text-muted-foreground">No requests yet. Send a webhook to your endpoint URL to see it here.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {requests.map((req) => (
        <RequestItemRow
          key={req.id}
          request={req}
          isSelected={selectedId === req.id}
          onClick={() => onSelect(req.id)}
        />
      ))}
      {hasMore && (
        <div className="p-3 flex justify-center">
          <Button variant="outline" size="sm" onClick={loadMore} disabled={loadingMore}>
            {loadingMore ? (
              <>
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                Loading...
              </>
            ) : (
              "Load more"
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
