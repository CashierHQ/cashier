import LinkCardWithoutPhoneFrame from "@/components/link-card-without-phone-frame";
import { AssetAvatarV2 } from "@/components/ui/asset-avatar";
import { useTokens } from "@/hooks/useTokens";
import { LINK_TYPE } from "@/services/types/enum";
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

    console.log("LinkCardPage linkData: ", linkData);

    const getTitleForLink = () => {
        switch (linkData?.linkType) {
            case LINK_TYPE.SEND_TIP:
            case LINK_TYPE.SEND_AIRDROP:
            case LINK_TYPE.RECEIVE_PAYMENT:
                const amount =
                    Number(linkData?.asset_info?.[0]?.amountPerUse) / 10 ** (token?.decimals ?? 0);
                return `${amount} ${token?.symbol}`;
            case LINK_TYPE.SEND_AIRDROP:
                return "Send Airdrop";
            case LINK_TYPE.SEND_TOKEN_BASKET:
                return "";
            default:
                return "";
        }
    };

    const getMessageForLink = () => {
        switch (linkData?.linkType) {
            case LINK_TYPE.SEND_TIP:
                return "Congratulations, you received a tip!";
            case LINK_TYPE.SEND_AIRDROP:
                return "Congratulations, you received an airdrop!";
            case LINK_TYPE.SEND_TOKEN_BASKET:
                return "Congratulations, you received a token basket!";
            case LINK_TYPE.RECEIVE_PAYMENT:
                const amount =
                    Number(linkData?.asset_info?.[0]?.amountPerUse) / 10 ** (token?.decimals ?? 0);
                return `You have been requested to pay the amount of ${amount} ${token?.symbol}`;
            default:
                return "";
        }
    };

    const getDisplayComponentForLink = () => {
        switch (linkData?.linkType) {
            case LINK_TYPE.SEND_TIP:
            case LINK_TYPE.SEND_AIRDROP:
            case LINK_TYPE.RECEIVE_PAYMENT:
                return (
                    <img
                        src={token?.logo || logoFallback}
                        alt="Tip Link"
                        className="w-[200px] rounded-3xl"
                        onError={(e) => {
                            console.log("error: ", e);
                            e.currentTarget.src = logoFallback;
                        }}
                    />
                );
            case LINK_TYPE.SEND_TOKEN_BASKET:
                const tokens = linkData?.asset_info?.map((asset) => {
                    return getToken(asset.address)!;
                });
                return (
                    <div className="w-[200px] min-h-[200px] bg-white rounded-2xl p-4 flex flex-col justify-center gap-4">
                        {tokens?.map((token, index) => (
                            <div key={index} className="flex items-center">
                                <AssetAvatarV2 token={token} className="w-8 h-8 rounded-sm" />
                                <p className="text-[20px] font-light ml-2">
                                    {Number(token.amount) / 10 ** (token?.decimals ?? 0)}{" "}
                                    {token.symbol || "Token"}
                                </p>
                            </div>
                        ))}
                    </div>
                );
            default:
                return "";
        }
    };

    const getHeaderTextForLink = () => {
        switch (linkData?.linkType) {
            case LINK_TYPE.SEND_AIRDROP:
                return `${linkData.useActionCounter}/${linkData.maxActionNumber} claimed`;
            default:
                return "";
        }
    };

    return (
        <LinkCardWithoutPhoneFrame
            label="Claim"
            displayComponent={getDisplayComponentForLink()}
            message={getMessageForLink()}
            title={getTitleForLink()}
            onClaim={onClickClaim}
            disabled={linkData === undefined}
            showHeader={linkData?.linkType === LINK_TYPE.SEND_AIRDROP}
            headerText={getHeaderTextForLink()}
        />
    );
};
