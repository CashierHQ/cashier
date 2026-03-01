import Action from "$modules/links/types/action/action";
import { LinkState } from "$modules/links/types/link/linkState";

export type ProcessActionResult = {
  action: Action | undefined;
  isSuccess: boolean;
  errors: string[];
};

export type GenericDetailStoreVM = {
  action: Action | undefined;
  state: LinkState;
  processAction(): Promise<ProcessActionResult>;
};
