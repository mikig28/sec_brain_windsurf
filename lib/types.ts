export type ThoughtType = "thought" | "video" | "link";

export type Category = "Development" | "Learning" | "Reading" | "Ideas" | "Tasks";

export interface Thought {
  id: string;
  content: string;
  type: ThoughtType;
  category: Category;
  createdAt: Date;
}