import LinkCardWithoutPhoneFrame from "@/components/link-card-without-phone-frame";
import { AssetAvatarV2 } from "@/components/ui/asset-avatar";
import { useTokens } from "@/hooks/useTokens";
import { LINK_TYPE } from "@/services/types/enum";
import { LinkDetailModel } from "@/services/types/link.service.types";
import { FC } from "react";
import {
    getMessageForLink,
    getTitleForLink,
    getDisplayComponentForLink,
    getHeaderTextForLink,
} from "./LinkCardPageUtils";

type LinkCardPageProps = {
    linkData?: LinkDetailModel;
    onClickClaim?: () => void;
};

export const LinkCardPage: FC<LinkCardPageProps> = ({ linkData, onClickClaim }) => {
    const { getToken } = useTokens();

    return (
        <LinkCardWithoutPhoneFrame
            label="Claim"
            displayComponent={getDisplayComponentForLink(linkData, getToken)}
            message={getMessageForLink(linkData, getToken)}
            title={getTitleForLink(linkData, getToken)}
            onClaim={onClickClaim}
            disabled={linkData === undefined}
            showHeader={linkData?.linkType === LINK_TYPE.SEND_AIRDROP}
            headerText={getHeaderTextForLink(linkData)}
        />
    );
};
