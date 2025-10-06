export enum LinkType {
  TIP = "SendTip",
  AIRDROP = "SendAirdrop",
  TOKEN_BASKET = "SendTokenBasket",
}

export enum LinkStep {
  CHOOSE_TYPE,
  ADD_ASSET,
  PREVIEW,
  CREATED,
}

export type TipLink = {
  asset: string;
  amount: number;
};

export type CreateLinkData = {
  title: string;
  linkType: LinkType;
  tipLink?: TipLink;
};
