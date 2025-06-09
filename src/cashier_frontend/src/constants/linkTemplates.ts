// Cashier — No-code blockchain transaction builder
// Copyright (C) 2025 TheCashierApp LLC
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

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
        src: "/ckUSDCLogo.svg",
        message: LINK_TEMPLATE_DESCRIPTION_MESSAGE.RECEIVE_PAYMENT,
        title: "Receive payment",
        isComingSoon: false,
        linkType: LINK_TYPE.RECEIVE_PAYMENT,
    },
];
