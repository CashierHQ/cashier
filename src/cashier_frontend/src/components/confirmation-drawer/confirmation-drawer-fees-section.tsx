// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { FC, useEffect, useState } from "react";
import { IntentModel } from "@/services/types/intent.service.types";
import { FeeHelpers, Transfer } from "@/services/fee.service";
import { useIntentMetadata } from "@/hooks/useIntentMetadata";
import { TASK } from "@/services/types/enum";
import { Spinner } from "../ui/spinner";
import { ICP_ADDRESS } from "@/const";
import { ChevronRight } from "lucide-react";
import { FeeBreakdownDrawer } from "./fee-breakdown-drawer";
import { AssetAvatarV2 } from "../ui/asset-avatar";
import { Avatar } from "../ui/avatar";
import { useTokens } from "@/hooks/useTokens";
import { useLinkAction } from "@/hooks/useLinkAction";
import { useTranslation } from "react-i18next";
import { formatDollarAmount, formatNumber } from "@/utils/helpers/currency";
import { DEFAULT_CREATION_FEE } from "@/services/fee.constants";

type ConfirmationPopupFeesSectionProps = {
    intents: IntentModel[];
    isUsd?: boolean;
    maxActionNumber?: number;
};

// Define a type for fee token info
type FeeTokenInfo = {
    address: string;
    symbol: string;
    logo?: string;
};

// Fee item type for breakdown display
type FeeBreakdownItem = {
    name: string;
    amount: string;
    tokenSymbol: string;
    tokenAddress: string;
    usdAmount: string;
};

