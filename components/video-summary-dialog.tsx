"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface VideoSummaryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  videoId: string;
  videoTitle: string;
}

export function VideoSummaryDialog({ isOpen, onClose, videoId, videoTitle }: VideoSummaryDialogProps) {
  const [summary, setSummary] = React.useState<string>("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string>("");

  React.useEffect(() => {
    if (isOpen && videoId) {
      setLoading(true);
      setError("");
      
      fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId })
      })
        .then(res => res.json())
        .then(data => {
          if (data.error) throw new Error(data.error);
          setSummary(data.summary);
        })
        .catch(err => {
          setError(err.message || 'Failed to get summary');
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [isOpen, videoId]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Summary of: {videoTitle}</DialogTitle>
        </DialogHeader>
        <div className="mt-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Generating summary...</span>
            </div>
          ) : error ? (
            <div className="text-red-500 py-4">{error}</div>
          ) : (
            <div className="prose max-w-none">
              {summary.split('\n').map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
} 