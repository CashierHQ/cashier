import { LinkCreationStore } from "$modules/creationLink/state/linkCreationStore.svelte";
import type { AddAssetVM } from "$modules/creationLink/types/viewModels/addAssetVM";
import { type ChooseLinkTypeVM } from "$modules/creationLink/types/viewModels/chooseLinkTypeVM";
import type { AddAssetItem } from "$modules/creationLink/types/viewModels/genericCreationLinkStoreVM";
import { type GenericCreationLinkStoreVM } from "$modules/creationLink/types/viewModels/genericCreationLinkStoreVM";
import type { LinkTypeValue } from "$modules/links/types/link/linkType";
import { LinkStep } from "$modules/links/types/linkStep";

export class CreationStoreViewModelAdapter
  implements ChooseLinkTypeVM, GenericCreationLinkStoreVM, AddAssetVM
{
  constructor(private linkStore: LinkCreationStore) {}

  // choose link type methods
  get title(): string {
    return this.linkStore.createLinkData.title;
  }

  setTitle(title: string) {
    this.linkStore.createLinkData = {
      ...this.linkStore.createLinkData,
      title,
    };
  }

  get linkType(): LinkTypeValue {
    return this.linkStore.createLinkData.linkType;
  }

  setLinkType(linkType: LinkTypeValue) {
    this.linkStore.createLinkData = {
      ...this.linkStore.createLinkData,
      linkType,
    };
  }

  resetForTypeChange(type: LinkTypeValue) {
    this.linkStore.createLinkData = {
      ...this.linkStore.createLinkData,
      linkType: type,
      assets: [],
      maxUse: 1,
    };
  }

  // add asset methods
  get assets() {
    return this.linkStore.createLinkData.assets;
  }

  get maxUse() {
    return this.linkStore.createLinkData.maxUse;
  }

  setAssets(assets: AddAssetItem[]) {
    this.linkStore.createLinkData = {
      ...this.linkStore.createLinkData,
      assets,
    };
  }

  setFirstAsset(asset: AddAssetItem) {
    this.setAssets([asset]);
  }

  setFirstAssetUseAmount(useAmount: bigint) {
    const firstAsset = this.assets[0];
    if (!firstAsset) return;

    this.setAssets([
      {
        ...firstAsset,
        useAmount,
      },
    ]);
  }

  setMaxUse(value: number) {
    this.linkStore.createLinkData = {
      ...this.linkStore.createLinkData,
      maxUse: value,
    };
  }

  increaseMaxUse() {
    this.setMaxUse(this.maxUse + 1);
  }

  decreaseMaxUse() {
    if (this.maxUse > 1) {
      this.setMaxUse(this.maxUse - 1);
    }
  }

  // generic link store methods
  get id(): string | undefined {
    return this.linkStore.id;
  }

  get backendId(): string | undefined {
    if (this.linkStore.state.step === LinkStep.CREATED) {
      return this.linkStore.id;
    }
    return undefined;
  }

  get step(): LinkStep {
    return this.linkStore.state.step;
  }

  get createLinkData() {
    return {
      title: this.linkStore.createLinkData.title,
      linkType: this.linkStore.createLinkData.linkType,
      assets: this.assets,
      maxUse: this.maxUse,
    };
  }

  get action() {
    return this.linkStore.action;
  }

  goNext: () => Promise<void> = async () => {
    await this.linkStore.state.goNext();
  };

  goBack: () => Promise<void> = async () => {
    await this.linkStore.state.goBack();
  };
}
