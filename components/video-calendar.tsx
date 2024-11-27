"use client";

import * as React from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
import { CalendarIcon, BookOpen } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { VideoSummaryDialog } from "@/components/video-summary-dialog";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const colorOptions = [
  "#ef4444", // red
  "#f97316", // orange
  "#eab308", // yellow
  "#22c55e", // green
  "#3b82f6", // blue
  "#6366f1", // indigo
  "#d946ef", // purple
  "#ec4899"  // pink
];

type Mission = {
  date: Date;
  description: string;
  color: string;
  videoId?: string;
  videoUrl?: string;
  watched: boolean;
  id: string;
}

type VideoData = {
  title: string;
  url: string;
  video_id: string;
}

function getYouTubeThumbnail(videoId: string) {
  return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
}

function getYouTubeUrl(videoId: string) {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

// Add interface for database response
interface VideoMissionRow {
  id: string;
  video_id: string;
  date: string;
  watched: boolean;
  videos: {
    title: string;
    url: string;
    video_id: string;
  };
}

// Add interface for database mission
interface DbMission {
  id: string;
  video_id: string;
  date: string;
  watched: boolean;
}

export default function VideoCalendar() {
  const [selectedDate, setSelectedDate] = React.useState<Date>(new Date());
  const [missions, setMissions] = React.useState<Mission[]>([]);
  const [newMission, setNewMission] = React.useState("");
  const [newMissionColor, setNewMissionColor] = React.useState(colorOptions[0]);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = React.useState(false);
  const [videos, setVideos] = React.useState<any[]>([]);
  const [summaryVideoId, setSummaryVideoId] = React.useState<string | null>(null);
  const [summaryVideoTitle, setSummaryVideoTitle] = React.useState<string>("");

  // Fetch videos from Supabase
  React.useEffect(() => {
    const fetchVideos = async () => {
      try {
        console.log('Starting to fetch videos...');
        console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
        
        // First, let's see all videos
        const { data: allVideos, error: allVideosError } = await supabase
          .from('videos')
          .select('*');

        if (allVideosError) {
          console.error('Error fetching all videos:', allVideosError);
          return;
        }

        console.log('All videos in database:', allVideos?.length || 0, 'videos found');
        console.log('Sample video:', allVideos?.[0]);

        // Now get unscheduled videos
        const { data, error } = await supabase
          .from('videos')
          .select('*')
          .is('scheduled', null);  // Only get unscheduled videos
        
        if (error) {
          console.error('Error fetching unscheduled videos:', error);
          return;
        }

        console.log('Found unscheduled videos:', data?.length || 0, 'videos found');
        if (data && data.length > 0) {
          console.log('Sample unscheduled video:', data[0]);
          setVideos(data);
        } else {
          console.log('No unscheduled videos found. Fetching all videos instead...');
          setVideos(allVideos || []);
        }
      } catch (error) {
        console.error('Unexpected error during video fetch:', error);
      }
    }
    
    fetchVideos();
  }, []);

  // Update checkUnwatchedVideos function to work with database
  const checkUnwatchedVideos = async () => {
    try {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      // Get unwatched missions older than 3 days
      const { data: oldMissions, error: fetchError } = await supabase
        .from('video_missions')
        .select('*')
        .eq('watched', false)
        .lt('date', threeDaysAgo.toISOString());

      if (fetchError) {
        console.error('Error fetching old missions:', fetchError);
        return;
      }

      if (oldMissions && oldMissions.length > 0) {
        console.log('Found unwatched missions to reschedule:', oldMissions);

        // Create new dates for rescheduling
        const today = new Date();
        const next7Days = Array.from({length: 7}, (_, i) => {
          const date = new Date();
          date.setDate(today.getDate() + i);
          return date;
        });

        // Create new missions for the rescheduled videos
        const rescheduledMissions = oldMissions.map((mission, index) => ({
          id: crypto.randomUUID(),
          video_id: mission.video_id,
          date: next7Days[index % 7].toISOString(),
          watched: false
        }));

        // Delete old missions
        const { error: deleteError } = await supabase
          .from('video_missions')
          .delete()
          .in('id', oldMissions.map(m => m.id));

        if (deleteError) {
          console.error('Error deleting old missions:', deleteError);
          return;
        }

        // Insert new missions
        const { error: insertError } = await supabase
          .from('video_missions')
          .insert(rescheduledMissions);

        if (insertError) {
          console.error('Error inserting rescheduled missions:', insertError);
          return;
        }

        // Reload missions to update the UI
        await loadMissions();
      }
    } catch (error) {
      console.error('Error in checkUnwatchedVideos:', error);
    }
  };

  // Update useEffect to call checkUnwatchedVideos
  React.useEffect(() => {
    // Check immediately on mount
    checkUnwatchedVideos();

    // Then check every hour
    const interval = setInterval(checkUnwatchedVideos, 60 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []); // Remove missions dependency since we're using database

  // Update loadMissions function to properly handle video data
  const loadMissions = async () => {
    try {
      // First get all videos to have their data
      const { data: videosData, error: videosError } = await supabase
        .from('videos')
        .select('*');

      if (videosError) {
        console.error('Error loading videos:', videosError);
        return;
      }

      // Create a map of video data for quick lookup
      const videoMap = new Map(videosData.map(v => [v.video_id, v]));

      // Now get all missions
      const { data: missionsData, error: missionsError } = await supabase
        .from('video_missions')
        .select('*')
        .order('date', { ascending: true });

      if (missionsError) {
        console.error('Error loading missions:', missionsError);
        return;
      }

      if (missionsData) {
        console.log('Loaded missions:', missionsData);
        const formattedMissions: Mission[] = missionsData.map(mission => {
          const video = videoMap.get(mission.video_id);
          return {
            id: mission.id,
            date: new Date(mission.date),
            description: video?.title || 'YouTube Video',
            videoId: mission.video_id,
            videoUrl: getYouTubeUrl(mission.video_id),
            watched: mission.watched,
            color: colorOptions[Math.floor(Math.random() * colorOptions.length)]
          };
        });

        console.log('Formatted missions:', formattedMissions);
        setMissions(formattedMissions);
      }
    } catch (error) {
      console.error('Error loading missions:', error);
    }
  };

  // Load missions on component mount
  React.useEffect(() => {
    loadMissions();
  }, []);

  // Update scheduleVideos function
  const scheduleVideos = async () => {
    if (videos.length === 0) {
      alert("No videos available to schedule!");
      return;
    }

    try {
      // Get next 30 days
      const today = new Date();
      const next30Days = Array.from({length: 30}, (_, i) => {
        const date = new Date();
        date.setDate(today.getDate() + i);
        // Set time to start of day to avoid timezone issues
        date.setHours(0, 0, 0, 0);
        return date;
      });

      // Shuffle videos
      const shuffledVideos = [...videos].sort(() => Math.random() - 0.5);
      let videoIndex = 0;
      const dbMissions: DbMission[] = [];

      for (const date of next30Days) {
        // Format date for query
        const dateStr = date.toISOString().split('T')[0];
        
        // Get ALL missions for this date to ensure we don't exceed limit
        const { data: existingMissions, error } = await supabase
          .from('video_missions')
          .select('*')
          .eq('date::date', dateStr);

        if (error) {
          console.error('Error checking existing missions:', error);
          continue;
        }

        // Strictly enforce 2 videos per day limit
        if (existingMissions && existingMissions.length >= 2) {
          console.log(`Skipping date ${dateStr} - already has ${existingMissions.length} videos`);
          continue;
        }

        // Calculate remaining slots (max 2)
        const remainingSlots = 2 - (existingMissions?.length || 0);
        console.log(`Date ${dateStr} has ${remainingSlots} slots available`);

        // Only add videos if we have slots available
        if (remainingSlots > 0 && videoIndex < shuffledVideos.length) {
          // Add exactly remainingSlots number of videos
          for (let i = 0; i < remainingSlots && videoIndex < shuffledVideos.length; i++) {
            const video = shuffledVideos[videoIndex];
            dbMissions.push({
              id: crypto.randomUUID(),
              video_id: video.video_id,
              date: date.toISOString(),
              watched: false
            });
            videoIndex++;
          }
        }
      }

      if (dbMissions.length > 0) {
        console.log(`Scheduling ${dbMissions.length} new missions...`);

        // Insert missions in smaller batches to avoid potential issues
        const BATCH_SIZE = 10;
        for (let i = 0; i < dbMissions.length; i += BATCH_SIZE) {
          const batch = dbMissions.slice(i, i + BATCH_SIZE);
          const { error: missionsError } = await supabase
            .from('video_missions')
            .insert(batch);

          if (missionsError) {
            console.error('Error saving missions batch:', missionsError);
            return;
          }
        }

        // Mark videos as scheduled
        const scheduledVideoIds = dbMissions.map(m => m.video_id);
        const { error: updateError } = await supabase
          .from('videos')
          .update({ scheduled: true })
          .in('video_id', scheduledVideoIds);

        if (updateError) {
          console.error('Error updating video scheduled status:', updateError);
        }

        // Reload missions to ensure we have fresh data
        await loadMissions();
        
        console.log('Successfully scheduled all videos');
      }
    } catch (error) {
      console.error('Error scheduling videos:', error);
    }
  };

  // Update handleWatchedToggle to save to database
  const handleWatchedToggle = async (missionId: string, watched: boolean) => {
    try {
      // Update database first
      const { error } = await supabase
        .from('video_missions')
        .update({ watched })
        .eq('id', missionId);

      if (error) {
        console.error('Error updating mission watched status:', error);
        return;
      }

      // If successful, update local state
      setMissions(prev => prev.map(mission => 
        mission.id === missionId ? { ...mission, watched } : mission
      ));
    } catch (error) {
      console.error('Error toggling watched status:', error);
    }
  };

  const renderCalendar = () => {
    const monthStart = startOfMonth(selectedDate);
    const monthEnd = endOfMonth(selectedDate);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

    return (
      <div className="grid grid-cols-7 gap-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div key={day} className="text-center font-bold p-2">{day}</div>
        ))}
        {days.map((day, index) => (
          <div
            key={day.toString()}
            className={`border rounded-lg p-2 h-64 ${
              day.getMonth() !== selectedDate.getMonth() ? 'bg-gray-100' : ''
            }`}
            style={{ gridColumnStart: index === 0 ? day.getDay() + 1 : 'auto' }}
          >
            <div className="font-semibold mb-2">{format(day, 'd')}</div>
            <ScrollArea className="h-52">
              {missions
                .filter(m => m.date.toDateString() === day.toDateString())
                .map((mission, missionIndex) => (
                  <div key={missionIndex} className="relative mb-2">
                    <a 
                      href={getYouTubeUrl(mission.videoId!)}
                      target="_blank"
                      rel="noopener noreferrer" 
                      className="block rounded-lg overflow-hidden hover:opacity-90 transition-opacity cursor-pointer"
                      onClick={(e) => {
                        e.preventDefault();
                        window.open(getYouTubeUrl(mission.videoId!), '_blank');
                      }}
                    >
                      <div className="relative">
                        <img 
                          src={getYouTubeThumbnail(mission.videoId!)}
                          alt={mission.description}
                          className="w-full h-24 object-cover"
                        />
                        <div 
                          className="absolute bottom-0 left-0 right-0 p-2 text-xs text-white"
                          style={{ backgroundColor: mission.color }}
                        >
                          {mission.description}
                        </div>
                      </div>
                    </a>
                    <div className="absolute top-2 right-8 flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 bg-white hover:bg-gray-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSummaryVideoId(mission.videoId!);
                          setSummaryVideoTitle(mission.description);
                        }}
                      >
                        <BookOpen className="h-4 w-4" />
                      </Button>
                      <div 
                        className="absolute top-2 right-2 bg-white rounded-full p-1 cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleWatchedToggle(mission.id, !mission.watched);
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={mission.watched}
                          onChange={() => {}}
                          className="h-4 w-4 cursor-pointer"
                        />
                      </div>
                    </div>
                    {!mission.watched && new Date(mission.date) < new Date() && (
                      <div className="absolute top-2 left-2 bg-red-500 text-white text-xs px-2 py-1 rounded">
                        Unwatched
                      </div>
                    )}
                  </div>
                ))}
            </ScrollArea>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-4 p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">{format(selectedDate, 'MMMM yyyy')}</h2>
        <div className="space-x-2">
          <Button onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, 1))}>Previous</Button>
          <Button onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 1))}>Next</Button>
          <Button onClick={scheduleVideos} variant="secondary">Schedule Videos</Button>
        </div>
      </div>

      {renderCalendar()}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button className="mt-4">Add Mission</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Mission for {format(selectedDate, "MMMM d, yyyy")}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="mission-date" className="text-right">
                Date
              </Label>
              <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={`w-[240px] justify-start text-left font-normal col-span-3 ${!selectedDate && "text-muted-foreground"}`}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => {
                      setSelectedDate(date || new Date());
                      setIsDatePickerOpen(false);
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="mission" className="text-right">
                Mission
              </Label>
              <Input
                id="mission"
                value={newMission}
                onChange={(e) => setNewMission(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="color" className="text-right">
                Color
              </Label>
              <div className="flex gap-2 col-span-3">
                {colorOptions.map((color) => (
                  <button
                    key={color}
                    className={`w-6 h-6 rounded-full ${newMissionColor === color ? 'ring-2 ring-offset-2 ring-black' : ''}`}
                    style={{ backgroundColor: color }}
                    onClick={() => setNewMissionColor(color)}
                  />
                ))}
              </div>
            </div>
          </div>
          <Button onClick={() => {
            if (selectedDate && newMission) {
              setMissions([...missions, { date: selectedDate, description: newMission, color: newMissionColor, watched: false, id: crypto.randomUUID() }]);
              setNewMission("");
              setNewMissionColor(colorOptions[0]);
              setIsDialogOpen(false);
            }
          }}>Add Mission</Button>
        </DialogContent>
      </Dialog>

      <VideoSummaryDialog
        isOpen={!!summaryVideoId}
        onClose={() => setSummaryVideoId(null)}
        videoId={summaryVideoId!}
        videoTitle={summaryVideoTitle}
      />
    </div>
  );
} 