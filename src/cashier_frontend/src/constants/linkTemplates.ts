import { TEMPLATE } from "@/types/template";
import { LINK_TEMPLATE_DESCRIPTION_MESSAGE } from "./message";

export const LINK_TEMPLATES: TEMPLATE[] = [
    {
        label: "Claim",
        header: "Tip",
        src: "/link_tipping.png",
        message: LINK_TEMPLATE_DESCRIPTION_MESSAGE.TIP,
        title: "Tipping crypto",
    },
    {
        label: "Claim",
        header: "Airdrop",
        src: "/chatToken.png",
        message: LINK_TEMPLATE_DESCRIPTION_MESSAGE.AIRDROP,
        title: "Airdrop",
        isComingSoon: true,
    },
    {
        label: "Claim",
        header: "Token basket",
        src: "/tokenBasket.png",
        message: LINK_TEMPLATE_DESCRIPTION_MESSAGE.TOKEN_BASKET,
        title: "Token basket",
        isComingSoon: true,
    },
];
