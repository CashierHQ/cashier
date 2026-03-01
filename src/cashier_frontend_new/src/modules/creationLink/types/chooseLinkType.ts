import { type LinkTypeValue } from "$modules/links/types/link/linkType";
import { LinkStep } from "$modules/links/types/linkStep";

export type ChooseLinkTypeVM = {
  title: string;
  linkType: LinkTypeValue;
  step: LinkStep;
  setTitle: (title: string) => void;
  setLinkType: (type: LinkTypeValue) => void;
  resetForTypeChange: (type: LinkTypeValue) => void;
};
