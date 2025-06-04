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

import { ReactNode, useEffect, useState } from "react";
import { LinkDetailModel } from "../../services/types/link.service.types";
import { LINK_TYPE } from "../../services/types/enum";
import { FungibleToken } from "@/types/fungible-token.speculative";
import { AssetAvatarV2 } from "../ui/asset-avatar";
import { formatNumber } from "@/utils/helpers/currency";
import { ArrowDownFromLine, ArrowDownToLine, ArrowUpFromLine, Wallet2 } from "lucide-react";

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
                <div className="w-[100px] min-h-[100px] bg-white rounded-2xl p-4 flex flex-col gap-4">
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
                <div className="w-[100px] h-[100px] rounded-3xl bg-gray-200 animate-pulse flex items-center justify-center">
                    <div className="w-10 h-10 rounded-full bg-gray-300" />
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

export const getClaimButtonLabel = (linkData?: LinkDetailModel): string => {
    if (!linkData) return "";

    switch (linkData?.linkType) {
        case LINK_TYPE.RECEIVE_PAYMENT:
            return "Pay";
        default:
            return "Claim";
    }
};
