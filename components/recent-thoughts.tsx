"use client";

import { useEffect, useState } from 'react'
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DeleteButton } from './DeleteButton'
import Iphone15Pro from '@/components/ui/iphone-15-pro'
import { WhatsAppMessage } from '@/components/ui/whatsapp-message'

interface Message {
  content: string;
  timestamp: string;
}

export function RecentThoughts() {
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    const fetchMessages = async () => {
      const response = await fetch('/api/messages');
      const data: Message[] = await response.json();
      setMessages(data); // No need to sort - already sorted from Supabase
    };
    
    fetchMessages();
  }, []);

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Recent Thoughts</h2>
      <div className="space-y-4">
        {Object.entries(groupMessagesByDate(messages)).map(([date, msgs]) => (
          <div key={date} className="border rounded-lg p-4">
            <h3 className="font-semibold mb-2">{date}</h3>
            {msgs.map((msg, idx) => (
              <div key={idx} className="bg-white p-3 rounded-lg shadow-sm">
                <p>{msg.content}</p>
                <span className="text-sm text-gray-500">
                  {format(new Date(msg.timestamp), 'HH:mm')}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function groupMessagesByDate(messages: Message[]) {
  return messages.reduce((groups: Record<string, Message[]>, message) => {
    const date = format(new Date(message.timestamp), 'yyyy-MM-dd');
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(message);
    return groups;
  }, {});
}