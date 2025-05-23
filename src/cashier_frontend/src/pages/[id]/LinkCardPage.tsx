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

import LinkCardWithoutPhoneFrame from "@/components/link-card-without-phone-frame";
import {
    getDisplayComponentForLink,
    getHeaderInfoForLink,
    getClaimButtonLabel,
    getMessageForLink,
    getTitleForLink,
} from "@/components/page/linkCardPage";
import { useTokens } from "@/hooks/useTokens";
import { LINK_TYPE } from "@/services/types/enum";
import { LinkDetailModel } from "@/services/types/link.service.types";
import { FC } from "react";
import { PiWallet } from "react-icons/pi";

type LinkCardPageProps = {
    linkData?: LinkDetailModel;
    onClickClaim?: () => void;
};

export const LinkCardPage: FC<LinkCardPageProps> = ({ linkData, onClickClaim }) => {
    const { getToken } = useTokens();

    const linkHeaderInfo = getHeaderInfoForLink(linkData);

    return (
        <LinkCardWithoutPhoneFrame
            label={getClaimButtonLabel(linkData)}
            displayComponent={getDisplayComponentForLink(linkData, getToken)}
            message={getMessageForLink(linkData, getToken)}
            title={getTitleForLink(linkData, getToken)}
            onClaim={onClickClaim}
            disabled={linkData === undefined}
            showHeader={true}
            headerText={linkHeaderInfo.headerText}
            headerIcon={linkHeaderInfo.headerIcon}
            headerColor={linkHeaderInfo.headerColor}
            headerTextColor={linkHeaderInfo.headerTextColor}
        />
    );
};
