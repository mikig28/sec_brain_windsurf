import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database.types'
import puppeteer, { Browser, Page } from 'puppeteer'
import path from 'path'
import { Buffer } from 'buffer'
import { extractYouTubeId } from '@/lib/youtube'
import { detectPlatform } from '@/lib/linkUtils'
import { v4 as uuidv4 } from 'uuid'

const supabase = createServerComponentClient<Database>({ cookies })

let browser: Browser | null = null
let page: Page | null = null

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

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
      executablePath: process.env.CHROME_BIN || undefined,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--window-size=1920,1080',
        `--user-data-dir=${userDataDir}`,
        '--disable-gpu',
        '--disable-software-rasterizer',
        '--disable-features=site-per-process',
        '--disable-extensions',
        '--remote-debugging-port=9222'
      ],
      defaultViewport: null,
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

    // נחכה לכל אחד מהאלמנטים האפשריים
    const possibleElements = [
      '[data-testid="qrcode"]',
      '[data-testid="chatlist"]',
      '[data-testid="chat-list"]',
      '[data-testid="default-user"]',
      '.landing-wrapper',
      '.app-wrapper-web',
      '[data-testid="side"]', // סלקטור חדש
      'div[data-testid="cell-frame-container"]' // סלקטור של צ'אט בודד
    ]

    let detectedElement = null
    for (const selector of possibleElements) {
      try {
        const element = await page.waitForSelector(selector, { timeout: 5000 })
        if (element) {
          detectedElement = selector
          console.log(`Detected element: ${selector}`)
          break
        }
      } catch (err) {
        continue
      }
    }

    if (!detectedElement) {
      console.log('No initial elements detected, waiting for manual navigation...')
      await delay(10000) // תן למשתמש זמן לנווט ידנית
    }

    // בדיקה אם יש צ'אט פתוח
    console.log('Checking for open chat...')
    const chatSelectors = [
      '[data-testid="conversation-panel-wrapper"]',
      '[data-testid="conversation-panel"]',
      '[data-testid="message-list"]',
      '[data-testid="conversation-compose-box-input"]',
      '#main',
      '[data-testid="chat"]'
    ]

    let chatDetected = false
    for (let i = 0; i < 15 && !chatDetected; i++) {
      console.log(`Attempt ${i + 1} to detect open chat...`)
      
      await delay(2000) // המתנה ארוכה יותר בין ניסיונות
      
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
        try {
          // נסה לפתוח את הצ'אט הראשון א אין צ'אט פתוח
          const firstChat = await page.$('div[data-testid="cell-frame-container"]')
          if (firstChat) {
            console.log('Found chat in list, attempting to open...')
            await firstChat.click()
            await delay(3000)
            chatDetected = true
            break
          }
        } catch (err) {
          console.log('Error trying to open chat:', err)
        }
      }
    }

    if (!chatDetected) {
      console.log('Could not detect chat automatically. Please ensure a chat is open.')
      await delay(10000) // תן למשתמש זמן לפתוח צ'אט ידנית
    }

    console.log('Setup completed')
    
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
  imageUrl: string | null;
  type: string;
  urls?: string[];
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
              const imgElement = el.querySelector('img[src^="blob:"]') as HTMLImageElement
              const imageUrl = imgElement?.src || null
              
              // Get text content if any
              const textContent = el.querySelector('span.selectable-text')?.textContent || 
                                 el.querySelector('div.selectable-text')?.textContent || ''

              // Extract URLs from text content
              const urlMatches = textContent.match(/https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g) || []

              return {
                content: textContent,
                id: el.getAttribute('data-id') || '',
                sender: el.getAttribute('data-pre-plain-text')?.split(']')[1]?.trim() || 'Unknown',
                imageUrl,
                type: imageUrl ? 'image' : 'thought',
                urls: urlMatches
              }
            })
        }, Array.from(processedIds)) as WhatsAppMessage[]

        for (const message of messages) {
          if (!processedIds.has(message.id)) {
            console.log('Processing new message:', message.content)

            // Process URLs if they exist
            if (message.urls?.length) {
              for (const url of message.urls) {
                try {
                  const youtubeId = extractYouTubeId(url)
                  
                  if (youtubeId) {
                    const { data: existingVideo } = await supabase
                      .from('videos')
                      .select('id')
                      .eq('video_id', youtubeId)
                      .maybeSingle()

                    if (!existingVideo) {
                      await supabase
                        .from('videos')
                        .insert({ 
                          url,
                          video_id: youtubeId,
                          timestamp: new Date().toISOString()
                        })
                    }
                  } else {
                    const platform = detectPlatform(url.trim())
                    const { data: existingLink } = await supabase
                      .from('links')
                      .select('id')
                      .eq('url', url)
                      .maybeSingle()

                    if (!existingLink) {
                      const { error } = await supabase
                        .from('links')
                        .insert({ 
                          url: url.trim(),
                          title: `${platform.toUpperCase()} Link`,
                          platform: platform,
                          created_at: new Date().toISOString()
                        })
                      
                      if (error) {
                        console.error('Error saving link:', error)
                      } else {
                        console.log('Successfully saved link:', url)
                      }
                    }
                  }
                } catch (error) {
                  console.error('Error processing URL:', url, error)
                }
              }
            }

            // Handle image messages
            if (message.imageUrl) {
              try {
                // Get the image data directly through Puppeteer
                const imageData = await page.evaluate(async (blobUrl) => {
                  try {
                    // Create an image element and wait for it to load
                    const img = document.createElement('img');
                    await new Promise((resolve, reject) => {
                      img.onload = resolve;
                      img.onerror = reject;
                      img.src = blobUrl;
                    });

                    // Create a canvas and draw the image
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext('2d');
                    ctx?.drawImage(img, 0, 0);

                    // Get base64 data
                    return canvas.toDataURL('image/jpeg');
                  } catch (error) {
                    console.error('Error converting blob:', error);
                    return null;
                  }
                }, message.imageUrl);

                if (imageData) {
                  const { error } = await supabase
                    .from('videos')
                    .insert({ 
                      url: message.imageUrl,
                      type: 'image',
                      timestamp: new Date().toISOString(),
                      image_url: imageData,
                      video_id: uuidv4()
                    });
                  
                  if (error) {
                    console.error('Error saving image:', error);
                  }
                }
              } catch (error) {
                console.error('Error processing image:', error);
              }
            }

            if (message.content) {
              const { data: existing } = await supabase
                .from('entries')
                .select('id')
                .eq('content', message.content)
                .eq('source', 'whatsapp')
                .maybeSingle()

              if (!existing) {
                await supabase.from('entries').insert([{
                  title: message.sender ? `Message from ${message.sender}` : 'WhatsApp Message',
                  content: message.content,
                  type: 'thought',
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                  source: 'whatsapp',
                  status: 'active',
                  tags: []
                }])
              }
            }

            processedIds.add(message.id)
          }
        }
      }
    } catch (error: any) {
      console.error('Error in checkNewMessages:', error)
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