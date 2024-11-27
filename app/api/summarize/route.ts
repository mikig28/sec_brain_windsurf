import { GoogleGenerativeAI } from "@google/generative-ai";
import { YoutubeTranscript } from 'youtube-transcript';
import { extractYouTubeId } from '@/lib/youtube';

const genAI = new GoogleGenerativeAI(process.env.GENIUS_API_KEY!);

export async function POST(req: Request) {
  try {
    const { videoId } = await req.json();
    
    // Get video transcript using the correct method
    const transcript = await YoutubeTranscript.fetchTranscript(videoId);
    const fullText = transcript.map(t => t.text).join(' ');
    
    // Summarize with Gemini
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const prompt = `Please provide a concise summary of this YouTube video transcript. Focus on the main points and key takeaways:\n\n${fullText}`;
    
    const result = await model.generateContent(prompt);
    const summary = result.response.text();
    
    return new Response(JSON.stringify({ summary }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error summarizing video:', error);
    return new Response(JSON.stringify({ error: 'Failed to summarize video' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
} 