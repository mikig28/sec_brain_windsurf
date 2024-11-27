import { sortLinksByPlatform } from '../lib/linkUtils';
import { Twitter, Linkedin, Facebook, Github, Youtube, Link2, MessageCircle, FileText } from 'lucide-react';

const platformIcons = {
  twitter: Twitter,
  linkedin: Linkedin,
  facebook: Facebook,
  github: Github,
  youtube: Youtube,
  medium: FileText,
  reddit: MessageCircle,
  other: Link2,
} as const;

export default function LinksPage({ links }: { links: string[] }) {
  const sortedLinks = sortLinksByPlatform(links);

  return (
    <div className="space-y-8">
      {Object.entries(sortedLinks).map(([platform, links]) => {
        if (links.length === 0) return null;
        const Icon = platformIcons[platform as keyof typeof platformIcons];
        
        return (
          <section key={platform} className="border rounded-lg p-4">
            <h2 className="text-xl font-bold capitalize mb-4 flex items-center gap-2">
              <Icon className="w-5 h-5" />
              {platform}
            </h2>
            <ul className="space-y-2">
              {links.map((link, i) => (
                <li key={i} className="flex items-center gap-2">
                  <a 
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer" 
                    className="text-blue-600 hover:underline flex-grow truncate"
                  >
                    {link.url}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
} 