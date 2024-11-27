import { NextResponse } from 'next/server'
import { setupWhatsAppPuppeteer } from '@/lib/whatsapp-puppeteer'

export async function POST() {
  try {
    await setupWhatsAppPuppeteer()
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error in WhatsApp API:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to start WhatsApp monitoring' },
      { status: 500 }
    )
  }
}

export async function DELETE() {
  try {
    const { stopWhatsAppPuppeteer } = await import('@/lib/whatsapp-puppeteer')
    await stopWhatsAppPuppeteer()
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error stopping WhatsApp:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to stop WhatsApp monitoring' },
      { status: 500 }
    )
  }
} 