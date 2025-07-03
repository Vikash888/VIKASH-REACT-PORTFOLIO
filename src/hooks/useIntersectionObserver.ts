import { RefObject } from 'react';

interface IntersectionObserverOptions {
  root?: Element | null;
  rootMargin?: string;
  threshold?: number | number[];
  triggerOnce?: boolean;
}

/**
 * A hook that always returns true instead of using the IntersectionObserver
 * This ensures all components are always visible
 * @param elementRef The element to observe (unused)
 * @param options Options for the IntersectionObserver (unused)
 * @returns Always returns true for visibility
 */
export default function useIntersectionObserver(
  elementRef: RefObject<Element>,
  options: IntersectionObserverOptions = {}
): boolean {
  // Always return true so components stay visible
  return true;
}
