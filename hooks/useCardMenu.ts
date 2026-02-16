import { useState, useCallback, useEffect } from 'react';

const DISMISSED_ITEMS_KEY = 'trend_dismissed_items';
const HIDDEN_PLATFORMS_KEY = 'trend_hidden_platforms';

/**
 * Hook for managing card menu actions (Not interested, Hide source)
 * Uses sessionStorage to persist within current session only
 */
export function useCardMenu() {
  const [dismissedItems, setDismissedItems] = useState<Set<string>>(() => {
    try {
      const stored = sessionStorage.getItem(DISMISSED_ITEMS_KEY);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  const [hiddenPlatforms, setHiddenPlatforms] = useState<Set<string>>(() => {
    try {
      const stored = sessionStorage.getItem(HIDDEN_PLATFORMS_KEY);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  // Persist dismissed items to sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem(
        DISMISSED_ITEMS_KEY,
        JSON.stringify(Array.from(dismissedItems))
      );
    } catch (e) {
      console.warn('Failed to store dismissed items:', e);
    }
  }, [dismissedItems]);

  // Persist hidden platforms to sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem(
        HIDDEN_PLATFORMS_KEY,
        JSON.stringify(Array.from(hiddenPlatforms))
      );
    } catch (e) {
      console.warn('Failed to store hidden platforms:', e);
    }
  }, [hiddenPlatforms]);

  const dismissItem = useCallback((itemId: string) => {
    setDismissedItems((prev) => new Set(prev).add(itemId));
    console.log('[FEEDBACK] Not interested:', itemId);
  }, []);

  const hidePlatform = useCallback((platform: string) => {
    setHiddenPlatforms((prev) => new Set(prev).add(platform));
    console.log('[FEEDBACK] Hide source:', platform);
  }, []);

  const isItemDismissed = useCallback(
    (itemId: string) => dismissedItems.has(itemId),
    [dismissedItems]
  );

  const isPlatformHidden = useCallback(
    (platform: string) => hiddenPlatforms.has(platform),
    [hiddenPlatforms]
  );

  const shouldHideItem = useCallback(
    (itemId: string, platform?: string) => {
      if (dismissedItems.has(itemId)) return true;
      if (platform && hiddenPlatforms.has(platform)) return true;
      return false;
    },
    [dismissedItems, hiddenPlatforms]
  );

  const clearAll = useCallback(() => {
    setDismissedItems(new Set());
    setHiddenPlatforms(new Set());
    sessionStorage.removeItem(DISMISSED_ITEMS_KEY);
    sessionStorage.removeItem(HIDDEN_PLATFORMS_KEY);
  }, []);

  return {
    dismissedItems,
    hiddenPlatforms,
    dismissItem,
    hidePlatform,
    isItemDismissed,
    isPlatformHidden,
    shouldHideItem,
    clearAll,
  };
}
