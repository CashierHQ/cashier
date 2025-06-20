// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { ReactNode, useEffect, useState } from "react";
import { LinkDetailModel } from "../../services/types/link.service.types";
import { LINK_TYPE } from "../../services/types/enum";
import { FungibleToken } from "@/types/fungible-token.speculative";
import { AssetAvatarV2 } from "../ui/asset-avatar";
import { formatNumber } from "@/utils/helpers/currency";
import { ArrowDownToLine, ArrowUpFromLine, Wallet2 } from "lucide-react";
import { Skeleton } from "../ui/skeleton";
import { FeeHelpers } from "@/services/fee.service";

export const getTitleForLink = (
    linkData?: LinkDetailModel,
    getToken?: (tokenAddress: string) => FungibleToken | undefined,
) => {
    if (!linkData || !getToken) return "";

    const tokenAddress = linkData?.asset_info?.[0]?.address;
    const token = getToken(tokenAddress);

    if (!token) return "Unknown Token";

    let amount = Number(linkData?.asset_info?.[0]?.amountPerUse) / 10 ** (token?.decimals ?? 0);
    if (token) {
        amount = FeeHelpers.forecastActualAmountForLinkUsePage(
            linkData?.linkType ?? "",
            token,
            linkData?.asset_info?.[0]?.amountPerUse ?? "0",
            Number(linkData?.maxActionNumber ?? 1),
        );
    }

    switch (linkData?.linkType) {
        case LINK_TYPE.SEND_TIP:
        case LINK_TYPE.SEND_AIRDROP:
        case LINK_TYPE.RECEIVE_PAYMENT:
            return `${amount} ${token?.symbol}`;
        case LINK_TYPE.SEND_AIRDROP:
            return "Send Airdrop";
        case LINK_TYPE.SEND_TOKEN_BASKET:
            return "";
        default:
            return "";
    }
};

export const getDisplayComponentForLink = (
    linkData?: LinkDetailModel,
    getToken?: (tokenAddress: string) => FungibleToken | undefined,
    isLoading?: boolean,
): ReactNode => {
    if (!linkData || !getToken) return null;

    // If tokens are still loading, show skeleton loaders based on link type
    if (isLoading) {
        switch (linkData?.linkType) {
            case LINK_TYPE.SEND_TIP:
            case LINK_TYPE.SEND_AIRDROP:
            case LINK_TYPE.RECEIVE_PAYMENT:
                return (
                    <div className="w-[100px] h-[100px] rounded-3xl bg-primary/10 animate-pulse flex items-center justify-center">
                        <Skeleton className="w-16 h-16 rounded-full" />
                    </div>
                );
            case LINK_TYPE.SEND_TOKEN_BASKET:
                return (
                    <div className="w-[200px] min-h-[200px] bg-white rounded-2xl p-4 flex flex-col gap-4">
                        {Array.from({ length: 3 }).map((_, index) => (
                            <div key={index} className="flex items-center">
                                <Skeleton className="w-8 h-8 rounded-sm" />
                                <div className="ml-2">
                                    <Skeleton className="h-4 w-[100px]" />
                                </div>
                            </div>
                        ))}
                    </div>
                );
            default:
                return null;
        }
    }

    const tokenAddress = linkData?.asset_info?.[0]?.address;
    const token = tokenAddress ? getToken(tokenAddress) : undefined;
    // Extract logoFallback from token or use a default fallback image
    let logoFallback = token?.logoFallback;

    switch (linkData?.linkType) {
        case LINK_TYPE.SEND_TIP:
            logoFallback = "/tip-link-default.svg";
            break;
        case LINK_TYPE.SEND_AIRDROP:
            logoFallback = "/airdrop-default.svg";
            break;
        case LINK_TYPE.SEND_TOKEN_BASKET:
            logoFallback = "/token-basket-default.svg";
            break;
        case LINK_TYPE.RECEIVE_PAYMENT:
            logoFallback = "/receive-payment-default.svg";
            break;
        default:
            logoFallback = "/tip-link-default.svg"; // Fallback for other link types
            break;
    }

    switch (linkData?.linkType) {
        case LINK_TYPE.SEND_TIP:
        case LINK_TYPE.SEND_AIRDROP:
        case LINK_TYPE.RECEIVE_PAYMENT:
            return <TokenImage token={token} logoFallback={logoFallback} />;
        case LINK_TYPE.SEND_TOKEN_BASKET:
            const tokens = linkData?.asset_info?.map((asset) => {
                return { ...getToken(asset.address)!, amount: asset.amountPerUse };
            });
            return (
                <div className="w-[200px] min-h-[200px] bg-white rounded-2xl p-4 flex flex-col gap-4">
                    {tokens
                        ?.sort((a, b) => {
                            return (a.address ?? "").localeCompare(b.address ?? "");
                        })
                        .map((token, index) => {
                            const amount = Number(token.amount) / 10 ** token.decimals;

                            return (
                                <div key={index} className="flex items-center">
                                    <AssetAvatarV2 token={token} className="w-8 h-8 rounded-sm" />
                                    <p className="text-[14px] font-normal ml-2">
                                        {formatNumber(amount.toString())} {token.symbol || "Token"}
                                    </p>
                                </div>
                            );
                        })}
                </div>
            );
        default:
            return null;
    }
};

