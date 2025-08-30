import { Chain } from "@/generated/cashier_backend/cashier_backend.did";
import { CHAIN } from "../enum";

export const mapChainToChainEnum = (chain: Chain) => {
  if ("IC" in chain) {
    return CHAIN.IC;
  }

  throw new Error(`Unknown chain: ${JSON.stringify(chain)}`);
};

/**
 * This KeyVariant type extracts the key of a Candid variant type.
 * For example, given a type Something = { 'A': null } | { 'B': null },
 * Type KeyVariant<Something> will be "A" | "B".
 * */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type KeyVariant<T> = T extends Record<infer K, any> ? K : never;

/**
 *
 * @param v - A Candid variant type object, e.g., { 'A': null } or { 'B': null }
 * @returns - The key of the variant, e.g., "A" or "B"
 */
export const getKeyVariant = <T extends object>(v: T): KeyVariant<T> => {
  return Object.keys(v)[0] as KeyVariant<T>;
};

// Helper function to ensure exhaustive checks in switch statements
export function assertNever(x: never): never {
  throw new Error("Unexpected object: " + x);
}

/**
 * Extract the enum key name for a given enum value.
 * Example: getEnumKey(CHAIN, "IC") -> "IC"
 * Throws if the value is not present in the enum.
 */
export type EnumKey<T> = T extends Record<infer K, unknown> ? K : never;

/**
 * Get the key of an enum given its value.
 * @param enumObject - The enum object to search
 * @param value - The value to find the corresponding key for
 * @returns The key corresponding to the given value
 * @throws Error if the value is not found in the enum
 */
export const getEnumKey = <T extends Record<string, string>>(
  enumObject: T,
  value: string,
): EnumKey<T> => {
  const entry = Object.entries(enumObject).find(([, v]) => v === value);
  if (!entry) throw new Error(`Unknown enum value: ${value}`);
  return entry[0] as EnumKey<T>;
};
