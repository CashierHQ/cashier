import { type LinkTypeValue } from "$modules/links/types/link/linkType";

/**
 * ChooseLinkType view model
 */
export type ChooseLinkTypeVM = {
  title: string;
  setTitle: (title: string) => void;
  resetForTypeChange: (type: LinkTypeValue) => void;
};
