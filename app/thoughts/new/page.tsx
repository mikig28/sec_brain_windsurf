"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useThoughtStore } from "@/lib/store";
import { toast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";
import { Category, ThoughtType } from "@/lib/types";

const formSchema = z.object({
  content: z.string().min(1, "Content is required"),
  type: z.enum(["thought", "video", "link"] as const),
  category: z.enum(["Development", "Learning", "Reading", "Ideas", "Tasks"] as const),
});

export default function NewThoughtPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const addThought = useThoughtStore((state) => state.addThought);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: "thought",
      content: "",
      category: "Development",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    try {
      addThought(
        values.content,
        values.type as ThoughtType,
        values.category as Category
      );
      toast({
        title: "Thought added",
        description: "Your thought has been successfully added to the dashboard.",
      });
      router.push("/");
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData("text");
    const type = text.startsWith("http://") || text.startsWith("https://")
      ? text.includes("youtube.com") || text.includes("youtu.be")
        ? "video"
        : "link"
      : "thought";
    
    form.setValue("type", type);
  };

  return (
    <div className="flex-1 space-y-4 p-8">
      <h2 className="text-3xl font-bold tracking-tight">Add New Thought</h2>
      <Card className="max-w-2xl p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Content</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Paste your WhatsApp message here..."
                      className="min-h-[100px]"
                      onPaste={handlePaste}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="thought">Thought</SelectItem>
                      <SelectItem value="video">Video</SelectItem>
                      <SelectItem value="link">Link</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Development">Development</SelectItem>
                      <SelectItem value="Learning">Learning</SelectItem>
                      <SelectItem value="Reading">Reading</SelectItem>
                      <SelectItem value="Ideas">Ideas</SelectItem>
                      <SelectItem value="Tasks">Tasks</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Adding..." : "Add Thought"}
            </Button>
          </form>
        </Form>
      </Card>
    </div>
  );
}