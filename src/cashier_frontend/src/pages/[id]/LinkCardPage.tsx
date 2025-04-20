import LinkCardWithoutPhoneFrame from "@/components/link-card-without-phone-frame";
import { useTokens } from "@/hooks/useTokens";
import { LinkDetailModel } from "@/services/types/link.service.types";
import { getTokenImage } from "@/utils";
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
    const tokenLogo = token?.logo || getTokenImage(tokenAddress ?? "");

    return (
        <LinkCardWithoutPhoneFrame
            label="Claim"
            src={tokenLogo}
            message={linkData?.description ?? ""}
            title={linkData?.title ?? ""}
            onClaim={onClickClaim}
            disabled={linkData === undefined}
            logoFallback={token?.logoFallback}
        />
    );
};
