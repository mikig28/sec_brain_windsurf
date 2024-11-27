import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { extractYouTubeId } from '@/lib/youtube';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const URL_REGEX = /(https?:\/\/[^\s]+)/g;

export async function GET() {
  const { data, error } = await supabase
    .from('entries')
    .select('content, created_at')
    .eq('type', 'thought')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data.map(entry => ({
    content: entry.content,
    timestamp: entry.created_at
  })));
}

export async function POST(req: Request) {
  const { content } = await req.json();
  
  // Save message
  const { error: messageError } = await supabase
    .from('messages')
    .insert({ content });

  if (messageError) {
    return NextResponse.json({ error: messageError.message }, { status: 500 });
  }

  // Extract URLs
  const urls = content.match(URL_REGEX);
  if (urls) {
    for (const url of urls) {
      // Check if it's a YouTube link
      const youtubeId = extractYouTubeId(url);
      if (youtubeId) {
        await supabase
          .from('videos')
          .insert({ 
            url,
            video_id: youtubeId
          });
      } else {
        // Save as regular link
        await supabase
          .from('links')
          .insert({ url });
      }
    }
  }

  return NextResponse.json({ success: true });
} 