import puppeteer, { Browser, Page } from 'puppeteer'
import { createClient } from '@supabase/supabase-js'
import path from 'path'
import { Buffer } from 'buffer';
import { extractYouTubeId } from '@/lib/youtube';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

let browser: Browser | null = null
let page: Page | null = null

export async function setupWhatsAppPuppeteer() {
  if (browser) {
    console.log('WhatsApp already running...')
    return
  }

  console.log('Starting WhatsApp Puppeteer...')
  const userDataDir = path.resolve(process.cwd(), 'whatsapp-data')
  
  try {
    browser = await puppeteer.launch({
      headless: false,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--window-size=1920,1080',
        `--user-data-dir=${userDataDir}`,
        '--disable-gpu',
        '--disable-features=site-per-process'
      ],
      defaultViewport: null
    })

    page = await browser.newPage()
    await page.setViewport({ width: 1920, height: 1080 })
    
    page.setDefaultTimeout(60000)
    
    page.on('error', err => {
      console.error('Page error:', err)
    })
    
    page.on('pageerror', err => {
      console.error('Page error:', err)
    })

    await connectToWhatsApp(page)
    await startMessageMonitoring(page)
    
  } catch (error) {
    console.error('Error in WhatsApp setup:', error)
    await cleanup()
    throw error
  }
}

