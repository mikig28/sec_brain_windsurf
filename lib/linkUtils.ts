type Platform = 'twitter' | 'linkedin' | 'facebook' | 'reddit' | 'youtube' | 'github' | 'medium' | 'other';

interface SortedLink {
  url: string;
  platform: Platform;
  title?: string;
}

export function detectPlatform(url: string): Platform {
  try {
    // Validate URL and get hostname
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    const fullUrl = url.toLowerCase();
    
    // Special case for x.com short URLs
    if (hostname === 'x.com' || hostname.includes('twitter.com') || 
        hostname.startsWith('t.co') || hostname.includes('x.com')) {
      return 'twitter';
    }
    
    if (hostname.includes('linkedin.com')) return 'linkedin';
    if (hostname.includes('facebook.com') || hostname.includes('fb.com')) return 'facebook';
    if (hostname.includes('reddit.com')) return 'reddit';
    if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) return 'youtube';
    if (hostname.includes('github.com')) return 'github';
    if (hostname.includes('medium.com')) return 'medium';
    
    return 'other';
  } catch (e) {
    // If the URL is malformed, try one more time with https:// prefix
    try {
      const urlWithHttps = new URL(`https://${url}`);
      return detectPlatform(urlWithHttps.href);
    } catch {
      return 'other';
    }
  }
}

export function sortLinksByPlatform(links: string[]): Record<Platform, SortedLink[]> {
  const sorted: Record<Platform, SortedLink[]> = {
    twitter: [],
    linkedin: [],
    facebook: [],
    reddit: [],
    youtube: [],
    github: [],
    medium: [],
    other: []
  };

  links.forEach(url => {
    if (!url || typeof url !== 'string') return;
    
    // Handle x.com URLs specifically
    let cleanUrl = url.trim();
    if (cleanUrl.includes('x.com/') && !cleanUrl.startsWith('http')) {
      cleanUrl = `https://${cleanUrl}`;
    }

    const platform = detectPlatform(cleanUrl);
    sorted[platform].push({ url: cleanUrl, platform });
  });

  return sorted;
} 