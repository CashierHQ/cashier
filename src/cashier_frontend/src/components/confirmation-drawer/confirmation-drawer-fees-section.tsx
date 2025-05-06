import { FC, useEffect, useState } from "react";
// import { useTranslation } from "react-i18next";
import { IntentModel } from "@/services/types/intent.service.types";
import { IntentHelperService } from "@/services/fee.service";
import { useIntentMetadata } from "@/hooks/useIntentMetadata";
import { TASK } from "@/services/types/enum";
import { Spinner } from "../ui/spinner";
import { useTokenStore } from "@/stores/tokenStore";
import { ICP_ADDRESS } from "@/const";
import { ChevronRight } from "lucide-react";
import { TokenUtilService } from "@/services/tokenUtils.service";
import { convertDecimalBigIntToNumber } from "@/utils";
import { FeeBreakdownDrawer } from "./fee-breakdown-drawer";
import { AssetAvatar } from "../ui/asset-avatar";
import { Avatar } from "../ui/avatar";

type ConfirmationPopupFeesSectionProps = {
    intents: IntentModel[];
    isUsd?: boolean;
};

// Define a type for fee token info
type FeeTokenInfo = {
    address: string;
    symbol: string;
    logo?: string;
};

// const getItemLabel = (intent: IntentModel) => {
//     switch (intent.task) {
//         case TASK.TRANSFER_LINK_TO_WALLET:
//             return "transaction.confirm_popup.total_assets_received_label";
//         case TASK.TRANSFER_WALLET_TO_LINK:
//         case TASK.TRANSFER_WALLET_TO_TREASURY:
//         default:
//             return "transaction.confirm_popup.total_cashier_fees_label";
//     }
// };

