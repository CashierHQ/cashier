import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// cn utility - standard pattern from shadcn/ui
// Ref: https://ui.shadcn.com/docs/installation/manual
export const cn = (...inputs: ClassValue[]): string =>
  twMerge(clsx(inputs));

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

/**
 * Utility type that removes 'children' and 'child' props from a component type.
 * Used for components that manage their own children rendering.
 */
export type WithoutChildrenOrChild<T> = Omit<T, "children" | "child">;
