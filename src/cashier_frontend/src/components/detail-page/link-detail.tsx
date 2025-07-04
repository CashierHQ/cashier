// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import React from "react";
import { Share2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Label } from "@/components/ui/label";
import { useTokens } from "@/hooks/useTokens";
import { StateBadge } from "../link-item";
import { LinkDetailModel } from "@/services/types/link.service.types";
import { getLinkTypeString, LINK_TYPE } from "@/services/types/enum";
import { AssetAvatarV2 } from "../ui/asset-avatar";
import { formatNumber } from "@/utils/helpers/currency";
import { useLinkAssetBalance, type BalanceItem } from "@/hooks/useLinkAssetBalance";
import { Skeleton } from "../ui/skeleton";

interface LinkDetailProps {
    link: LinkDetailModel;
    onShareClick: () => void;
}

export const LinkDetail: React.FC<LinkDetailProps> = ({ link, onShareClick }) => {
    const { t } = useTranslation();
    const { getToken } = useTokens();
    const { balances, loading, error } = useLinkAssetBalance(link);

    const renderBalancesSkeleton = (): JSX.Element => {
        const skeletonCount = link.asset_info?.length || 1; // Default to 1 if no asset_info
        return (
            <div className="flex flex-col items-end gap-2">
                {Array.from({ length: skeletonCount }, (_, index) => (
                    <div key={`skeleton-${index}`} className="flex items-center gap-2">
                        <Skeleton className="h-4 w-16" />
                        <Skeleton className="h-4 w-4 rounded-full" />
                    </div>
                ))}
            </div>
        );
    };
    // Helper method to check if this is a payment-type link
    const isPaymentLink = (): boolean => {
        return (
            link.linkType === LINK_TYPE.RECEIVE_PAYMENT ||
            link.linkType === LINK_TYPE.RECEIVE_MULTI_PAYMENT
        );
    };

    // Helper method to check if this is a send-type link
    const isSendLink = (): boolean => {
        return (
            link.linkType === LINK_TYPE.SEND_TIP ||
            link.linkType === LINK_TYPE.SEND_AIRDROP ||
            link.linkType === LINK_TYPE.SEND_TOKEN_BASKET ||
            link.linkType === LINK_TYPE.NFT_CREATE_AND_AIRDROP
        );
    };

    // Helper method to render user pays section
    const renderUserPays = (): JSX.Element => {
        if (isPaymentLink()) {
            // For payment links, show the user payment amount
            return (
                <div className="flex flex-col items-end gap-2">
                    {link.asset_info
                        .sort((a, b) => (a.address ?? "").localeCompare(b.address ?? ""))
                        .map((asset, index) => {
                            const token = getToken(asset.address);
                            if (!token) return null;
                            return (
                                <div key={`pay-${index}`} className="flex items-center gap-2">
                                    <p className="text-sm text-primary/80">
                                        {formatNumber(
                                            (
                                                Number(asset.amountPerUse) /
                                                10 ** token.decimals
                                            ).toString(),
                                        )}{" "}
                                        {token.symbol}
                                    </p>
                                    <AssetAvatarV2 token={token} className="w-4 h-4" />
                                </div>
                            );
                        })}
                </div>
            );
        } else {
            // For send links, user pays nothing
            return <p className="text-sm text-primary/80">-</p>;
        }
    };

    // Helper method to render user claims section
    const renderUserClaims = (): JSX.Element => {
        if (isSendLink()) {
            // For send links, show what users can claim
            return (
                <div className="flex flex-col items-end gap-2">
                    {link.asset_info
                        .sort((a, b) => (a.address ?? "").localeCompare(b.address ?? ""))
                        .map((asset, index) => {
                            const token = getToken(asset.address);
                            if (!token) return null;
                            return (
                                <div key={`claim-${index}`} className="flex items-center gap-2">
                                    <p className="text-sm text-primary/80">
                                        {formatNumber(
                                            (
                                                Number(asset.amountPerUse) /
                                                10 ** token.decimals
                                            ).toString(),
                                        )}{" "}
                                        {token.symbol}
                                    </p>
                                    <AssetAvatarV2 token={token} className="w-4 h-4" />
                                </div>
                            );
                        })}
                </div>
            );
        } else {
            // For payment links, user claims nothing
            return <p className="text-sm text-primary/80">-</p>;
        }
    };

    return (
        <>
            <div className="flex gap-2 items-center mb-2 justify-between">
                <Label>{t("details.linkInfo")}</Label>
                <button className="flex items-center justify-center" onClick={onShareClick}>
                    <Share2 color="#35A18B" width={18} height={18} />
                </button>
            </div>
            <div
                id="link-detail-section"
                className="flex flex-col border-[1px] rounded-lg border-lightgreen"
            >
                <div className="flex flex-row items-center justify-between border-lightgreen px-5 py-3">
                    <p className="font-medium text-sm">Status</p>
                    <StateBadge state={link?.state} />
                </div>
                <div className="flex flex-row items-center justify-between border-lightgreen px-5 py-3">
                    <p className="font-medium text-sm">Type</p>
                    <p className="text-sm text-primary/80">{getLinkTypeString(link.linkType!)}</p>
                </div>
                <div className="flex flex-row items-center justify-between border-lightgreen px-5 py-3">
                    <p className="font-medium text-sm">User pays</p>
                    {renderUserPays()}
                </div>
                <div className="flex flex-row items-center justify-between border-lightgreen px-5 py-3">
                    <p className="font-medium text-sm">User claims</p>
                    {renderUserClaims()}
                </div>
                <div className="flex flex-row items-center justify-between border-lightgreen border-t px-5 py-3">
                    <p className="font-medium text-sm">Max use</p>
                    <p className="text-sm text-primary/80">{link.maxActionNumber.toString()}</p>
                </div>
            </div>

            <div className="flex gap-2 items-center mb-2 mt-4 justify-between">
                <Label>{t("details.usageInfo")}</Label>
            </div>
            <div
                id="link-detail-section"
                className="flex flex-col border-[1px] rounded-lg border-lightgreen"
            >
                <div className="flex flex-row items-center justify-between border-lightgreen px-5 py-3">
                    <p className="font-medium text-sm">{t("details.assetsInLink")}</p>
                    <div className="flex flex-col items-end gap-2">
                        {loading ? (
                            renderBalancesSkeleton()
                        ) : error ? (
                            <div className="flex flex-col items-end gap-1">
                                <p className="text-sm text-red-500">Error loading balances</p>
                            </div>
                        ) : balances.length === 0 ? (
                            <p className="text-sm text-primary/60">No assets</p>
                        ) : (
                            balances
                                .sort((a: BalanceItem, b: BalanceItem) =>
                                    a.tokenAddress
                                        .toString()
                                        .localeCompare(b.tokenAddress.toString()),
                                )
                                .map((balance: BalanceItem, index: number) => {
                                    const token = getToken(balance.tokenAddress.toString());
                                    if (!token) return null;
                                    const formattedBalance =
                                        Number(balance.balance) / 10 ** token.decimals;
                                    return (
                                        <div
                                            key={`balance-${index}`}
                                            className="flex items-center gap-2"
                                        >
                                            <p className="text-sm text-primary/80">
                                                {formatNumber(formattedBalance.toString())}{" "}
                                                {token.symbol}
                                            </p>
                                            <AssetAvatarV2 token={token} className="w-4 h-4" />
                                        </div>
                                    );
                                })
                        )}
                    </div>
                </div>
                <div className="flex flex-row items-center justify-between border-lightgreen border-t px-5 py-3">
                    <p className="font-medium text-sm">Used</p>
                    <p className="text-sm text-primary/80">{link.useActionCounter.toString()}</p>
                </div>
            </div>
        </>
    );
};
