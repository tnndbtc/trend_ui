export function LoadingCard() {
  return (
    <div className="border rounded-lg p-4 animate-pulse">
      <div className="flex gap-2 mb-3">
        <div className="h-6 w-20 bg-muted rounded-md"></div>
        <div className="h-6 w-24 bg-muted rounded-md"></div>
      </div>
      <div className="h-6 bg-muted rounded-md mb-2 w-3/4"></div>
      <div className="h-4 bg-muted rounded-md mb-1"></div>
      <div className="h-4 bg-muted rounded-md mb-1 w-5/6"></div>
      <div className="h-4 bg-muted rounded-md w-4/6"></div>
      <div className="mt-3 h-8 bg-muted rounded-md w-1/3"></div>
    </div>
  )
}
