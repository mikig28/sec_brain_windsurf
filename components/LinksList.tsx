'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function LinksList() {
  const [links, setLinks] = useState<Database['public']['Tables']['links']['Row'][]>([])

  useEffect(() => {
    async function fetchLinks() {
      const { data, error } = await supabase
        .from('links')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching links:', error)
      } else {
        setLinks(data || [])
      }
    }

    fetchLinks()
    
    // Subscribe to changes
    const channel = supabase
      .channel('links_changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'links' 
      }, () => {
        fetchLinks()
      })
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [])

  return (
    <div className="space-y-4">
      {links.map(link => (
        <div key={link.id} className="p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow">
          <a 
            href={link.url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 hover:underline block"
          >
            <h3 className="font-medium">{link.title}</h3>
            <p className="text-sm text-gray-600 mt-1 truncate">{link.url}</p>
          </a>
          <p className="text-sm text-gray-500 mt-2">
            {new Date(link.created_at).toLocaleString()}
          </p>
        </div>
      ))}
    </div>
  )
} 