export const ConfirmationPopupFeesSection: FC<ConfirmationPopupFeesSectionProps> = ({
    intents,
}) => {
    // const { t } = useTranslation();
    const { feeAmount } = useIntentMetadata(intents?.[0]);

    const getTokenPrice = useTokenStore((state) => state.getTokenPrice);
    const isLoading = useTokenStore((state) => state.isLoading);
    const getToken = useTokenStore((state) => state.getToken);

    const [totalCashierFee, setTotalCashierFee] = useState<number>();
    const [isBreakdownOpen, setIsBreakdownOpen] = useState(false);
    const [feesBreakdown, setFeesBreakdown] = useState<
        Array<{
            name: string;
            amount: string;
            tokenSymbol: string;
            tokenAddress: string;
            usdAmount: string;
        }>
    >([]);
    const [usedTokens, setUsedTokens] = useState<FeeTokenInfo[]>([]);

    const tokenUsdPrice = getTokenPrice(ICP_ADDRESS);

    useEffect(() => {
        const initState = async () => {
            console.log("Intents: ", intents);

            // Get the fee map for all intents
            const totalFeesMapArray = await IntentHelperService.getNetworkFeeMap(intents);

            // Calculate total fees in tokens with proper decimals
            let totalFeesDisplay = 0;
            const breakdown: Array<{
                name: string;
                amount: string;
                tokenSymbol: string;
                tokenAddress: string;
                usdAmount: string;
            }> = [];
            const tokensUsed: FeeTokenInfo[] = [];

            for (const transfer of totalFeesMapArray) {
                if (transfer.fee?.amount) {
                    // Get token metadata to get the correct decimals
                    const metadata = await TokenUtilService.getTokenMetadata(transfer.fee.address);
                    if (metadata) {
                        // Add token info to tracking array if not already present
                        if (!tokensUsed.some((t) => t.address === transfer.fee!.address)) {
                            const token = getToken(transfer.fee.address);
                            tokensUsed.push({
                                address: transfer.fee.address,
                                symbol: metadata.symbol,
                                logo: token?.logo,
                            });
                        }

                        // Convert using correct token decimals
                        const feeAmount = convertDecimalBigIntToNumber(
                            transfer.fee.amount,
                            metadata.decimals,
                        );

                        // Make sure feeAmount is a valid number
                        if (!isNaN(feeAmount) && feeAmount > 0) {
                            totalFeesDisplay += feeAmount;

                            // Get a valid USD amount
                            let feeUsdAmount = 0;
                            if (tokenUsdPrice && !isNaN(tokenUsdPrice) && tokenUsdPrice > 0) {
                                feeUsdAmount = feeAmount * tokenUsdPrice;
                            }

                            // Use proper task-based label
                            const feeLabel =
                                transfer.intent.task === TASK.TRANSFER_WALLET_TO_TREASURY
                                    ? "Link creation fee"
                                    : "Network fee";

                            breakdown.push({
                                name: feeLabel,
                                amount: feeAmount.toFixed(4),
                                tokenSymbol: metadata.symbol,
                                tokenAddress: transfer.fee.address,
                                usdAmount: `$${feeUsdAmount.toFixed(4)}`,
                            });
                        }
                    }
                }
            }

            // Keep track of used tokens for rendering icons
            setUsedTokens(tokensUsed);

            // If we have no breakdown items but have intents, add a fallback
            if (breakdown.length === 0 && intents.length > 0) {
                // Add a default fee since we know there should be fees
                const intent = intents[0];
                const metadata = await TokenUtilService.getTokenMetadata(intent.asset.address);

                if (metadata) {
                    // Use a default fee amount based on feeAmount from useIntentMetadata
                    const defaultFeeAmount = feeAmount || 0.01;
                    let defaultUsdAmount = 0;

                    if (tokenUsdPrice && !isNaN(tokenUsdPrice) && tokenUsdPrice > 0) {
                        defaultUsdAmount = defaultFeeAmount * tokenUsdPrice;
                    }

                    breakdown.push({
                        name: "Link creation fee",
                        amount: defaultFeeAmount.toFixed(4),
                        tokenSymbol: metadata.symbol,
                        tokenAddress: intent.asset.address,
                        usdAmount: `$${defaultUsdAmount.toFixed(4)}`,
                    });

                    totalFeesDisplay = defaultFeeAmount;

                    // Add to used tokens if not already present
                    if (!tokensUsed.some((t) => t.address === intent.asset.address)) {
                        const token = getToken(intent.asset.address);
                        setUsedTokens([
                            {
                                address: intent.asset.address,
                                symbol: metadata.symbol,
                                logo: token?.logo,
                            },
                        ]);
                    }
                }
            }

            setFeesBreakdown(breakdown);

            // If we calculated a valid fee but couldn't get it from the tokenUsdPrice conversion,
            // use a default conversion rate to show something reasonable
            if (totalFeesDisplay > 0) {
                // Convert to USD
                let totalFeesInUSD = 0;
                if (tokenUsdPrice && !isNaN(tokenUsdPrice) && tokenUsdPrice > 0) {
                    totalFeesInUSD = totalFeesDisplay * tokenUsdPrice;
                } else {
                    // Use a default conversion if tokenUsdPrice is not available
                    totalFeesInUSD = totalFeesDisplay * 5; // Assuming a default conversion rate
                }

                setTotalCashierFee(totalFeesInUSD);
            } else if (feeAmount) {
                // Fallback to feeAmount if we have it
                let fallbackUsdAmount = 0;
                if (tokenUsdPrice && !isNaN(tokenUsdPrice) && tokenUsdPrice > 0) {
                    fallbackUsdAmount = feeAmount * tokenUsdPrice;
                } else {
                    fallbackUsdAmount = feeAmount * 5; // Default conversion rate
                }

                setTotalCashierFee(fallbackUsdAmount);
            } else {
                // Set a minimum fee as a final fallback
                setTotalCashierFee(0.05);
            }
        };

        initState();
    }, [intents, tokenUsdPrice, feeAmount]);

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
            return (
                <AssetAvatar
                    symbol={token?.symbol || "ICP"}
                    src={token?.logo}
                    className="w-7 h-7 rounded-full"
                />
            );
        } else if (usedTokens.length === 1) {
            // Show single token avatar
            const tokenInfo = usedTokens[0];
            return (
                <AssetAvatar
                    symbol={tokenInfo.symbol || "ICP"}
                    src={tokenInfo.logo}
                    className="w-7 h-7 rounded-full"
                />
            );
        } else {
            // Calculate width based on number of tokens (each offset by 10px)
            const width = Math.min(usedTokens.length, 3) * 10 + 15; // Base width + offset for each token

            // Create staggered effect for multiple tokens
            return (
                <div className="relative" style={{ width: `${width}px`, height: "30px" }}>
                    {usedTokens.slice(0, 3).map((tokenInfo, index) => {
                        return (
                            <Avatar
                                key={tokenInfo.address}
                                className="w-6 h-6 rounded-full border-2 border-white absolute"
                                style={{ left: `${index * 10}px`, zIndex: 3 - index }}
                            >
                                <AssetAvatar
                                    symbol={tokenInfo.symbol || "Token"}
                                    src={tokenInfo.logo}
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
                    <h2 className="font-medium text-[14px] ml-2">Total fees</h2>
                </div>
                <div className="flex flex-col gap-3 light-borders-green px-4 py-4">
                    <div className="flex justify-between font-medium items-center">
                        {renderFeeTokenAvatars()}

                        <div className="flex items-center">
                            {isLoading || !totalCashierFee ? (
                                <Spinner width={22} />
                            ) : (
                                <button className="flex items-center" onClick={handleOpenBreakdown}>
                                    <p className="text-[14px] font-normal">
                                        ~${totalCashierFee.toFixed(4)}
                                    </p>
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
