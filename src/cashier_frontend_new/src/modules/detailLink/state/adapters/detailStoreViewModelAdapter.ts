import { LinkDetailStore } from "$modules/detailLink/state/linkDetailStore.svelte";
import { type GenericDetailStoreVM } from "$modules/detailLink/types/genericDetailStoreVM";
import { type ActionTypeValue } from "$modules/links/types/action/actionType";
import { LinkState } from "$modules/links/types/link/linkState";

export class DetailStoreViewModelAdapter implements GenericDetailStoreVM {
  constructor(private detailStore: LinkDetailStore) {}

  get link() {
    return this.detailStore.link;
  }

  get action() {
    return this.detailStore.action;
  }

  get state() {
    if (!this.detailStore.link) {
      return LinkState.CREATE_LINK;
    }
    return this.detailStore.link?.state;
  }

  async createAction(actionType: ActionTypeValue) {
    return this.detailStore.createAction(actionType);
  }

  async processAction() {
    if (!this.detailStore.action) {
      return {
        action: undefined,
        isSuccess: false,
        errors: ["No action available"],
      };
    }
    try {
      const result = await this.detailStore.processAction();
      return {
        action: result.action,
        isSuccess: result.isSuccess,
        errors: result.errors,
      };
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : "An error occurred while processing the action";
      return {
        action: undefined,
        isSuccess: false,
        errors: [message],
      };
    }
  }

  async disableLink() {
    await this.detailStore.disableLink();
  }

  async refreshAsync() {
    await this.detailStore.query.refreshAsync();
  }

  get gates() {
    return undefined;
  }

  // syncAssetBalanceCache is not supported for V2 links
  syncAssetBalanceCache = undefined;
}