const TokenImage = ({ token, logoFallback }: { token?: FungibleToken; logoFallback: string }) => {
    const [imageSrc, setImageSrc] = useState<string>("");
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (token?.logo) {
            setImageSrc(token.logo);
        } else {
            setImageSrc(logoFallback);
            setIsLoading(false);
        }
    }, [token?.logo, logoFallback]);

    const handleImageLoad = () => {
        setIsLoading(false);
    };

    const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
        console.log("error: ", e);
        e.currentTarget.src = logoFallback;
        setIsLoading(false);
    };

    return (
        <>
            {isLoading && (
                <div className="w-[100px] h-[100px] rounded-3xl bg-primary/10 animate-pulse flex items-center justify-center">
                    <Skeleton className="w-16 h-16 rounded-full" />
                </div>
            )}
            <img
                src={imageSrc}
                alt="Token Image"
                className={`w-[100px] rounded-3xl ${isLoading ? "hidden" : "block"}`}
                onLoad={handleImageLoad}
                onError={handleImageError}
            />
        </>
    );
};

const headerColors = {
    send: {
        background: "#35A18B",
        text: "#fff",
    },
    receive: {
        background: "#FF8F8F",
        text: "#fff",
    },
    miscellaneous: {
        background: "#8F9EFF",
        text: "#fff",
    },
};

export const getHeaderInfoForLink = (
    linkData?: LinkDetailModel,
): {
    headerText: string;
    headerIcon: ReactNode;
    headerColor: string;
    headerTextColor: string;
} => {
    return {
        headerText: getHeaderTextForLink(linkData),
        headerIcon: getIconForLink(linkData),
        headerColor: getHeaderColorsForLink(linkData),
        headerTextColor: getHeaderTextColorForLink(linkData),
    };
};

export const getHeaderTextForLink = (linkData?: LinkDetailModel): string => {
    if (!linkData) return "";

    switch (linkData?.linkType) {
        case LINK_TYPE.SEND_AIRDROP:
            return `${linkData.useActionCounter}/${linkData.maxActionNumber} claimed`;
        case LINK_TYPE.SEND_TIP:
        case LINK_TYPE.SEND_TOKEN_BASKET:
            return "Receive";
        case LINK_TYPE.RECEIVE_PAYMENT:
            return "Send";
        default:
            return "";
    }
};

export const getIconForLink = (linkData?: LinkDetailModel): ReactNode => {
    if (!linkData) return null;

    switch (linkData?.linkType) {
        case LINK_TYPE.SEND_TIP:
        case LINK_TYPE.SEND_AIRDROP:
        case LINK_TYPE.SEND_TOKEN_BASKET:
            return (
                <ArrowDownToLine
                    className="text-[18px]"
                    color={getHeaderTextColorForLink(linkData)}
                />
            );
        case LINK_TYPE.RECEIVE_PAYMENT:
            return (
                <ArrowUpFromLine
                    className="text-[18px]"
                    color={getHeaderTextColorForLink(linkData)}
                />
            );
        default:
            return <Wallet2 className="text-[18px]" color={getHeaderTextColorForLink(linkData)} />;
    }
};

export const getHeaderColorsForLink = (linkData?: LinkDetailModel): string => {
    if (!linkData) return "";

    switch (linkData?.linkType) {
        case LINK_TYPE.SEND_TIP:
            return headerColors.send.background;
        case LINK_TYPE.SEND_AIRDROP:
            return headerColors.send.background;
        case LINK_TYPE.SEND_TOKEN_BASKET:
            return headerColors.send.background;
        case LINK_TYPE.RECEIVE_PAYMENT:
            return headerColors.receive.background;
        default:
            return headerColors.miscellaneous.background;
    }
};

export const getHeaderTextColorForLink = (linkData?: LinkDetailModel): string => {
    if (!linkData) return "";

    switch (linkData?.linkType) {
        case LINK_TYPE.SEND_TIP:
            return headerColors.send.text;
        case LINK_TYPE.SEND_AIRDROP:
            return headerColors.send.text;
        case LINK_TYPE.SEND_TOKEN_BASKET:
            return headerColors.send.text;
        case LINK_TYPE.RECEIVE_PAYMENT:
            return headerColors.receive.text;
        default:
            return headerColors.miscellaneous.text;
    }
};
