import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function LinksPage() {
  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Links</h2>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>All Links</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Links content will be added here */}
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 