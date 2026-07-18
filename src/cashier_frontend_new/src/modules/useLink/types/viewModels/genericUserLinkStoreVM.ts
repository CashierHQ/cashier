import type { ProcessActionResult } from "$modules/detailLink/types/genericDetailStoreVM";
import Action from "$modules/links/types/action/action";
import { type ActionTypeValue } from "$modules/links/types/action/actionType";
import type { Link } from "$modules/links/types/link/link";
import { LinkState } from "$modules/links/types/link/linkState";
import type { UserLinkStep } from "$modules/links/types/userLinkStep";

export type GenericUserLinkStoreVM = {
  link: Link | undefined;
  action: Action | undefined;
  /** The current user's successfully completed claims for this link. */
  completedActions: Action[];
  state: LinkState;
  step: UserLinkStep | undefined;
  createAction(actionType: ActionTypeValue): Promise<Action>;
  processAction(): Promise<ProcessActionResult>;
  goNext(): Promise<void>;
  goBack(): Promise<void>;
  goToLanding(): Promise<void>;
  findUseActionType(): ActionTypeValue | null;
  refreshAsync(): Promise<void>;
};
