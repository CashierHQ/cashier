/**
 * Configuration for the horizontal slide transition.
 */
export type HorizontalSlideParams = {
  /**
   * Horizontal offset, as a percentage of the element width.
   */
  xPercent: number;
  /**
   * Transition duration in milliseconds.
   */
  duration: number;
  /**
   * Optional easing function applied by Svelte during the transition.
   *
   * @param t - The normalized transition progress, from 0 to 1.
   * @returns The eased transition progress.
   */
  easing?: (t: number) => number;
};

/**
 * Creates a Svelte transition that moves an element horizontally.
 *
 * @param _node - The element being transitioned.
 * @param params - Horizontal slide transition configuration.
 * @param params.xPercent - Horizontal offset, as a percentage of the element width.
 * @param params.duration - Transition duration in milliseconds.
 * @param params.easing - Optional easing function applied by Svelte during the transition.
 * @returns A Svelte transition config that applies a horizontal translate transform.
 */
export function horizontalSlide(
  _node: Element,
  { xPercent, duration, easing }: HorizontalSlideParams,
) {
  return {
    duration,
    easing,
    css: (_t: number, u: number) => `transform: translateX(${u * xPercent}%);`,
  };
}
