import { useEffect, useRef, type RefObject } from 'react';

export function useScrollToBottom<T extends HTMLElement>(): [
  RefObject<T>,
  RefObject<T>,
] {
  const containerRef = useRef<T>(null);
  const endRef = useRef<T>(null);

  useEffect(() => {
    const container = containerRef.current;
    const end = endRef.current;

    if (container && end) {
      const observer = new MutationObserver((mutations) => {
        // Don't auto-scroll if disabled by accordion toggle
        if (container.hasAttribute('data-disable-autoscroll')) {
          return;
        }
        
        // Only auto-scroll for new content, not for UI toggle changes
        const hasContentChanges = mutations.some(mutation => {
          if (mutation.type === 'childList') {
            // Check if new message nodes were added (not just UI expansions)
            return Array.from(mutation.addedNodes).some(node => {
              return node.nodeType === Node.ELEMENT_NODE && 
                     (node as Element).querySelector('[data-testid^="message-"]');
            });
          }
          return false;
        });
        
        if (hasContentChanges) {
          end.scrollIntoView({ behavior: 'instant', block: 'end' });
        }
      });

      observer.observe(container, {
        childList: true,
        subtree: true,
      });

      return () => observer.disconnect();
    }
  }, []);

  return [containerRef, endRef];
}
