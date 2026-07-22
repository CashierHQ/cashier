import { WalletViewType, type WalletView } from "$modules/shared/types/wallet";
import { WalletTab } from "$modules/wallet/types";

/**
 * Local navigation state for the wallet drawer.
 *
 * This is intentionally instantiated by WalletDrawer instead of exported as a
 * singleton. Wallet navigation history is ephemeral UI state and should reset
 * with each drawer lifecycle.
 */
export class WalletNavigationState {
  currentView = $state<WalletView>({ type: WalletViewType.MAIN });
  currentMainTab = $state<WalletTab>(WalletTab.TOKENS);
  mainViewHasNestedPage = $state(false);
  #viewHistory = $state<WalletView[]>([]);

  reset() {
    this.currentView = { type: WalletViewType.MAIN };
    this.currentMainTab = WalletTab.TOKENS;
    this.mainViewHasNestedPage = false;
    this.#viewHistory = [];
  }

  switchMainTab(tab: WalletTab) {
    this.currentMainTab = tab;
    this.currentView = { type: WalletViewType.MAIN, tab };
    this.mainViewHasNestedPage = false;
    this.#viewHistory = [];
  }

  navigateBack() {
    const previousView = this.#viewHistory[this.#viewHistory.length - 1];

    if (!previousView) {
      this.#setCurrentView(this.#getCurrentMainView());
      return;
    }

    this.#viewHistory = this.#viewHistory.slice(0, -1);
    this.#setCurrentView(previousView);
  }

  navigateToToken(token: string) {
    this.#navigateToView({ type: WalletViewType.TOKEN, token });
  }

  navigateToSwap(token?: string) {
    void token;
    this.#navigateToView(this.#getCurrentMainView());
  }

  navigateToReceive(token?: string) {
    this.#navigateToView({ type: WalletViewType.RECEIVE, token });
  }

  navigateToNftReceive(collectionId?: string) {
    this.#navigateToView(
      { type: WalletViewType.NFT_RECEIVE, collectionId },
      this.#getCurrentMainView(collectionId),
    );
  }

  navigateToNftSend(collectionId?: string, tokenId?: bigint) {
    this.#navigateToView(
      { type: WalletViewType.NFT_SEND, collectionId, tokenId },
      collectionId
        ? this.#getCurrentMainView(collectionId, tokenId)
        : this.#getCurrentMainView(),
    );
  }

  navigateToSend(token?: string) {
    this.#navigateToView({ type: WalletViewType.SEND, token });
  }

  navigateToImport() {
    this.#navigateToView({ type: WalletViewType.IMPORT });
  }

  navigateToManage() {
    this.#navigateToView({ type: WalletViewType.MANAGE });
  }

  navigateToManageCollections() {
    this.#navigateToView({ type: WalletViewType.MANAGE_COLLECTIONS });
  }

  setMainNestedView(isNested: boolean) {
    this.mainViewHasNestedPage = isNested;
  }

  #getCurrentMainView(
    selectedCollectionId?: string,
    selectedTokenId?: bigint,
  ): WalletView {
    return {
      type: WalletViewType.MAIN,
      tab: this.currentMainTab,
      selectedCollectionId,
      selectedTokenId,
    };
  }

  #setCurrentView(view: WalletView) {
    this.currentView = view;

    if (view.type === WalletViewType.MAIN && view.tab) {
      this.currentMainTab = view.tab;
    }

    this.mainViewHasNestedPage =
      view.type === WalletViewType.MAIN &&
      (view.selectedCollectionId !== undefined ||
        view.selectedTokenId !== undefined);
  }

  #navigateToView(view: WalletView, fromView?: WalletView) {
    this.#viewHistory = [...this.#viewHistory, fromView ?? this.currentView];
    this.#setCurrentView(view);
  }
}
