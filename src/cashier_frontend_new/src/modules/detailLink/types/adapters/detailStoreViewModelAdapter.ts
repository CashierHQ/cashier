import { LinkDetailStore } from "$modules/detailLink/state/linkDetailStore.svelte";
import { type GenericDetailStoreVM } from "$modules/detailLink/types/genericDetailStoreVM";
import { LinkState } from "$modules/links/types/link/linkState";

export class DetailStoreViewModelAdapter implements GenericDetailStoreVM {
  constructor(private detailStore: LinkDetailStore) {}

  get action() {
    return this.detailStore.action;
  }

  get state() {
    if (!this.detailStore.link) {
      return LinkState.CREATE_LINK;
    }
    return this.detailStore.link?.state;
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
      return {
        action: undefined,
        isSuccess: false,
        errors: ["An error occurred"],
      };
    }
  }
}
