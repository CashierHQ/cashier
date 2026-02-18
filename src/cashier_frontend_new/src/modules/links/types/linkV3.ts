import type {
  Action as SharedAction,
  Link as SharedLink,
  LinkType as SharedLinkType,
} from "$shared";
import type { Icrc112Request } from "$lib/generated/cashier_backend/cashier_backend.did";

/**
 * V3 link creation input expected by the backend.
 * Mirrors `CreateLinkInputV3` in `cashier_backend_types::link_v3::dto::link`.
 */
export interface CreateLinkInputV3 {
  title: string;
  link_type: SharedLinkType;
  max_use: number;
  action: SharedAction;
}

/**
 * V3 link creation response.
 * Mirrors `CreateLinkResponseV3` in `cashier_backend_types::link_v3::dto::link`.
 */
export interface CreateLinkResponseV3 {
  link: SharedLink;
  action: SharedAction;
  // Optional batched ICRC-112 requests to be executed by the wallet
  icrc112_requests?: Array<Array<Icrc112Request>> | null;
}

/**
 * V3 action creation input.
 * Mirrors `CreateActionInputV3` in `cashier_backend_types::link_v3::dto::action`.
 */
export interface CreateActionInputV3 {
  link_id: string;
  action: SharedAction;
}

/**
 * V3 action creation response.
 * Mirrors `CreateActionResponseV3` in `cashier_backend_types::link_v3::dto::action`.
 */
export interface CreateActionResponseV3 {
  link: SharedLink;
  action: SharedAction;
  icrc112_requests?: Array<Array<Icrc112Request>> | null;
}

/**
 * V3 process action input.
 * Backend expects only action_id (same shape as ProcessActionV2Input).
 */
export interface ProcessActionInputV3 {
  action_id: string;
}

/**
 * V3 process action response.
 * Mirrors `ProcessActionResponseV3` in `cashier_backend_types::link_v3::dto::action`.
 */
export interface ProcessActionResponseV3 {
  link: SharedLink;
  action: SharedAction;
  icrc112_requests?: Array<Array<Icrc112Request>> | null;
  is_success: boolean;
  errors: string[];
}

