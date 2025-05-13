import { ReactNode } from "react";
import { LinkDetailModel } from "../../services/types/link.service.types";
import { LINK_TYPE } from "../../services/types/enum";
import { FungibleToken } from "@/types/fungible-token.speculative";
import { AssetAvatarV2 } from "../ui/asset-avatar";

export const getTitleForLink = (
    linkData?: LinkDetailModel,
    getToken?: (tokenAddress: string) => FungibleToken | undefined,
) => {
    if (!linkData || !getToken) return "";

    const tokenAddress = linkData?.asset_info?.[0]?.address;
    const token = tokenAddress ? getToken(tokenAddress) : undefined;

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

export const getMessageForLink = (
    linkData?: LinkDetailModel,
    getToken?: (tokenAddress: string) => FungibleToken | undefined,
    isClaimed?: boolean,
) => {
    if (!linkData) return "";

    if (linkData?.linkType === LINK_TYPE.RECEIVE_PAYMENT && getToken) {
        const tokenAddress = linkData?.asset_info?.[0]?.address;
        const token = tokenAddress ? getToken(tokenAddress) : undefined;
        const amount =
            Number(linkData?.asset_info?.[0]?.amountPerUse) / 10 ** (token?.decimals ?? 0);
        return `You have been requested to pay the amount of ${amount} ${token?.symbol}`;
    }

    switch (linkData?.linkType) {
        case LINK_TYPE.SEND_TIP:
            return `Congratulations, you ${isClaimed ? "claimed" : "received"} a tip!`;
        case LINK_TYPE.SEND_AIRDROP:
            return `Congratulations, you ${isClaimed ? "claimed" : "received"} an airdrop!`;
        case LINK_TYPE.SEND_TOKEN_BASKET:
            return `Congratulations, you ${isClaimed ? "claimed" : "received"} a token basket!`;
        default:
            return "";
    }
};

export const getDisplayComponentForLink = (
    linkData?: LinkDetailModel,
    getToken?: (tokenAddress: string) => FungibleToken | undefined,
): ReactNode => {
    if (!linkData || !getToken) return null;

    const tokenAddress = linkData?.asset_info?.[0]?.address;
    const token = tokenAddress ? getToken(tokenAddress) : undefined;
    // Extract logoFallback from token or use a default fallback image
    const logoFallback = token?.logoFallback || "/defaultLinkImage.png";

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
                return { ...getToken(asset.address)!, amount: asset.amountPerUse };
            });
            return (
                <div className="w-[200px] min-h-[200px] bg-white rounded-2xl p-4 flex flex-col gap-4">
                    {tokens?.map((token, index) => (
                        <div key={index} className="flex items-center">
                            <AssetAvatarV2 token={token} className="w-8 h-8 rounded-sm" />
                            <p className="text-[18px] font-normal ml-2">
                                {Number(token.amount) / 10 ** (token?.decimals ?? 0)}{" "}
                                {token.symbol || "Token"}
                            </p>
                        </div>
                    ))}
                </div>
            );
        default:
            return null;
    }
};

export const getHeaderTextForLink = (linkData?: LinkDetailModel): string => {
    if (!linkData) return "";

    switch (linkData?.linkType) {
        case LINK_TYPE.SEND_AIRDROP:
            return `${linkData.useActionCounter}/${linkData.maxActionNumber} claimed`;
        default:
            return "";
    }
};
