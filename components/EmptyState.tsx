interface EmptyStateProps {
  onRetry?: () => void
}

export function EmptyState({ onRetry }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="text-6xl mb-4">🌟</div>
      <h3 className="text-xl font-semibold mb-2">No trends available</h3>
      <p className="text-muted-foreground mb-4 max-w-md">
        We couldn't load any trends right now. Please check your connection or try again.
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
