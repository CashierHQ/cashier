import {
  LinkType,
  type LinkTypeValue,
} from "$modules/links/types/link/linkType";
import { locale } from "$lib/i18n";

export function getLinkTemplateInfo(type: LinkTypeValue) {
  switch (type) {
    case LinkType.TIP:
      return {
        label: locale.t("links.linkForm.chooseType.tip"),
        image: "/icpLogo.png",
        title: locale.t("links.linkForm.chooseType.preview.tip.title"),
        description: locale.t(
          "links.linkForm.chooseType.preview.tip.description",
        ),
        buttonText: locale.t("links.linkForm.chooseType.preview.claimButton"),
      };
    case LinkType.AIRDROP:
      return {
        label: locale.t("links.linkForm.chooseType.airdrop"),
        image: "/chatToken.png",
        title: locale.t("links.linkForm.chooseType.preview.airdrop.title"),
        description: locale.t(
          "links.linkForm.chooseType.preview.airdrop.description",
        ),
        buttonText: locale.t("links.linkForm.chooseType.preview.claimButton"),
      };
    case LinkType.TOKEN_BASKET:
      return {
        label: locale.t("links.linkForm.chooseType.tokenBasket"),
        image: "/tokenBasket.png",
        title: locale.t("links.linkForm.chooseType.preview.tokenBasket.title"),
        description: locale.t(
          "links.linkForm.chooseType.preview.tokenBasket.description",
        ),
        buttonText: locale.t("links.linkForm.chooseType.preview.claimButton"),
      };
    case LinkType.RECEIVE_PAYMENT:
      return {
        label: locale.t("links.linkForm.chooseType.receivePayment"),
        image: "/ckUSDCLogo.svg",
        title: locale.t(
          "links.linkForm.chooseType.preview.receivePayment.title",
        ),
        description: locale.t(
          "links.linkForm.chooseType.preview.receivePayment.description",
        ),
        buttonText: locale.t("links.linkForm.chooseType.preview.payButton"),
      };
  }
}
