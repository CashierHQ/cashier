import { LinkDetailStoreV3 } from "$modules/detailLink/state/linkDetailStoreV3.svelte";
import { type GenericDetailStoreVM } from "$modules/detailLink/types/genericDetailStoreVM";
import { ActionMapper } from "$modules/links/types/action/action";
import {
  ActionTypeMapper,
  type ActionTypeValue,
} from "$modules/links/types/action/actionType";
import {
  LinkState,
  LinkStateMapper,
} from "$modules/links/types/link/linkState";

export class DetailStoreV3ViewModelAdapter implements GenericDetailStoreVM {
  constructor(private detailStore: LinkDetailStoreV3) {}

  get link() {
    return this.detailStore.link;
  }

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
    if (!this.detailStore.sharedLink) {
      return LinkState.CREATE_LINK;
    }
    return LinkStateMapper.fromSharedLinkState(
      this.detailStore.sharedLink?.link_state,
    );
  }

  async createAction(actionType: ActionTypeValue) {
    const result = await this.detailStore.createAction(
      ActionTypeMapper.toSharedType(actionType),
    );

    const icrc112_requests = result.icrc112_requests ?? [];
    return ActionMapper.fromSharedAction(result.action, icrc112_requests);
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
    } catch {
      return {
        action: undefined,
        isSuccess: false,
        errors: ["An error occurred"],
      };
    }
  }

  async disableLink() {
    await this.detailStore.disableLink();
  }

  async refreshAsync() {
    await this.detailStore.query.refreshAsync();
  }
}
