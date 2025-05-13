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

    // Get token data and image
    const tokenAddress = linkData?.asset_info?.[0]?.address;
    const token = tokenAddress ? getToken(tokenAddress) : undefined;
    // Use the token.logo as primary source and getTokenImage as an immediate fallback
    const tokenLogo = token?.logo;
    // Extract logoFallback from token or use a default fallback image
    const logoFallback = token?.logoFallback || "/defaultLinkImage.png";

    console.log("LinkCardPage tokenLogo: ", tokenLogo);
    console.log("LinkCardPage logoFallback: ", logoFallback);

    console.log("LinkCardPage linkData: ", linkData);

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
