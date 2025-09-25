import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combines class names using clsx and tailwind-merge.
 * This utility function allows you to conditionally apply CSS classes
 * while properly merging Tailwind CSS classes to avoid conflicts.
 *
 * @param inputs - Class values to combine (strings, objects, arrays, etc.)
 * @returns A single string of merged class names
 *
 * @example
 * ```ts
 * cn("bg-red-500", { "text-white": isActive }, ["p-4", "m-2"])
 * // Returns: "bg-red-500 text-white p-4 m-2"
 * ```
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Utility type that adds an optional 'ref' property to a type for DOM element binding.
 * Useful for Svelte components that need to expose DOM element references.
 *
 * @template T - The original props type
 * @template U - The HTMLElement type (defaults to HTMLElement)
 * @returns The original type with an optional ref property
 *
 * @example
 * ```ts
 * type ButtonProps = { variant: string; size: string };
 * type ButtonPropsWithRef = WithElementRef<ButtonProps, HTMLButtonElement>;
 * // Results in: { variant: string; size: string; ref?: HTMLButtonElement | null }
 * ```
 */
export type WithElementRef<T, U extends HTMLElement = HTMLElement> = T & {
  ref?: U | null;
};
