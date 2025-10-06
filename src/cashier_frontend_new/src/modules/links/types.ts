// Enum for link types
export enum LinkType {
  TIP = "SendTip",
  AIRDROP = "SendAirdrop",
  TOKEN_BASKET = "SendTokenBasket",
}

// Tip link details
export type TipLink = {
  asset: string;
  amount: number;
};

// Data required to create a new link
export type CreateLinkData = {
  title: string;
  linkType: LinkType;
  tipLink?: TipLink;
};
