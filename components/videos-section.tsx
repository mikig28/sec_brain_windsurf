"use client";

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/types/database.types';
import { VideoSummaryDialog } from "@/components/video-summary-dialog";
import { BookOpen, X } from 'lucide-react';
import { Button } from "@/components/ui/button";

const supabase = createClientComponentClient<Database>();

interface Video {
  video_id: string;
  url: string;
  timestamp: string;
  type?: 'video' | 'image';
  image_url?: string;
  title?: string;
  scheduled?: boolean;
}

interface RealtimePayload {
  new: Video;
  old: Video | null;
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
}

interface VideoMission {
  video_id: string;
  watched: boolean;
}

function getVideoIdFromUrl(url: string): string {
  try {
    if (!url) return '';
    // Handle different YouTube URL formats
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
      /youtube\.com\/embed\/([^&\n?#]+)/,
      /youtube\.com\/v\/([^&\n?#]+)/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return url; // Return the original if it's already a video ID
  } catch (error) {
    console.error('Error extracting video ID:', error);
    return '';
  }
}

export function VideosSection() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [summaryVideoId, setSummaryVideoId] = useState<string | null>(null);
  const [summaryVideoTitle, setSummaryVideoTitle] = useState<string>("");
  const [watchedVideos, setWatchedVideos] = useState<Set<string>>(new Set());

  const loadWatchedStatus = async () => {
    const { data, error } = await supabase
      .from('video_missions')
      .select('video_id')
      .eq('watched', true);

    if (error) {
      console.error('Error loading watched status:', error);
      return;
    }

    if (data) {
      setWatchedVideos(new Set(data.map((m: { video_id: string }) => m.video_id)));
    }
  };

  useEffect(() => {
    fetchVideos();
    loadWatchedStatus();
    
    // Subscribe to changes
    const channel = supabase
      .channel('videos_changes')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'videos' },
        (payload: RealtimePayload) => {
          console.log('New video added:', payload.new);
          setVideos(prev => [payload.new, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchVideos = async () => {
    console.log('Fetching videos...');
    const { data, error } = await supabase
      .from('videos')
      .select('*')
      .order('timestamp', { ascending: false });
    
    if (error) {
      console.error('Error fetching videos:', error);
      return;
    }
    
    console.log('Fetched videos:', data);
    if (data) {
      // Log each video's details with proper typing
      data.forEach((video: Video) => {
        console.log('Video:', {
          id: video.video_id,
          url: video.url,
          type: video.type,
          title: video.title
        });
      });
      setVideos(data);
    }
  };

  const handleWatchedToggle = async (videoId: string) => {
    try {
      const isWatched = !watchedVideos.has(videoId);
      
      // Update database
      const { error } = await supabase
        .from('video_missions')
        .update({ watched: isWatched })
        .eq('video_id', videoId);

      if (error) {
        console.error('Error updating watched status:', error);
        return;
      }

      // Update local state
      setWatchedVideos(prev => {
        const newSet = new Set(prev);
        if (isWatched) {
          newSet.add(videoId);
        } else {
          newSet.delete(videoId);
        }
        return newSet;
      });
    } catch (error) {
      console.error('Error toggling watched status:', error);
    }
  };

  const handleDeleteVideo = async (videoId: string) => {
    try {
      // Delete from video_missions first (due to foreign key constraint)
      const { error: missionsError } = await supabase
        .from('video_missions')
        .delete()
        .eq('video_id', videoId);

      if (missionsError) {
        console.error('Error deleting video missions:', missionsError);
        return;
      }

      // Then delete the video
      const { error: videoError } = await supabase
        .from('videos')
        .delete()
        .eq('video_id', videoId);

      if (videoError) {
        console.error('Error deleting video:', videoError);
        return;
      }

      // Update local state
      setVideos(prev => prev.filter(v => v.video_id !== videoId));
    } catch (error) {
      console.error('Error deleting video:', error);
    }
  };

  if (videos.length === 0) {
    return <div className="p-4 text-gray-500">Loading videos...</div>;
  }

  return (
    <div className="space-y-4 p-4">
      {videos.map((video) => (
        <div key={video.video_id} className="rounded-lg overflow-hidden border p-4">
          <div className="relative group">
            {video.type === 'image' ? (
              <img
                src={video.image_url}
                alt="Chat image"
                className="w-full h-auto object-contain max-h-[315px]"
              />
            ) : (
              <>
                <iframe
                  width="100%"
                  height="315"
                  src={`https://www.youtube.com/embed/${video.video_id}`}
                  title="YouTube video"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="rounded-lg"
                />
                <div className="absolute top-2 right-2 flex items-center gap-2 bg-black/30 backdrop-blur-sm p-2 rounded-lg">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="bg-white/90 hover:bg-white"
                    onClick={() => {
                      setSummaryVideoId(video.video_id);
                      setSummaryVideoTitle(video.title || `Video ${video.video_id}`);
                    }}
                  >
                    <BookOpen className="h-4 w-4" />
                  </Button>
                  <div 
                    className="bg-white/90 rounded-full p-1.5 cursor-pointer hover:bg-white"
                    onClick={() => handleWatchedToggle(video.video_id)}
                  >
                    <input
                      type="checkbox"
                      checked={watchedVideos.has(video.video_id)}
                      onChange={() => {}}
                      className="h-4 w-4 cursor-pointer accent-blue-600"
                    />
                  </div>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="bg-red-500 hover:bg-red-600"
                    onClick={() => handleDeleteVideo(video.video_id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </>
            )}
          </div>
          <div className="text-sm text-gray-500 mt-2">
            Added: {format(new Date(video.timestamp), 'dd/MM/yyyy HH:mm')}
          </div>
        </div>
      ))}

      <VideoSummaryDialog
        isOpen={!!summaryVideoId}
        onClose={() => setSummaryVideoId(null)}
        videoId={summaryVideoId!}
        videoTitle={summaryVideoTitle}
      />
    </div>
  );
} 