export const ConfirmationPopupFeesSection: FC<ConfirmationPopupFeesSectionProps> = ({
    intents,
    maxActionNumber,
}) => {
    const { t } = useTranslation();
    const { feeAmount } = useIntentMetadata(intents?.[0]);
    const { getTokenPrice, isLoading, getToken } = useTokens();

    const [totalCashierFee, setTotalCashierFee] = useState<number>();
    const [isBreakdownOpen, setIsBreakdownOpen] = useState(false);
    // Track fees breakdown for each token
    const [feesBreakdown, setFeesBreakdown] = useState<FeeBreakdownItem[]>([]);
    // for avatar
    const [usedTokens, setUsedTokens] = useState<FeeTokenInfo[]>([]);
    const { link } = useLinkAction();

    useEffect(() => {
        const initState = async () => {
            // Get the fee map for all intents
            const totalFeesMapArray = [];
            // intent is already sorted, the transfer fee create link is the first one
            for (const intent of intents) {
                const token = getToken(intent.asset.address);
                if (intent.task === TASK.TRANSFER_WALLET_TO_TREASURY && link) {
                    const final_amount = FeeHelpers.forecastIcrc2FeeEs8(
                        token!,
                        DEFAULT_CREATION_FEE,
                        1,
                    );

                    totalFeesMapArray.push({
                        intent,
                        fee: {
                            chain: intent.asset.chain,
                            type: "link_creation_fee",
                            address: intent.asset.address,
                            amount: final_amount,
                        },
                    });
                } else {
                    const transfer: Transfer = {
                        intent,
                        fee: {
                            chain: intent.asset.chain,
                            type: "network_fee",
                            address: intent.asset.address,
                            amount: token?.fee || 0n,
                        },
                    };
                    totalFeesMapArray.push(transfer);
                }
            }

            // Extract all unique token addresses from fees
            // === for avatar
            const uniqueTokenAddresses = new Set<string>();
            totalFeesMapArray.forEach((transfer) => {
                if (transfer.fee?.address) {
                    uniqueTokenAddresses.add(transfer.fee.address);
                }
            });

            // If no fees found but we have intents, add the first intent's asset address
            if (uniqueTokenAddresses.size === 0 && intents.length > 0) {
                uniqueTokenAddresses.add(intents[0].asset.address);
            }

            // Get metadata for all unique tokens at once
            const tokenInfoMap = new Map<string, FeeTokenInfo>();
            const tokenAddressArray = Array.from(uniqueTokenAddresses);

            for (const address of tokenAddressArray) {
                const token = getToken(address);
                if (token) {
                    tokenInfoMap.set(address, {
                        address,
                        symbol: token.symbol,
                        logo: token.logo,
                    });
                }
            }

            // === for avatar

            // Store the tokens for UI display
            setUsedTokens(Array.from(tokenInfoMap.values()));

            // Track fees by token
            const breakdown: FeeBreakdownItem[] = [];

            setFeesBreakdown(breakdown);

            // Calculate total fees in USD by converting each token's fee to USD
            let totalUsdValue = 0;

            for (const intent of totalFeesMapArray) {
                if (!intent) {
                    console.warn("transfer is undefined", intent);
                    continue;
                }

                const feeType = intent.fee?.type;
                const tokenAddress =
                    feeType === "link_creation_fee"
                        ? FeeHelpers.getLinkCreationFee().address
                        : intent.fee?.address;
                const token = tokenInfoMap.get(tokenAddress!);
                const tokenInfo = getToken(tokenAddress!);

                // Skip if tokenInfo is undefined
                if (!tokenInfo) {
                    console.warn(`Token info not found for address ${tokenAddress}`);
                    continue;
                }

                // Safe conversion from bigint to number for calculation
                // Use Number() for explicit conversion and provide defaults for undefined values
                // const tokenFee =
                //     feeType === "link_creation_fee"
                //         ? FeeHelpers.getLinkCreationFee().amount
                //         : tokenInfo.fee;
                const tokenDecimals =
                    feeType === "link_creation_fee"
                        ? FeeHelpers.getLinkCreationFee().decimals
                        : tokenInfo.decimals;

                const tokenAmount =
                    feeType === "link_creation_fee"
                        ? Number(FeeHelpers.getLinkCreationFee().amount) /
                          Math.pow(10, tokenDecimals)
                        : FeeHelpers.calculateNetworkFees(tokenInfo!);

                let tokenPrice = getTokenPrice(tokenAddress!);
                if (tokenPrice === undefined) {
                    tokenPrice = 0;
                }
                let actionNum = 1;
                if (maxActionNumber) {
                    if (isNaN(Number(maxActionNumber))) {
                        actionNum = 1; // Default to 1 if maxActionNumber is not a number
                    } else {
                        actionNum = Number(maxActionNumber);
                    }
                }
                const usdValue = tokenPrice * tokenAmount * Number(actionNum ?? 1);
                totalUsdValue += usdValue;

                const breakdownItem: FeeBreakdownItem = {
                    name:
                        feeType === "link_creation_fee"
                            ? t("confirmation_drawer.fee-breakdown.link_creation_fee")
                            : t("confirmation_drawer.fee-breakdown.network_fee"),
                    amount: formatNumber(
                        (tokenAmount * (Number(maxActionNumber ?? 1) + 1)).toString(),
                    ),
                    tokenSymbol: token?.symbol || "Unknown",
                    tokenAddress: tokenAddress!,
                    usdAmount: usdValue.toString(),
                };

                breakdown.push(breakdownItem);
                setFeesBreakdown(breakdown);
            }

            setTotalCashierFee(totalUsdValue);
        };

        initState();
    }, [intents, feeAmount, getToken, getTokenPrice]);

    const handleOpenBreakdown = () => {
        setIsBreakdownOpen(true);
    };

    const handleCloseBreakdown = () => {
        setIsBreakdownOpen(false);
    };

    // Render stacked asset avatars for multiple tokens, or single avatar for one token
    const renderFeeTokenAvatars = () => {
        if (usedTokens.length === 0) {
            // Fallback to ICP if no tokens found
            const token = getToken(ICP_ADDRESS);
            return <AssetAvatarV2 token={token} className="w-7 h-7 rounded-full" />;
        } else if (usedTokens.length === 1) {
            // Show single token avatar
            const tokenInfo = usedTokens[0];
            return (
                <AssetAvatarV2
                    token={getToken(tokenInfo.address)}
                    className="w-7 h-7 rounded-full"
                />
            );
        } else {
            // Create staggered effect for multiple tokens
            return (
                <div className="relative w-fit flex gap-0.5">
                    {usedTokens.slice(0, 3).map((tokenInfo) => {
                        return (
                            <Avatar
                                key={tokenInfo.address}
                                className="w-7 h-7 rounded-full border-2 border-white"
                            >
                                <AssetAvatarV2
                                    token={getToken(tokenInfo.address)}
                                    className="w-full h-full"
                                />
                            </Avatar>
                        );
                    })}
                </div>
            );
        }
    };

    return (
        <>
            <section id="confirmation-popup-section-total" className="mb-3">
                <div className="flex items-center w-full justify-between">
                    <h2 className="font-medium text-[14px] ml-2">
                        {t("confirmation_drawer.total_fees")}
                    </h2>
                </div>
                <div className="flex flex-col gap-3 light-borders-green px-4 py-4">
                    <div className="flex justify-between font-medium items-center">
                        {renderFeeTokenAvatars()}

                        <div className="flex items-center">
                            {isLoading ? (
                                <Spinner width={22} />
                            ) : (
                                <button className="flex items-center" onClick={handleOpenBreakdown}>
                                    {totalCashierFee === 0 || totalCashierFee === undefined ? (
                                        <span className="text-[14px] font-normal"></span>
                                    ) : (
                                        <p className="text-[14px] font-normal">
                                            {formatDollarAmount(totalCashierFee)}
                                        </p>
                                    )}
                                    <ChevronRight size={24} className="ml-1" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            <FeeBreakdownDrawer
                open={isBreakdownOpen}
                onClose={handleCloseBreakdown}
                totalFees={totalCashierFee || 0}
                feesBreakdown={feesBreakdown}
            />
        </>
    );
};
