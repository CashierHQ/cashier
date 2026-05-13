import Action from "$modules/links/types/action/action";
import { type ActionTypeValue } from "$modules/links/types/action/actionType";
import type { Link } from "$modules/links/types/link/link";
import { LinkState } from "$modules/links/types/link/linkState";

export type ProcessActionResult = {
  action: Action | undefined;
  isSuccess: boolean;
  errors: string[];
};

export type GenericDetailStoreVM = {
  link: Link | undefined;
  action: Action | undefined;
  state: LinkState;
  createAction(actionType: ActionTypeValue): Promise<Action>;
  processAction(): Promise<ProcessActionResult>;
  disableLink(): Promise<void>;
  refreshAsync(): Promise<void>;
  syncAssetBalanceCache?(): Promise<void>;
};
