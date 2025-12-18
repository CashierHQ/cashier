/**
 * Calculates the dynamic height for mobile image display.
 *
 * This function computes the appropriate height for images on mobile devices
 * by subtracting a fixed offset (426px) from the viewport height, ensuring
 * a minimum height of 200px is maintained.
 *
 * @returns {string | null}
 * - Returns "200px" if window is undefined (SSR safety)
 * - Returns null for non-mobile screens (width >= 768px, typically tablet/desktop)
 * - Returns calculated height string with px unit for mobile screens
 *
 * @example
 * // On mobile with 667px height
 * getMobileImageHeight() // Returns "241px" (667 - 426 = 241)
 *
 * @example
 * // On mobile with 600px height (hits minimum)
 * getMobileImageHeight() // Returns "200px" (600 - 426 = 174, but min is 200)
 *
 * @example
 * // On desktop/tablet (width >= 768px)
 * getMobileImageHeight() // Returns null
 */
export function getMobileImageHeight(): string | null {
  if (typeof window === "undefined") return "200px";

  // Only apply for mobile (below md breakpoint, typically 768px)
  const isMobile = window.innerWidth < 768;
  if (!isMobile) return null;

  const vh = window.innerHeight;
  const calculatedHeight = vh - 426;
  return `${Math.max(200, calculatedHeight)}px`;
}
