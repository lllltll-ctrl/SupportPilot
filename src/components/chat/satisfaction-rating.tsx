'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Star } from 'lucide-react';

interface SatisfactionRatingProps {
  readonly ticketId: number;
  readonly onRated: (rating: number) => void;
}

export function SatisfactionRating({ ticketId, onRated }: SatisfactionRatingProps) {
  const [hoveredStar, setHoveredStar] = useState(0);
  const [selectedRating, setSelectedRating] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleRate = async (rating: number) => {
    setSelectedRating(rating);
    setSubmitting(true);

    try {
      await fetch(`/api/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ satisfaction_rating: rating }),
      });
      setSubmitted(true);
      onRated(rating);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex justify-start mb-4 ml-11">
        <Card className="max-w-[75%] p-4 border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800">
          <p className="text-sm text-green-700 dark:text-green-300">
            Thanks for your feedback! You rated this interaction {selectedRating}/5.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex justify-start mb-4 ml-11">
      <Card className="max-w-[75%] p-4 border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800">
        <p className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
          How was your experience?
        </p>
        <p className="text-xs text-blue-600 dark:text-blue-400 mb-3">
          Rate your interaction to help us improve
        </p>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onMouseEnter={() => setHoveredStar(star)}
              onMouseLeave={() => setHoveredStar(0)}
              onClick={() => handleRate(star)}
              disabled={submitting}
              className="p-1 transition-transform hover:scale-110 disabled:opacity-50"
              aria-label={`Rate ${star} out of 5`}
            >
              <Star
                className={`w-6 h-6 transition-colors ${
                  star <= (hoveredStar || selectedRating)
                    ? 'fill-amber-400 text-amber-400'
                    : 'text-gray-300 dark:text-gray-600'
                }`}
              />
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}
