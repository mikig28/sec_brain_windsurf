import { WAConnection, MessageType } from '@adiwajshing/baileys'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function setupWhatsAppScraper() {
  const conn = new WAConnection()
  
  // Connect to WhatsApp Web
  await conn.connect()
  
  // Listen for new messages
  conn.on('chat-update', async (chat) => {
    if (!chat.messages) return
    
    const message = chat.messages.all()[0]
    
    // Check if message is from target group
    if (message.key.remoteJid === process.env.WHATSAPP_GROUP_ID) {
      const messageText = message.message?.conversation || ''
      
      // Categorize and store message based on content
      await categorizeAndStoreMessage(messageText)
    }
  })
}

async function categorizeAndStoreMessage(messageText: string) {
  // Add your categorization logic here
  // Example:
  if (messageText.toLowerCase().includes('task')) {
    await prisma.tasks.create({
      data: {
        content: messageText,
        category: 'TASK'
      }
    })
  } else if (messageText.toLowerCase().includes('note')) {
    await prisma.notes.create({
      data: {
        content: messageText,
        category: 'NOTE'  
      }
    })
  }
  // Add more categories as needed
} 