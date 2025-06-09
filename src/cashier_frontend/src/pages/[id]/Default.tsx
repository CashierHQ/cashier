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
    getTitleForLink,
} from "@/components/page/linkCardPage";
import { useTokens } from "@/hooks/useTokens";
import { LinkDetailModel } from "@/services/types/link.service.types";
import { FC, useMemo } from "react";
import { useTranslation } from "react-i18next";

type LinkCardPageProps = {
    linkData?: LinkDetailModel;
    onClickClaim?: () => void;
    isUserStateLoading?: boolean;
    isLoggedIn?: boolean;
    isCompletePage?: boolean;
};

// page for no state or user is not logged in
export const DefaultPage: FC<LinkCardPageProps> = ({
    linkData,
    onClickClaim,
    isUserStateLoading,
    isLoggedIn = false,
    isCompletePage = false,
}) => {
    const { getToken } = useTokens();
    const { t } = useTranslation();

    const linkHeaderInfo = getHeaderInfoForLink(linkData);

    // Disable the button if:
    // No linkData is available
    const isButtonDisabled = linkData === undefined || isCompletePage;

    const isDataLoading = isLoggedIn && isUserStateLoading;

    const linkLabel = useMemo(() => {
        if (isCompletePage) {
            return t(`claim_page.${linkData?.linkType}.complete_button`, {
                defaultValue: "Unknown! Need to check link type",
            });
        }

        return t(`claim_page.${linkData?.linkType}.use_link_button`, {
            defaultValue: "Unknown! Need to check link type",
        });
    }, [linkData, isCompletePage]);

    const linkMessage = useMemo(() => {
        if (isCompletePage) {
            return t(`claim_page.${linkData?.linkType}.complete_message`, {
                defaultValue: "Unknown! Need to check link type",
            });
        }

        return t(`claim_page.${linkData?.linkType}.use_link_message`, {
            defaultValue: "Unknown! Need to check link type",
        });
    }, [linkData, isCompletePage]);

    console.log("DefaultPage linkData", linkData);

    return (
        <LinkCardWithoutPhoneFrame
            label={linkLabel}
            displayComponent={getDisplayComponentForLink(linkData, getToken)}
            message={linkMessage}
            title={getTitleForLink(linkData, getToken)}
            onClaim={onClickClaim}
            isDataLoading={isDataLoading}
            disabled={isButtonDisabled}
            showHeader={true}
            headerText={linkHeaderInfo.headerText}
            headerIcon={linkHeaderInfo.headerIcon}
            headerColor={linkHeaderInfo.headerColor}
            headerTextColor={linkHeaderInfo.headerTextColor}
        />
    );
};
