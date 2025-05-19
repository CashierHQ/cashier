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

    useEffect(() => {
        // Set the image source based on token.logo or logoFallback availability
        setImageSrc(token?.logo || logoFallback);
    }, [token?.logo, logoFallback]);

    return (
        <img
            src={imageSrc}
            alt="Token Image"
            className="w-[200px] rounded-3xl"
            onError={(e) => {
                console.log("error: ", e);
                e.currentTarget.src = logoFallback;
            }}
        />
    );
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
