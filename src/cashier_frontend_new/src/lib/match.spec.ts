
import { describe, expect, it } from "vitest";

describe("Enum match", () => {

    it("should match all enum values at compile time", () => {

type Tags<T> = T extends Record<infer K, any> ? K : never;

// match: value is the union; handlers must have an entry for every tag
function match<T extends Record<string, null>, R>(
  value: T,
  handlers: { [K in Tags<T> & string]: (v: Extract<T, Record<K, null>>) => R }
): R {
  const key = Object.keys(value)[0] as Tags<T> & string;

  // defensive runtime guard (shouldn't happen if TypeScript checks passed)
  const fn = (handlers as Record<string, (v: any) => R>)[key];
  if (!fn) {
    throw new Error(`Non-exhaustive match, missing handler for "${key}"`);
  }

  return fn(value as any);
}

        type Template = { 'Left' : null } |
       { 'Right' : null } |
       { 'Central' : null };

       // Arrange
    const template: Template = {
      Left: null,
    };

    // Act
    const result = match<Template, string>(template, {
      Left: () => "Left",
      Central: () => "Central",
      Right: () => "Right",
    });  

    // Assert
    expect(result).toEqual("Central");
  });
});
