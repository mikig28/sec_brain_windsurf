"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Thought, ThoughtType, Category } from "./types";

interface ThoughtStore {
  thoughts: Thought[];
  addThought: (content: string, type: ThoughtType, category: Category) => void;
  deleteThought: (id: string) => void;
  getThoughtsByType: (type: ThoughtType) => Thought[];
  getRecentThoughts: (limit?: number) => Thought[];
  getThoughtStats: () => {
    thoughts: number;
    videos: number;
    links: number;
  };
}

export const useThoughtStore = create<ThoughtStore>()(
  persist(
    (set, get) => ({
      thoughts: [],
      addThought: (content, type, category) => {
        const newThought: Thought = {
          id: crypto.randomUUID(),
          content,
          type,
          category,
          createdAt: new Date(),
        };
        set((state) => ({
          thoughts: [newThought, ...state.thoughts],
        }));
      },
      deleteThought: (id) => {
        set((state) => ({
          thoughts: state.thoughts.filter((t) => t.id !== id),
        }));
      },
      getThoughtsByType: (type) => {
        return get().thoughts.filter((t) => t.type === type);
      },
      getRecentThoughts: (limit = 10) => {
        return get().thoughts
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
          .slice(0, limit);
      },
      getThoughtStats: () => {
        const thoughts = get().thoughts;
        return {
          thoughts: thoughts.filter((t) => t.type === "thought").length,
          videos: thoughts.filter((t) => t.type === "video").length,
          links: thoughts.filter((t) => t.type === "link").length,
        };
      },
    }),
    {
      name: "thoughts-storage",
    }
  )
);