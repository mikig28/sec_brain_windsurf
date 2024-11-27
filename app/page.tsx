import { Overview } from "@/components/overview";
import { RecentThoughts } from "@/components/recent-thoughts";
import { ThoughtCategories } from "@/components/thought-categories";
import StartWhatsAppButton from "@/components/StartWhatsAppButton";
import Link from "next/link";
import { ThoughtsList } from '@/components/ThoughtsList';
import Iphone15Pro from "@/components/ui/iphone-15-pro";
import WhatsAppMessages from '@/components/WhatsAppMessages';
import { VideosSection } from '@/components/videos-section';

export default function HomePage() {
  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <div className="flex gap-4">
          <StartWhatsAppButton />
          <Link href="/thoughts/new">
            <button className="px-4 py-2 bg-black text-white rounded flex items-center gap-2">
              <span>+</span> Add Thought
            </button>
          </Link>
        </div>
      </div>
      
      <div className="grid gap-8 grid-cols-1 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <ThoughtCategories className="col-span-4" />
            <Overview className="col-span-3" />
          </div>
          <RecentThoughts />
          <ThoughtsList />
        </div>
        
        <div className="flex justify-center lg:justify-end">
          <div className="relative w-[300px] md:w-[433px]">
            <Iphone15Pro>
              <WhatsAppMessages />
            </Iphone15Pro>
          </div>
        </div>
      </div>
    </div>
  );
} 