import { ActionMapper } from "$modules/links/types/action/action";
import { type ActionTypeValue } from "$modules/links/types/action/actionType";
import { UserLinkStoreV3 } from "$modules/useLink/state/userLinkStoreV3.svelte";
import { type GenericUserLinkStoreVM } from "$modules/useLink/types/viewModels/genericUserLinkStoreVM";

export class UserLinkStoreV3ViewModelAdapter implements GenericUserLinkStoreVM {
  constructor(private userLinkStoreV3: UserLinkStoreV3) {}

  get link() {
    return this.userLinkStoreV3.link ?? undefined;
  }

  get action() {
    return this.userLinkStoreV3.action ?? undefined;
  }

  get completedActions() {
    return this.userLinkStoreV3.linkDetail.completedActions;
  }

  get state() {
    return this.userLinkStoreV3.state;
  }

  get step() {
    return this.userLinkStoreV3.step;
  }

  get canGoBack() {
    return this.userLinkStoreV3.canGoBack;
  }

  async createAction(actionType: ActionTypeValue) {
    const result = await this.userLinkStoreV3.createAction(actionType);

    const icrc112_requests = result.icrc112_requests ?? [];
    return ActionMapper.fromSharedAction(result.action, icrc112_requests);
  }

  async processAction() {
    if (!this.userLinkStoreV3.action) {
      return {
        action: undefined,
        isSuccess: false,
        errors: ["No action available"],
      };
    }

    const result = await this.userLinkStoreV3.processAction();

    return {
      action: ActionMapper.fromSharedAction(
        result.action,
        result.icrc112_requests,
      ),
      isSuccess: result.isSuccess,
      errors: result.errors,
    };
  }

  async goNext() {
    await this.userLinkStoreV3.state.goNext();
  }

  async goBack() {
    await this.userLinkStoreV3.state.goBack();
  }

  async goToLanding() {
    await this.userLinkStoreV3.state.goToLanding();
  }

  findUseActionType(): ActionTypeValue | null {
    return this.userLinkStoreV3.findUseActionType();
  }

  async refreshAsync() {
    await this.userLinkStoreV3.query.refreshAsync();
  }
}
