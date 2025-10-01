

/**
 * Returns handlers for the given key in the object.
 * @param value Value to retrieve handlers from
 * @returns Handlers for the given key in the object
 */
export function match<T extends { [k: string]: null }, R>(
  value: T,
  handlers: {
    [K in keyof T]: (v: { [P in K]: null }) => R
  }
): R {
  const key = Object.keys(value)[0] as keyof T;
  return handlers[key](value as any);
}