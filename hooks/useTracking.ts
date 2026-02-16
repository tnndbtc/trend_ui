import { useEffect, useRef, useCallback } from 'react';

export interface TrackingEvent {
  event_type: 'impression' | 'click' | 'dwell';
  trend_id: string;
  platform?: string;
  timestamp: string;
  dwell_time_ms?: number;
  url?: string;
}

/**
 * Hook for tracking user interactions with trend cards
 * Logs events to console in structured format for future backend integration
 */
export function useTracking() {
  const eventsRef = useRef<TrackingEvent[]>([]);

  const logEvent = useCallback((event: TrackingEvent) => {
    // Add to in-memory storage
    eventsRef.current.push(event);

    // Log to console in structured format
    console.log('[TRACKING]', JSON.stringify(event));

    // Optional: Store in localStorage for persistence
    try {
      const stored = localStorage.getItem('tracking_events') || '[]';
      const events = JSON.parse(stored) as TrackingEvent[];
      events.push(event);
      // Keep only last 1000 events to avoid storage issues
      const trimmed = events.slice(-1000);
      localStorage.setItem('tracking_events', JSON.stringify(trimmed));
    } catch (e) {
      console.warn('Failed to store tracking event:', e);
    }
  }, []);

  const trackImpression = useCallback((trendId: string, platform?: string) => {
    logEvent({
      event_type: 'impression',
      trend_id: trendId,
      platform,
      timestamp: new Date().toISOString(),
    });
  }, [logEvent]);

  const trackClick = useCallback((trendId: string, url: string, platform?: string) => {
    logEvent({
      event_type: 'click',
      trend_id: trendId,
      platform,
      url,
      timestamp: new Date().toISOString(),
    });
  }, [logEvent]);

  const trackDwell = useCallback((trendId: string, dwellTimeMs: number, platform?: string) => {
    logEvent({
      event_type: 'dwell',
      trend_id: trendId,
      platform,
      dwell_time_ms: dwellTimeMs,
      timestamp: new Date().toISOString(),
    });
  }, [logEvent]);

  return {
    trackImpression,
    trackClick,
    trackDwell,
    events: eventsRef.current,
  };
}

/**
 * Hook for tracking a single card's visibility and dwell time
 * Uses IntersectionObserver to detect when card enters/exits viewport
 */
export function useCardTracking(
  trendId: string,
  platform?: string,
  enabled = true
) {
  const { trackImpression, trackDwell } = useTracking();
  const elementRef = useRef<HTMLElement | null>(null);
  const visibleSinceRef = useRef<number | null>(null);
  const hasTrackedImpressionRef = useRef(false);

  useEffect(() => {
    if (!enabled || !elementRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Card entered viewport
            if (!hasTrackedImpressionRef.current) {
              trackImpression(trendId, platform);
              hasTrackedImpressionRef.current = true;
            }
            visibleSinceRef.current = Date.now();
          } else {
            // Card left viewport
            if (visibleSinceRef.current !== null) {
              const dwellTime = Date.now() - visibleSinceRef.current;
              // Only track dwell if card was visible for at least 100ms
              if (dwellTime >= 100) {
                trackDwell(trendId, dwellTime, platform);
              }
              visibleSinceRef.current = null;
            }
          }
        });
      },
      {
        threshold: 0.5, // Card is considered visible when 50% is in viewport
        rootMargin: '0px',
      }
    );

    observer.observe(elementRef.current);

    return () => {
      // Track final dwell time on unmount if card is still visible
      if (visibleSinceRef.current !== null) {
        const dwellTime = Date.now() - visibleSinceRef.current;
        if (dwellTime >= 100) {
          trackDwell(trendId, dwellTime, platform);
        }
      }
      observer.disconnect();
    };
  }, [trendId, platform, enabled, trackImpression, trackDwell]);

  return elementRef;
}
