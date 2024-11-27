import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function getVideos() {
  const { data: videos, error } = await supabase
    .from('videos')
    .select('*')
    .order('timestamp', { ascending: false })

  if (error) {
    console.error('Error fetching videos:', error)
    return []
  }

  return videos || []
} 