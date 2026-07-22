type HorizontalSlideParams = {
  xPercent: number;
  duration: number;
  easing?: (t: number) => number;
};

export function horizontalSlide(
  _node: Element,
  { xPercent, duration, easing }: HorizontalSlideParams,
) {
  return {
    duration,
    easing,
    css: (_t: number, u: number) =>
      `transform: translateX(${u * xPercent}%);`,
  };
}
