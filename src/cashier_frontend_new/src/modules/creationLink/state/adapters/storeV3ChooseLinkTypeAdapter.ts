import { LinkCreationStoreV3 } from "$modules/creationLink/state/linkCreationStoreV3.svelte";
import { type ChooseLinkTypeVM } from "$modules/creationLink/types/chooseLinkType";
import type { GenericLinkStore } from "$modules/creationLink/types/genericLinkStore";
import {
  type LinkTypeValue,
  LinkTypeMapper,
} from "$modules/links/types/link/linkType";
import type { LinkStep } from "$modules/links/types/linkStep";

export class CreationStoreV3ChooseLinkTypeAdapter
  implements ChooseLinkTypeVM, GenericLinkStore
{
  private linkStore: LinkCreationStoreV3;

  constructor(store: LinkCreationStoreV3) {
    this.linkStore = store;
  }

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

  get step(): LinkStep {
    return this.linkStore.state.step;
  }

  goNext: () => Promise<void> = async () => {
    await this.linkStore.state.goNext();
  };

  goBack: () => Promise<void> = async () => {
    await this.linkStore.state.goBack();
  };
}
