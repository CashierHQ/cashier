import { LinkCreationStoreV3 } from "$modules/creationLink/state/linkCreationStoreV3.svelte";
import { type AddAssetVM } from "$modules/creationLink/types/viewModels/addAssetVM";
import { type ChooseLinkTypeVM } from "$modules/creationLink/types/viewModels/chooseLinkTypeVM";
import type { GenericCreationLinkStoreVM } from "$modules/creationLink/types/viewModels/genericCreationLinkStoreVM";
import {
  AddAssetItemMapper,
  type AddAssetItem,
} from "$modules/creationLink/types/viewModels/genericCreationLinkStoreVM";
import { ActionMapper } from "$modules/links/types/action/action";
import {
  LinkTypeMapper,
  type LinkTypeValue,
} from "$modules/links/types/link/linkType";
import type { LinkStep } from "$modules/links/types/linkStep";

export class CreationStoreV3ViewModelAdapter
  implements ChooseLinkTypeVM, GenericCreationLinkStoreVM, AddAssetVM
{
  constructor(private linkStore: LinkCreationStoreV3) {}

  // choose link type methods
  get title(): string {
    return this.linkStore.draftLink.title;
  }

  setTitle(title: string) {
    this.linkStore.draftLink = {
      ...this.linkStore.draftLink,
      title,
    };
  }

  get linkType(): LinkTypeValue {
    return LinkTypeMapper.fromSharedLinkType(
      this.linkStore.draftLink.link_type,
    );
  }

  setLinkType(linkType: LinkTypeValue) {
    const sharedLinkType = LinkTypeMapper.toSharedLinkType(linkType);
    this.linkStore.draftLink = {
      ...this.linkStore.draftLink,
      link_type: sharedLinkType,
    };
  }

  resetForTypeChange(type: LinkTypeValue) {
    const sharedLinkType = LinkTypeMapper.toSharedLinkType(type);
    this.linkStore.draftLink = {
      ...this.linkStore.draftLink,
      link_type: sharedLinkType,
      asset_info: [],
      max_use: 1n,
    };
  }

  // add asset methods
  get assets() {
    return this.linkStore.draftLink.asset_info.map((asset) =>
      AddAssetItemMapper.fromSharedAssetInfo(asset),
    );
  }

  get maxUse() {
    return Number(this.linkStore.draftLink.max_use);
  }

  setAssets(assets: AddAssetItem[]) {
    this.linkStore.setAssets(assets);
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
    this.linkStore.draftLink = {
      ...this.linkStore.draftLink,
      max_use: BigInt(value),
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
  get id() {
    return this.linkStore.draftLink.id;
  }

  get backendId() {
    return this.linkStore.backendLink?.id;
  }

  get step(): LinkStep {
    return this.linkStore.state.step;
  }

  get createLinkData() {
    const assets = this.linkStore.draftLink.asset_info.map((asset) =>
      AddAssetItemMapper.fromSharedAssetInfo(asset),
    );

    return {
      title: this.linkStore.draftLink.title,
      linkType: LinkTypeMapper.fromSharedLinkType(
        this.linkStore.draftLink.link_type,
      ),
      assets,
      maxUse: this.maxUse,
    };
  }

  get action() {
    if (!this.linkStore.backendAction) return undefined;

    console.log("backend action", this.linkStore.backendAction);
    return ActionMapper.fromSharedAction(
      this.linkStore.backendAction,
      this.linkStore.icrc112Requests,
    );
  }

  goNext: () => Promise<void> = async () => {
    await this.linkStore.state.goNext();
  };

  goBack: () => Promise<void> = async () => {
    await this.linkStore.state.goBack();
  };
}
