"use client";

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type CategoryCount = {
  type: string
  count: number
}

export function ThoughtCategories({ className }: { className?: string }) {
  const [categories, setCategories] = useState<CategoryCount[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch('/api/thoughts')
        if (response.ok) {
          const thoughts = await response.json()
          const counts = thoughts.reduce((acc: CategoryCount[], thought: any) => {
            const existing = acc.find(c => c.type === thought.type)
            if (existing) {
              existing.count++
            } else {
              acc.push({ type: thought.type, count: 1 })
            }
            return acc
          }, [])
          setCategories(counts)
        }
      } catch (error) {
        console.error('Failed to fetch categories:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchCategories()
    const interval = setInterval(fetchCategories, 10000)
    return () => clearInterval(interval)
  }, [])

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Thought Categories</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center p-4">Loading...</div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {categories.map((category) => (
              <div 
                key={category.type}
                className="flex items-center gap-2 p-4 rounded-lg border"
              >
                <span className="text-2xl">
                  {category.type === 'video' ? '🎥' : 
                   category.type === 'link' ? '🔗' : '💭'}
                </span>
                <div>
                  <p className="font-medium capitalize">{category.type}s</p>
                  <p className="text-sm text-muted-foreground">
                    {category.count} {category.count === 1 ? 'item' : 'items'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}