import type { AppPath } from "./types";

/**
 * Path builders used by redirect policy.
 *
 * Keeping redirect targets here avoids hard-coded route strings spread across
 * the policy files.
 */
export const paths = {
  home: (): AppPath => "/",
  notFound: (): AppPath => "/404",
  links: (): AppPath => "/links",
  create: (id: string): AppPath => `/link/create/${id}`,
  detail: (id: string): AppPath => `/link/detail/${id}`,
  createdDetail: (id: string): AppPath => `/link/detail/${id}?created=true`,
  userLanding: (id: string): AppPath => `/link/${id}`,
  userUse: (id: string): AppPath => `/link/${id}/use`,
} as const;
