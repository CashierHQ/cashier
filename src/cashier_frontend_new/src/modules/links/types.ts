export enum LinkType {
  TIP = "SendTip",
  AIRDROP = "SendAirdrop",
  TOKEN_BASKET = "SendTokenBasket",
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
