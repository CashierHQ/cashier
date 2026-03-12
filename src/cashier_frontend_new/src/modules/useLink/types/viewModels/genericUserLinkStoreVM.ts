import type { ProcessActionResult } from "$modules/detailLink/types/genericDetailStoreVM";
import Action from "$modules/links/types/action/action";
import { type ActionTypeValue } from "$modules/links/types/action/actionType";
import type { Link } from "$modules/links/types/link/link";
import { LinkState } from "$modules/links/types/link/linkState";
import type { LinkUserState } from "$modules/links/types/link/linkUserState";
import type { UserLinkStep } from "$modules/links/types/userLinkStep";

export type GenericUserLinkStoreVM = {
  link: Link | undefined;
  action: Action | undefined;
  state: LinkState;
  link_user_state: LinkUserState | undefined;
  step: UserLinkStep | undefined;
  createAction(actionType: ActionTypeValue): Promise<Action>;
  processAction(): Promise<ProcessActionResult>;
  goNext(): Promise<void>;
  goBack(): Promise<void>;
  goToLanding(): Promise<void>;
  findUseActionType(): ActionTypeValue | null;
  refreshAsync(): Promise<void>;
};
