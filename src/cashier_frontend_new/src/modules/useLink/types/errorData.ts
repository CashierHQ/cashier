import type { Link } from "$modules/links/types/link/link";
import { LinkState } from "$modules/links/types/link/linkState";
import type * as cashierBackend from "$lib/generated/cashier_backend/cashier_backend.did";

/**
 * Error data structure that may come from backend
 * CanisterError can be serialized as JSON string
 */
export type ErrorData =
  | cashierBackend.CanisterError
  | {
      ValidationErrors?: string;
      link?: Link;
      linkState?: LinkState;
      [key: string]: unknown;
    };
