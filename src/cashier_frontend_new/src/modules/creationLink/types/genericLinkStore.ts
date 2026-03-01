import type { LinkStep } from "$modules/links/types/linkStep";

export type GenericLinkStore = {
  step: LinkStep;
  goNext: () => Promise<void>;
  goBack: () => Promise<void>;
};
