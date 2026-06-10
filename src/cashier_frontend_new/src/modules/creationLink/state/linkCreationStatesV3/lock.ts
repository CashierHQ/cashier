import type { LinkCreationStateV3 } from "$modules/creationLink/state/linkCreationStatesV3";
import { AddAssetStateV3 } from "$modules/creationLink/state/linkCreationStatesV3/addAsset";
import { PreviewStateV3 } from "$modules/creationLink/state/linkCreationStatesV3/preview";
import type { LinkCreationStoreV3 } from "$modules/creationLink/state/linkCreationStoreV3.svelte";
import { LinkStep } from "$modules/links/types/linkStep";

export class LockStateV3 implements LinkCreationStateV3 {
  readonly step = LinkStep.LOCK;
  #linkStore: LinkCreationStoreV3;

  constructor(linkStore: LinkCreationStoreV3) {
    this.#linkStore = linkStore;
  }

  async goNext(): Promise<void> {
    this.#linkStore.state = new PreviewStateV3(this.#linkStore);
  }

  async goBack(): Promise<void> {
    this.#linkStore.state = new AddAssetStateV3(this.#linkStore);
  }
}
