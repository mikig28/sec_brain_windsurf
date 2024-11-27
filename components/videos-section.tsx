"use client";

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Video {
  video_id: string;
  url: string;
  timestamp: string;
  type?: 'video' | 'image';
  image_url?: string;
}

export function VideosSection() {
  const [videos, setVideos] = useState<Video[]>([]);

  useEffect(() => {
    // Initial fetch
    fetchVideos();

    // Subscribe to changes
    const channel = supabase
      .channel('videos_changes')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'videos' },
        (payload) => {
          console.log('New video added:', payload.new);
          setVideos(prev => [payload.new as Video, ...prev]);
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
    if (data) setVideos(data);
  };

  if (videos.length === 0) {
    return <div className="p-4 text-gray-500">Loading videos...</div>;
  }

  return (
    <div className="space-y-4 p-4">
      {videos.map((video) => (
        <div key={video.video_id} className="rounded-lg overflow-hidden border p-4">
          {video.type === 'image' ? (
            <img
              src={video.image_url}
              alt="Chat image"
              className="w-full h-auto object-contain max-h-[315px]"
            />
          ) : (
            <iframe
              width="100%"
              height="315"
              src={`https://www.youtube.com/embed/${video.video_id}`}
              title="YouTube video"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          )}
          <div className="text-sm text-gray-500 mt-2">
            Added: {format(new Date(video.timestamp), 'dd/MM/yyyy HH:mm')}
          </div>
        </div>
      ))}
    </div>
  );
} 