'use client'

import React, { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { format } from 'date-fns'
import { X } from 'lucide-react'
import Link from "next/link"
import { extractYouTubeId } from "@/lib/youtube"
import type { Database } from '@/types/database.types'

type RealtimePayload<T> = {
  new: T
  old: T | null
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
}

const supabase = createClientComponentClient<Database>()

interface Message {
  id: string
  title: string
  content: string
  type: 'thought' | 'image' | 'video'
  created_at: string
  updated_at: string
  source: string
  status: string
  image_url?: string
  video_id?: string
  url?: string
  tags?: string[]
}

export default function WhatsAppMessages() {
  const [messages, setMessages] = useState<Message[]>([])

  useEffect(() => {
    fetchMessages()

    const entriesChannel = supabase
      .channel('entries-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'entries',
          filter: "source=eq.whatsapp"
        },
        (payload: RealtimePayload<Message>) => {
          console.log('New entry received:', payload.new)
          setMessages(prev => [payload.new, ...prev])
        }
      )
      .subscribe()

    const videosChannel = supabase
      .channel('videos-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'videos',
          filter: "type=eq.image"
        },
        (payload: RealtimePayload<Database['public']['Tables']['videos']['Row']>) => {
          console.log('New video/image received:', payload.new)
          const newMessage: Message = {
            id: payload.new.video_id,
            title: 'WhatsApp Image/Video',
            content: '',
            type: payload.new.type as 'video' | 'image' || 'video',
            created_at: payload.new.timestamp,
            updated_at: payload.new.timestamp,
            source: 'whatsapp',
            status: 'active',
            image_url: payload.new.image_url,
            video_id: payload.new.video_id,
            url: payload.new.url,
            tags: []
          }
          setMessages(prev => [newMessage, ...prev])
        }
      )
      .subscribe()

    return () => {
      entriesChannel.unsubscribe()
      videosChannel.unsubscribe()
    }
  }, [])

  async function fetchMessages() {
    console.log('Fetching messages...')
    const [entriesResult, videosResult] = await Promise.all([
      supabase
        .from('entries')
        .select('*')
        .eq('source', 'whatsapp')
        .order('created_at', { ascending: false }),
      supabase
        .from('videos')
        .select('*')
        .order('timestamp', { ascending: false })
    ])

    const entries = entriesResult.data || []
    const videos = (videosResult.data || []).map((video: Database['public']['Tables']['videos']['Row']) => ({
      id: video.video_id,
      title: 'WhatsApp Image/Video',
      content: '',
      type: video.type as 'video' | 'image' || 'video',
      created_at: video.timestamp,
      updated_at: video.timestamp,
      source: 'whatsapp',
      status: 'active',
      image_url: video.image_url,
      video_id: video.video_id,
      url: video.url
    }))

    const allMessages = [...entries, ...videos].sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )

    setMessages(allMessages)
  }

  function renderMessageContent(message: Message) {
    if (message.type === 'image' && message.image_url) {
      return (
        <div className="max-w-full">
          <img 
            src={message.image_url} 
            alt="WhatsApp Image" 
            className="max-w-full h-auto rounded-lg"
            onError={(e) => {
              console.error('Image failed to load:', message.image_url);
              e.currentTarget.style.display = 'none';
            }}
          />
        </div>
      );
    }

    // Regular message with URLs
    const urlRegex = /https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g;
    const parts = message.content.split(urlRegex);
    const urls = message.content.match(urlRegex) || [];
    
    return (
      <div className="text-[#111B21] dark:text-white break-words whitespace-pre-wrap">
        {parts.map((part, index) => (
          <React.Fragment key={index}>
            {part}
            {urls[index] && (
              <a 
                href={urls[index]}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                {urls[index]}
              </a>
            )}
          </React.Fragment>
        ))}
      </div>
    );
  }

  async function deleteMessage(id: string) {
    const { error } = await supabase
      .from('entries')
      .delete()
      .eq('id', id)

    if (!error) {
      setMessages(prev => prev.filter(msg => msg.id !== id))
    }
  }

  return (
    <div className="flex flex-col gap-2 p-4">
      {messages.map((message) => (
        <div
          key={message.id}
          className="max-w-[80%] ml-auto bg-[#D9FDD3] dark:bg-[#005C4B] p-2 rounded-lg shadow relative group"
        >
          <button
            onClick={() => deleteMessage(message.id)}
            className="absolute -left-6 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="w-4 h-4 text-gray-500 hover:text-red-500" />
          </button>

          {renderMessageContent(message)}

          <div className="text-xs text-gray-500 mt-1">
            {format(new Date(message.created_at), 'HH:mm')}
          </div>
        </div>
      ))}
    </div>
  )
} 