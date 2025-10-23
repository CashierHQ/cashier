/**
 * Simple debounce helper: returns a debounced function which, when called,
 * schedules `fn` to be invoked with the last arguments after `wait` ms.
 * The returned function has an optional `cancel` method to clear any pending call.
 */
export default function debounce<F extends (...args: unknown[]) => unknown>(
  func: F,
  wait = 300,
) {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  return function (this: unknown, ...args: Parameters<F>) {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => {
      func.apply(this, args as unknown[]);
    }, wait);
  };
}
