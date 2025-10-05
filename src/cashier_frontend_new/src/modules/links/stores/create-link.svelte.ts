import { LinkType, type CreateLinkData } from "../types";

export type TipLink = {
  asset: string;
  amount: number;
};

const createLinkData: CreateLinkData = $state({
  title: "",
  linkType: LinkType.TIP,
});

export const createLinkState = {
  get createLinkData() {
    return createLinkData;
  },

  set createLinkData(v: CreateLinkData) {
    createLinkData.title = v.title ?? createLinkData.title;
    createLinkData.linkType = v.linkType ?? createLinkData.linkType;
  },
};

export default createLinkState;
