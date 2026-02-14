'use client'

import { useState } from 'react'
import { submitFeedback } from '@/lib/api/trends'
import type { FeedbackAction } from '@/types/trend'

interface FeedbackButtonsProps {
  itemId: number
}

export function FeedbackButtons({ itemId }: FeedbackButtonsProps) {
  const [feedback, setFeedback] = useState<FeedbackAction['action'] | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleFeedback = async (action: FeedbackAction['action']) => {
    if (isSubmitting) return

    setIsSubmitting(true)
    setFeedback(action)

    try {
      await submitFeedback({ item_id: itemId, action })
    } catch (error) {
      console.error('Feedback submission failed:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const buttonClass = (action: FeedbackAction['action']) =>
    `px-3 py-1 text-sm rounded-md transition-colors ${
      feedback === action
        ? 'bg-primary text-primary-foreground'
        : 'bg-secondary hover:bg-secondary/80'
    }`

  return (
    <div className="flex gap-2 mt-3">
      <button
        onClick={() => handleFeedback('like')}
        className={buttonClass('like')}
        disabled={isSubmitting}
      >
        👍 Like
      </button>
      <button
        onClick={() => handleFeedback('dislike')}
        className={buttonClass('dislike')}
        disabled={isSubmitting}
      >
        👎 Dislike
      </button>
      <button
        onClick={() => handleFeedback('save')}
        className={buttonClass('save')}
        disabled={isSubmitting}
      >
        💾 Save
      </button>
      <button
        onClick={() => handleFeedback('hide')}
        className={buttonClass('hide')}
        disabled={isSubmitting}
      >
        🙈 Hide
      </button>
    </div>
  )
}
