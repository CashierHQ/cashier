import { type ActionTypeValue } from "$modules/links/types/action/actionType";
import { UserLinkStore } from "$modules/useLink/state/userLinkStore.svelte";
import { type GenericUserLinkStoreVM } from "$modules/useLink/types/viewModels/genericUserLinkStoreVM";

export class UserLinkStoreViewModelAdapter implements GenericUserLinkStoreVM {
  constructor(private userLinkStore: UserLinkStore) {}

  get link() {
    return this.userLinkStore.link ?? undefined;
  }

  get action() {
    return this.userLinkStore.action ?? undefined;
  }

  get state() {
    return this.userLinkStore.state;
  }

  get step() {
    return this.userLinkStore.step;
  }

  get link_user_state() {
    if (!this.userLinkStore.query.data) {
      return undefined;
    }
    return this.userLinkStore.query.data.link_user_state;
  }

  async createAction(actionType: ActionTypeValue) {
    return this.userLinkStore.createAction(actionType);
  }

  async processAction() {
    return this.userLinkStore.processAction();
  }

  async goNext() {
    await this.userLinkStore.state.goNext();
  }

  async goBack() {
    await this.userLinkStore.state.goBack();
  }

  async goToLanding() {
    await this.userLinkStore.state.goToLanding();
  }

  findUseActionType(): ActionTypeValue | null {
    return this.userLinkStore.findUseActionType();
  }

  async refreshAsync() {
    await this.userLinkStore.query.refreshAsync();
  }
}
