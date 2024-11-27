import { ThoughtsList } from '@/components/ThoughtsList'

export default function ThoughtsPage() {
  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Thoughts</h2>
      </div>
      <ThoughtsList />
    </div>
  )
} 