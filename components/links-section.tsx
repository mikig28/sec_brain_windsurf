"use client";

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { createClient } from '@supabase/supabase-js';
import { ExternalLink } from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Link {
  id: string;
  url: string;
  title?: string;
  domain: string;
  timestamp: string;
  category?: string;
}

export function LinksSection() {
  const [links, setLinks] = useState<Link[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('all');

  useEffect(() => {
    const fetchLinks = async () => {
      const { data } = await supabase
        .from('links')
        .select('*')
        .order('timestamp', { ascending: false });
      
      if (data) {
        const processedLinks = data.map(link => ({
          ...link,
          domain: new URL(link.url).hostname.replace('www.', '')
        }));
        setLinks(processedLinks);
      }
    };

    fetchLinks();
  }, []);

  const categories = ['all', ...new Set(links.map(link => link.category || 'uncategorized'))];
  const filteredLinks = activeCategory === 'all' 
    ? links 
    : links.filter(link => (link.category || 'uncategorized') === activeCategory);

  return (
    <div className="space-y-4 p-4">
      <div className="flex gap-2 overflow-x-auto pb-2">
        {categories.map(category => (
          <button
            key={category}
            onClick={() => setActiveCategory(category)}
            className={`px-3 py-1 rounded-full text-sm whitespace-nowrap
              ${activeCategory === category 
                ? 'bg-black text-white' 
                : 'bg-gray-100 hover:bg-gray-200'}`}
          >
            {category.charAt(0).toUpperCase() + category.slice(1)}
          </button>
        ))}
      </div>

      <div className="grid gap-3">
        {filteredLinks.map((link) => (
          <a
            key={link.id}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-3 rounded-lg border hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-2">
              <img 
                src={`https://www.google.com/s2/favicons?domain=${link.domain}&sz=32`}
                alt=""
                className="w-4 h-4"
              />
              <span className="font-medium">{link.title || link.url}</span>
              <ExternalLink className="w-4 h-4 ml-auto text-gray-400" />
            </div>
            <div className="mt-1 text-sm text-gray-500 flex justify-between">
              <span>{link.domain}</span>
              <span>{format(new Date(link.timestamp), 'dd/MM/yyyy')}</span>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
} 