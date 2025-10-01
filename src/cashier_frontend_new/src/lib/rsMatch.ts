

/**
 * Extracts the union of tag names (keys) from a tagged-union type.
 *
 * Example:
 * ```ts
 * type Template =
 *   | { Left: null }
 *   | { Right: null }
 *   | { Central: null };
 *
 * type TemplateTags = Tags<Template>;
 * // "Left" | "Right" | "Central"
 * ```
 *
 * @template T - A union of object types, each with exactly one unique key.
 */
export type Tags<T> = T extends Record<infer K, any> ? K : never;

/**
 * Extracts the tag (key) from a single branch of a tagged-union type.
 *
 * At runtime, this simply returns the first key of the given object.
 * At compile time, the return type is restricted to the union of all
 * possible tags extracted from the union type.
 *
 * Example:
 * ```ts
 * const template: Template = { Left: null };
 *
 * const tag = getTag(template);
 * // tag: "Left" | "Right" | "Central"
 *
 * if (tag === "Left") {
 *   console.log("Got Left!");
 * }
 * ```
 *
 * @param value - One branch of the union type.
 * @returns The key of the branch, typed as the union of all tags.
 */
export function getTag<T extends Record<string, any>>(value: T): Tags<T> {
  return Object.keys(value)[0] as Tags<T>;
}

/**
 * Type-safe exhaustive pattern matching on a tagged-union type that emulates a Rust match.
 *
 * Requires handlers for every tag in the union. If any handler is missing,
 * TypeScript will issue a compile-time error.
 *
 * Example:
 * ```ts
 * type Template =
 *   | { Left: null }
 *   | { Right: null }
 *   | { Central: null };
 *
 * const template: Template = { Left: null };
 *
 * const result = match(template, {
 *   Left: () => "left branch",
 *   Right: () => "right branch",
 *   Central: () => "central branch",
 * });
 * // result: string
 * ```
 *
 * @template T - The tagged-union type, where each branch has a unique key.
 * @template R - The result type returned by every handler.
 * @param value - The union value to match against.
 * @param handlers - An object with one function per tag, returning `R`.
 * @returns The result of the matching handler.
 */
// export function rsMatch<T extends Record<string, null>, R>(
//   value: T,
//   handlers: { [K in Tags<T> & string]: (v: Extract<T, Record<K, null>>) => R }
// ): R {
//   const key = Object.keys(value)[0] as Tags<T> & string;

//   // defensive runtime guard (shouldn't happen if TypeScript checks passed)
//   const fn = (handlers as Record<string, (v: any) => R>)[key];
//   if (!fn) {
//     throw new Error(`Non-exhaustive match, missing handler for "${key}"`);
//   }

//   return fn(value as any);
// }

export function rsMatch<T extends Record<string, any>, R>(
  value: T,
  handlers: {
    [K in Tags<T>]: (v: Extract<T, Record<K, any>>[K]) => R;
  }
): R {
  const key = Object.keys(value)[0] as Tags<T>;
  return handlers[key](value[key] as any);
}