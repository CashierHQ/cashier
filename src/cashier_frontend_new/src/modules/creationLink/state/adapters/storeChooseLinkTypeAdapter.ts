import { LinkCreationStore } from "$modules/creationLink/state/linkCreationStore.svelte";
import { type ChooseLinkTypeVM } from "$modules/creationLink/types/chooseLinkType";
import { type GenericLinkStore } from "$modules/creationLink/types/genericLinkStore";
import type { LinkTypeValue } from "$modules/links/types/link/linkType";
import type { LinkStep } from "$modules/links/types/linkStep";

export class CreationStoreChooseLinkTypeAdapter
  implements ChooseLinkTypeVM, GenericLinkStore
{
  private linkStore: LinkCreationStore;

  constructor(store: LinkCreationStore) {
    this.linkStore = store;
  }

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