async function connectToWhatsApp(page: Page) {
  console.log('Connecting to WhatsApp Web...')
  
  try {
    await page.goto('https://web.whatsapp.com', {
      waitUntil: 'networkidle0',
      timeout: 60000
    })

    await page.waitForFunction(
      () => document.querySelector('#app') !== null,
      { timeout: 30000 }
    )

    console.log('WhatsApp Web loaded, waiting for initial state...')

    const initialState = await Promise.race([
      page.waitForSelector('div[data-testid="qrcode"]').then(() => 'QR_CODE'),
      page.waitForSelector('div[data-testid="default-user"]').then(() => 'CHAT_LIST'),
      page.waitForSelector('div[data-testid="chat"]').then(() => 'CHAT_LIST')
    ]).catch(() => 'UNKNOWN')

    console.log('Initial state:', initialState)

    if (initialState === 'QR_CODE') {
      console.log('QR Code detected. Please scan with your phone...')
      await Promise.race([
        page.waitForSelector('div[data-testid="default-user"]', { timeout: 120000 }),
        page.waitForSelector('div[data-testid="chat"]', { timeout: 120000 })
      ])
    }

    console.log('Chat list detected. Checking for open chat...')

    const chatSelectors = [
      'div[data-testid="conversation-panel-wrapper"]',
      'div[data-testid="conversation-panel"]',
      'div[data-testid="message-list"]',
      'div[role="application"]'
    ]

    let chatDetected = false
    for (let i = 0; i < 15 && !chatDetected; i++) {
      console.log(`Attempt ${i + 1} to detect open chat...`)
      
      for (const selector of chatSelectors) {
        try {
          const element = await page.$(selector)
          if (element) {
            console.log(`Chat detected with selector: ${selector}`)
            chatDetected = true
            break
          }
        } catch (err) {
          continue
        }
      }

      if (!chatDetected) {
        const messages = await page.$$('div[data-testid="msg-container"]')
        if (messages.length > 0) {
          console.log('Messages detected directly')
          chatDetected = true
          break
        }

        console.log('Waiting for chat to be detected...')
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    }

    if (!chatDetected) {
      throw new Error('Could not detect open chat after waiting')
    }

    console.log('Chat detected successfully')
    await new Promise(resolve => setTimeout(resolve, 2000))

  } catch (error: any) {
    console.error('Detailed error in connectToWhatsApp:', {
      message: error.message,
      stack: error.stack
    })
    throw new Error('Failed to connect to WhatsApp: ' + (error.message || 'Unknown error'))
  }
}

interface WhatsAppMessage {
  content: string;
  id: string;
  sender: string;
  imageUrl?: string;
}

async function startMessageMonitoring(page: Page) {
  console.log('Starting message monitoring...')
  let isMonitoring = true
  
  const initialMessages = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('div[data-id]'))
      .map(el => el.getAttribute('data-id'))
      .filter(id => id !== null) as string[]
  })

  const processedIds = new Set(initialMessages)
  
  async function checkNewMessages() {
    if (!page || !isMonitoring) return

    try {
      if (!page.isClosed()) {
        const messages = await page.evaluate((processedIdsArray) => {
          const processedSet = new Set(processedIdsArray)
          
          return Array.from(document.querySelectorAll('div[data-id]'))
            .filter(el => {
              const id = el.getAttribute('data-id')
              return id && !processedSet.has(id)
            })
            .map(el => {
              // Check for image
              const imgElement = el.querySelector('img[src^="blob:"]') as HTMLImageElement;
              const imageUrl = imgElement?.src || null;
              
              // Check for text content
              const textContent = el.querySelector('span.selectable-text')?.textContent || 
                                el.querySelector('div.selectable-text')?.textContent || 
                                (imageUrl ? 'Image message' : el.textContent) || '';
              
              return {
                content: textContent.trim(),
                id: el.getAttribute('data-id') || '',
                sender: el.getAttribute('data-pre-plain-text')?.split(']')[1]?.trim() || 'Unknown',
                imageUrl
              }
            })
            .filter(msg => 
              (msg.content || msg.imageUrl) && 
              !msg.content.includes('This message was deleted') &&
              !msg.content.includes('forwardedForwarded')
            )
        }, Array.from(processedIds)) as WhatsAppMessage[]

        for (const message of messages) {
          if (!processedIds.has(message.id)) {
            console.log('Processing new message:', message.content)

            // Check for YouTube links first
            const URLs = message.content.match(/(https?:\/\/[^\s]+)/g);
            if (URLs) {
              for (const url of URLs) {
                const youtubeId = extractYouTubeId(url);
                if (youtubeId) {
                  console.log('Found YouTube video:', youtubeId);
                  
                  // Check if video already exists
                  const { data: existingVideo } = await supabase
                    .from('videos')
                    .select('id')
                    .eq('video_id', youtubeId)
                    .maybeSingle();

                  if (existingVideo) {
                    console.log('Video already exists, skipping:', youtubeId);
                    continue;
                  }

                  // Save new video
                  const { data, error } = await supabase
                    .from('videos')
                    .insert({ 
                      url,
                      video_id: youtubeId,
                      timestamp: new Date().toISOString()
                    })
                    .select()
                    .single();

                  if (error) {
                    console.error('Error saving video:', error);
                  } else {
                    console.log('Successfully saved new video:', data);
                  }
                }
              }
            }

            // Continue with existing image and message handling
            if (message.imageUrl) {
              try {
                // שיפור זיהוי התמונה
                const imageData = await page.evaluate(async (messageId) => {
                  const messageEl = document.querySelector(`[data-id="${messageId}"]`);
                  if (!messageEl) return null;

                  // מחפשים את התמונה בכל הדרכים האפשריות
                  const imgSelectors = [
                    'img[src^="blob:"]',
                    'img[src^="data:"]',
                    'img[data-testid="image-thumb"]',
                    'img[data-testid="image"]',
                    'img.media-image'
                  ];

                  let img: HTMLImageElement | null = null;
                  for (const selector of imgSelectors) {
                    img = messageEl.querySelector(selector) as HTMLImageElement;
                    if (img) break;
                  }

                  if (!img) {
                    console.log('No image found with selectors:', imgSelectors);
                    return null;
                  }

                  // המתנה לטעינת התמונה
                  if (!img.complete) {
                    await new Promise((resolve) => {
                      img!.onload = resolve;
                      img!.onerror = resolve;
                    });
                  }

                  try {
                    // יצירת canvas ושמירת התמונה
                    const canvas = document.createElement('canvas');
                    canvas.width = img.naturalWidth || img.width;
                    canvas.height = img.naturalHeight || img.height;
                    
                    const ctx = canvas.getContext('2d');
                    if (!ctx) {
                      console.error('Failed to get canvas context');
                      return null;
                    }

                    ctx.drawImage(img, 0, 0);
                    return canvas.toDataURL('image/jpeg', 0.9);
                  } catch (err) {
                    console.error('Error converting image to data URL:', err);
                    return null;
                  }
                }, message.id);

                if (!imageData) {
                  console.error('Failed to get image data');
                  return;
                }

                // המשך הקוד הקיים...
                const base64Data = imageData.split(',')[1];
                const imageBuffer = Buffer.from(base64Data, 'base64');
                const filename = `${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;

                const { data: uploadData, error: uploadError } = await supabase.storage
                  .from('chat-images')
                  .upload(filename, imageBuffer, {
                    contentType: 'image/jpeg',
                    cacheControl: '3600'
                  });

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                  .from('chat-images')
                  .getPublicUrl(filename);

                // שמירה בטבלת videos
                await supabase.from('videos').insert([{
                  video_id: filename,
                  url: publicUrl,
                  timestamp: new Date().toISOString(),
                  type: 'image',
                  image_url: publicUrl
                }]);

                console.log('Successfully stored image:', publicUrl);
              } catch (error) {
                console.error('Error processing image:', error);
              }
            } else {
              // Handle regular message (existing logic)
              const { data: existing } = await supabase
                .from('entries')
                .select('id')
                .eq('content', message.content)
                .eq('source', 'whatsapp')
                .maybeSingle();

              if (!existing) {
                const { error: insertError } = await supabase.from('entries').insert([{
                  title: message.sender ? `Message from ${message.sender}` : 'WhatsApp Message',
                  content: message.content,
                  type: 'thought',
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                  source: 'whatsapp',
                  status: 'active',
                  tags: []
                }]);

                if (insertError) {
                  console.error('Error storing message:', insertError);
                }
              }
            }
            
            processedIds.add(message.id);
          }
        }
      }
    } catch (error: any) {
      console.error('Error in checkNewMessages:', error)
      if (error.message?.includes('detached Frame')) {
        await setupWhatsAppPuppeteer()
      }
    }
  }

  await checkNewMessages()
  const intervalId = setInterval(checkNewMessages, 2000)
  
  return () => {
    isMonitoring = false
    clearInterval(intervalId)
  }
}

async function cleanup() {
  try {
    if (page && !page.isClosed()) {
      await page.close().catch(err => console.error('Error closing page:', err))
    }
    if (browser && browser.isConnected()) {
      await browser.close().catch(err => console.error('Error closing browser:', err))
    }
  } catch (error) {
    console.error('Error in cleanup:', error)
  } finally {
    page = null
    browser = null
  }
}

export async function stopWhatsAppPuppeteer() {
  await cleanup()
  console.log('WhatsApp monitoring stopped')
} 