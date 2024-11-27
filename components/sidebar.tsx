"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  MessageSquare,
  Video,
  Link as LinkIcon,
  Settings,
  ChevronLeft,
  ChevronRight,
  Image,
  Calendar as CalendarIcon,
} from "lucide-react";
import { useState } from "react";

const routes = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    href: "/",
    color: "text-sky-500",
  },
  {
    label: "Thoughts",
    icon: MessageSquare,
    href: "/thoughts",
    color: "text-violet-500",
  },
  {
    label: "Videos",
    icon: Video,
    href: "/videos",
    color: "text-pink-700",
  },
  {
    label: "Calendar",
    icon: CalendarIcon,
    href: "/calendar",
    color: "text-emerald-500",
  },
  {
    label: "Links",
    icon: LinkIcon,
    href: "/links",
    color: "text-orange-700",
  },
  {
    label: "Images",
    icon: Image,
    href: "/images",
    color: "text-green-700",
  },
  {
    label: "Settings",
    icon: Settings,
    href: "/settings",
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute right-[-12px] top-6 z-40 rounded-full bg-[#111827] p-1.5 text-white hover:bg-gray-700"
      >
        {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
      </button>
      <div
        className={cn(
          "space-y-4 py-4 flex flex-col h-full bg-[#111827] text-white transition-all duration-300",
          isCollapsed ? "w-[78px]" : "w-72"
        )}
      >
        <div className="px-3 py-2 flex-1">
          <Link href="/" className={cn("flex items-center pl-3 mb-14", 
            isCollapsed && "justify-center pl-0"
          )}>
            <h1 className={cn("text-2xl font-bold transition-all duration-300",
              isCollapsed && "text-sm")}>
              {isCollapsed ? "TD" : "Thoughts Dashboard"}
            </h1>
          </Link>
          <div className="space-y-1">
            {routes.map((route) => (
              <Link
                key={route.href}
                href={route.href}
                className={cn(
                  "text-sm group flex p-3 w-full justify-start font-medium cursor-pointer hover:text-white hover:bg-white/10 rounded-lg transition",
                  pathname === route.href
                    ? "text-white bg-white/10"
                    : "text-zinc-400",
                  isCollapsed && "justify-center"
                )}
                title={isCollapsed ? route.label : undefined}
              >
                <div className={cn(
                  "flex items-center flex-1",
                  isCollapsed && "justify-center"
                )}>
                  <route.icon className={cn("h-5 w-5", 
                    !isCollapsed && "mr-3",
                    route.color
                  )} />
                  {!isCollapsed && route.label}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}