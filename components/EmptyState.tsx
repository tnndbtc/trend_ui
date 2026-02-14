interface EmptyStateProps {
  onRetry?: () => void
}

export function EmptyState({ onRetry }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="text-6xl mb-4">🔍</div>
      <h3 className="text-xl font-semibold mb-2">No trends found</h3>
      <p className="text-muted-foreground mb-4 max-w-md">
        We couldn't find any trends matching your filters. Try adjusting your selection or check back later.
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
        >
          Retry
        </button>
      )}
    </div>
  )
}
