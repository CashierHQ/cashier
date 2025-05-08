import LinkCardWithoutPhoneFrame from "@/components/link-card-without-phone-frame";
import { useTokens } from "@/hooks/useTokens";
import { LinkDetailModel } from "@/services/types/link.service.types";
import { FC } from "react";

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

    return (
        <LinkCardWithoutPhoneFrame
            label="Claim"
            src={tokenLogo}
            message={linkData?.description ?? ""}
            title={linkData?.title ?? ""}
            onClaim={onClickClaim}
            disabled={linkData === undefined}
            logoFallback={logoFallback}
        />
    );
};
