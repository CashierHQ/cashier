import { TEMPLATE } from "@/types/template";
import { LINK_TEMPLATE_DESCRIPTION_MESSAGE } from "./message";
import { LINK_TYPE } from "@/services/types/enum";

export const LINK_TEMPLATES: TEMPLATE[] = [
    {
        label: "Claim",
        header: "Tip",
        src: "/icpLogo.png",
        message: LINK_TEMPLATE_DESCRIPTION_MESSAGE.TIP,
        title: "Tipping crypto",
        linkType: LINK_TYPE.SEND_TIP,
    },
    {
        label: "Claim",
        header: "Airdrop",
        src: "/chatToken.png",
        message: LINK_TEMPLATE_DESCRIPTION_MESSAGE.AIRDROP,
        title: "Airdrop",
        isComingSoon: false,
        linkType: LINK_TYPE.SEND_AIRDROP,
    },
    {
        label: "Claim",
        header: "Token basket",
        src: "/tokenBasket.png",
        message: LINK_TEMPLATE_DESCRIPTION_MESSAGE.TOKEN_BASKET,
        title: "Token basket",
        isComingSoon: false,
        linkType: LINK_TYPE.SEND_TOKEN_BASKET,
    },
    {
        label: "Receive",
        header: "Receive payment",
        src: "/chatToken.png",
        message: LINK_TEMPLATE_DESCRIPTION_MESSAGE.RECEIVE_PAYMENT,
        title: "Receive payment",
        isComingSoon: false,
        linkType: LINK_TYPE.RECEIVE_PAYMENT,
    },
];
