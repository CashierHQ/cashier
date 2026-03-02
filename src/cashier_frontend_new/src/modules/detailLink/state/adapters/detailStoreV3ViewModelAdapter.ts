import { LinkDetailStoreV3 } from "$modules/detailLink/state/linkDetailStoreV3.svelte";
import { type GenericDetailStoreVM } from "$modules/detailLink/types/genericDetailStoreVM";
import { ActionMapper } from "$modules/links/types/action/action";
import {
  LinkState,
  LinkStateMapper,
} from "$modules/links/types/link/linkState";

export class DetailStoreV3ViewModelAdapter implements GenericDetailStoreVM {
  constructor(private detailStore: LinkDetailStoreV3) {}

  get action() {
    if (!this.detailStore.backendAction) {
      return undefined;
    }
    return ActionMapper.fromSharedAction(
      this.detailStore.backendAction,
      this.detailStore.icrc112Requests,
    );
  }

  get state() {
    if (!this.detailStore.link) {
      return LinkState.CREATE_LINK;
    }
    return LinkStateMapper.fromSharedLinkState(
      this.detailStore.link?.link_state,
    );
  }

  async processAction() {
    if (!this.detailStore.backendAction) {
      return {
        action: undefined,
        isSuccess: false,
        errors: ["No action available"],
      };
    }
    try {
      const result = await this.detailStore.processAction();
      return {
        action: ActionMapper.fromSharedAction(
          result.action,
          result.icrc112_requests,
        ),
        isSuccess: result.isSuccess,
        errors: result.errors,
      };
    } catch (error) {
      return {
        action: undefined,
        isSuccess: false,
        errors: ["An error occurred"],
      };
    }
  }
}
