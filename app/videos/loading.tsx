export default function Loading() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Videos</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((n) => (
          <div key={n} className="animate-pulse">
            <div className="aspect-video bg-gray-200 rounded-lg" />
            <div className="h-4 bg-gray-200 rounded mt-2 w-2/3" />
          </div>
        ))}
      </div>
    </div>
  );
} 