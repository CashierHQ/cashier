import { LinkStep } from "$modules/links/types/linkStep";
import { UserLinkStep } from "$modules/links/types/userLinkStep";

export enum GuardType {
  AUTH = "AUTH",
  VALID_LINK = "VALID_LINK",
  LINK_OWNER = "LINK_OWNER",
  LINK_STATE = "LINK_STATE",
  USER_STATE = "USER_STATE",
}

export interface AuthGuardConfig {
  type: GuardType.AUTH;
  requireAuth?: boolean;
  redirectTo?: string;
}

export interface ValidLinkGuardConfig {
  type: GuardType.VALID_LINK;
  redirectTo?: string;
}

export interface LinkOwnerGuardConfig {
  type: GuardType.LINK_OWNER;
  mustBeOwner?: boolean;
  redirectTo?: string;
}

export interface LinkStateGuardConfig {
  type: GuardType.LINK_STATE;
  allowedStates?: LinkStep[];
}

export interface UserStateGuardConfig {
  type: GuardType.USER_STATE;
  allowedStates?: UserLinkStep[];
}

export type GuardConfig =
  | AuthGuardConfig
  | ValidLinkGuardConfig
  | LinkOwnerGuardConfig
  | LinkStateGuardConfig
  | UserStateGuardConfig;
