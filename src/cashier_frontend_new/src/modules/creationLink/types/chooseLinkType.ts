import { type LinkTypeValue } from "$modules/links/types/link/linkType";

export type ChooseLinkTypeVM = {
  title: string;
  setTitle: (title: string) => void;
  resetForTypeChange: (type: LinkTypeValue) => void;
};
