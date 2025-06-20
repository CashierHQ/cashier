// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { ErrorCode } from "@/types/error.enum";

import { LINK_TYPE, CHAIN } from "@/services/types/enum";
import { FungibleToken } from "@/types/fungible-token.speculative";
import { FeeHelpers, FeeService } from "@/services/fee.service";
import { ValidationResult, ValidationError, FormAsset } from "@/types/validation.types";

export class ValidationService {
    private static supportedLinkTypes = [
        LINK_TYPE.SEND_TIP,
        LINK_TYPE.SEND_TOKEN_BASKET,
        LINK_TYPE.SEND_AIRDROP,
        LINK_TYPE.RECEIVE_PAYMENT,
    ];

    private static supportMultiAsset = [LINK_TYPE.SEND_TOKEN_BASKET];

    /**
     * Frontend-only validation for link details form assets
     */
    static validateLinkDetailsAssets(
        assets: FormAsset[],
        tokenMap: Record<string, FungibleToken>,
        options: {
            isAirdrop?: boolean;
            maxActionNumber?: number;
            skipCheckingBalance?: boolean;
        } = {},
    ): ValidationResult {
        const { isAirdrop = false, maxActionNumber = 1, skipCheckingBalance = false } = options;
        const errors: ValidationError[] = [];

        if (!assets || assets.length === 0) {
            errors.push({
                field: "assets",
                code: ErrorCode.NO_ASSETS_FOUND,
                message: "At least one asset is required",
            });
            return { isValid: false, errors };
        }

        assets.forEach((asset, index) => {
            const token = tokenMap[asset.tokenAddress];
            const tokenSymbol = token.symbol;

            // Validate token address
            if (!asset.tokenAddress) {
                errors.push({
                    field: `assets.${index}.tokenAddress`,
                    code: ErrorCode.INVALID_TOKEN_ADDRESS,
                    message: `Asset #${index + 1}: Token address is required`,
                });
            }

            // Validate amount
            if (!asset.amount || asset.amount === BigInt(0)) {
                errors.push({
                    field: `assets.${index}.amount`,
                    code: ErrorCode.INVALID_AMOUNT,
                    message: `Asset #${index + 1} (${tokenSymbol}): Amount must be greater than 0`,
                });
            }

            // Validate chain
            if (!asset.chain) {
                errors.push({
                    field: `assets.${index}.chain`,
                    code: ErrorCode.INVALID_CHAIN,
                    message: `Asset #${index + 1} (${tokenSymbol}): Chain is required`,
                });
            }

            // Check balance if not skipped
            if (!skipCheckingBalance && token && asset.amount) {
                // Calculate total amount needed based on form type
                const totalAmountNeeded = isAirdrop
                    ? asset.amount * BigInt(maxActionNumber)
                    : asset.amount;

                const hasEnoughBalance = Number(totalAmountNeeded) <= Number(token.amount || 0);

                if (!hasEnoughBalance) {
                    const availableAmountInDecimal = token?.amount ? Number(token.amount) : 0;
                    const requestedAmountInDecimal = Number(totalAmountNeeded);
                    const availableAmount =
                        availableAmountInDecimal / (Math.pow(10, token.decimals) || 1);
                    const requestedAmount =
                        requestedAmountInDecimal / (Math.pow(10, token.decimals) || 1);

                    errors.push({
                        field: `assets.${index}.balance`,
                        code: ErrorCode.INSUFFICIENT_BALANCE,
                        message: "error.balance.insufficient_balance",
                        metadata: {
                            tokenSymbol,
                            available: availableAmount.toFixed(4),
                            required: requestedAmount.toFixed(4),
                            tokenAddress: asset.tokenAddress,
                        },
                    });
                }
            }
        });

        return {
            isValid: errors.length === 0,
            errors,
        };
    }

    /**
     * Calculate required amount based on link type using FeeService
     */
    private static calculateRequiredAmountAddAsset(
        assetAmount: bigint,
        linkType: LINK_TYPE,
        maxActionNumber: number,
        token: FungibleToken,
    ): bigint {
        // Convert the human readable amount back to bigint with proper decimals
        const amountInDecimal = FeeHelpers.forecastActualAmountForPreview(
            token,
            assetAmount,
            maxActionNumber,
        );
        return BigInt(Math.round(amountInDecimal * Math.pow(10, token.decimals)));
    }

    /**
     * Get display name for link type
     */
    private static getLinkTypeDisplayName(linkType: LINK_TYPE): string {
        switch (linkType) {
            case LINK_TYPE.SEND_TIP:
                return "tip";
            case LINK_TYPE.SEND_AIRDROP:
                return "airdrop";
            case LINK_TYPE.SEND_TOKEN_BASKET:
                return "token basket";
            case LINK_TYPE.RECEIVE_PAYMENT:
                return "payment request";
            case LINK_TYPE.RECEIVE_MULTI_PAYMENT:
                return "multi-payment request";
            default:
                return "link";
        }
    }

    /**
     * Unified validation system that consolidates both calculateTotalFeesForAssets and validateBalanceForUseCase
     * This method handles fee calculation, balance validation, and error reporting in one place
     */
    static validateAssetsWithFees(
        assets: FormAsset[],
        tokenMap: Record<string, FungibleToken>,
        options: {
            useCase?: "create" | "use";
            linkType?: LINK_TYPE;
            maxActionNumber?: number;
            includeLinkCreationFee?: boolean;
            skipBalanceCheck?: boolean;
        } = {},
    ): {
        isValid: boolean;
        errors: ValidationError[];
        totalFeesPerToken: Record<string, bigint>;
        insufficientTokenSymbol: string | null;
    } {
        const {
            useCase = "create",
            linkType = LINK_TYPE.SEND_TIP,
            maxActionNumber = 1,
            includeLinkCreationFee = false,
            skipBalanceCheck = false,
        } = options;

        const errors: ValidationError[] = [];
        const totalFeesPerToken: Record<string, bigint> = {};
        let insufficientTokenSymbol: string | null = null;

        // Handle link creation fee if needed
        const assetsWithFees = includeLinkCreationFee
            ? [
                  ...assets,
                  {
                      tokenAddress: FeeHelpers.getLinkCreationFee().address,
                      amount: FeeHelpers.getLinkCreationFee().amount,
                      chain: CHAIN.IC,
                  },
              ]
            : assets;

        // Process each asset for fee calculation and balance validation
        assetsWithFees.forEach((asset, index) => {
            const token = tokenMap[asset.tokenAddress];
            if (!token) {
                errors.push({
                    field: `assets.${index}.token`,
                    code: ErrorCode.TOKEN_NOT_FOUND,
                    message: `Token not found for address ${asset.tokenAddress}`,
                    metadata: {
                        tokenAddress: asset.tokenAddress,
                        assetIndex: index,
                    },
                });
                return;
            }

            const tokenSymbol = token.symbol || "Unknown";
            const tokenDecimals = token.decimals || 8;

            let totalAssetAmount: bigint;

            switch (useCase) {
                case "create":
                    // For creation, calculate total amount needed including fees
                    totalAssetAmount = this.calculateRequiredAmountAddAsset(
                        asset.amount,
                        linkType,
                        maxActionNumber,
                        token,
                    );
                    break;
                case "use":
                    // For uses, just the asset amount (fees handled separately)
                    totalAssetAmount = new FeeService().forecastIcrc1InUseLinkUlps(
                        linkType,
                        token,
                        asset.amount,
                        maxActionNumber,
                    );
                    break;
                default:
                    throw new Error(`Unsupported use case: ${useCase}`);
            }

            // Store total fees per token
            totalFeesPerToken[asset.tokenAddress] = totalAssetAmount;

            // Balance validation (if not skipped)
            if (!skipBalanceCheck && token.amount !== undefined && token.amount !== null) {
                const userBalance = token.amount;

                console.log(
                    `Validating asset ${index + 1}: ${tokenSymbol} - User Balance: ${userBalance}, Required: ${totalAssetAmount}`,
                );

                if (userBalance < totalAssetAmount) {
                    const availableAmount = Number(userBalance) / Math.pow(10, tokenDecimals);
                    const requiredAmount = Number(totalAssetAmount) / Math.pow(10, tokenDecimals);

                    // Set insufficient token symbol for legacy compatibility
                    if (!insufficientTokenSymbol) {
                        insufficientTokenSymbol = tokenSymbol;
                    }

                    // Add validation error with appropriate code based on use case
                    const errorCode =
                        useCase === "create"
                            ? ErrorCode.INSUFFICIENT_BALANCE_CREATE
                            : ErrorCode.INSUFFICIENT_BALANCE;

                    const messageKey =
                        useCase === "create"
                            ? "error.balance.insufficient_balance_create"
                            : "error.balance.insufficient_balance";

                    errors.push({
                        field: `assets.${index}.balance`,
                        code: errorCode,
                        message: messageKey,
                        metadata: {
                            tokenSymbol,
                            available: availableAmount.toFixed(4),
                            required: requiredAmount.toFixed(4),
                            tokenAddress: asset.tokenAddress,
                            useCase,
                            linkType: linkType && this.getLinkTypeDisplayName(linkType),
                            assetIndex: index,
                        },
                    });
                }
            }
        });

        return {
            isValid: errors.length === 0,
            errors,
            totalFeesPerToken,
            insufficientTokenSymbol,
        };
    }

    /**
     * Legacy wrapper for calculateTotalFeesForAssets - now uses unified validation
     */
    static calculateTotalFeesForAssets(
        assets: { tokenAddress: string; amount: bigint }[],
        tokenMap: Record<string, FungibleToken>,
        maxUses: number = 1,
        includeLinkCreationFee: boolean = false,
    ): string | null {
        const formAssets: FormAsset[] = assets.map((asset) => ({
            tokenAddress: asset.tokenAddress,
            amount: asset.amount,
            chain: CHAIN.IC, // Default to IC chain
        }));

        const result = this.validateAssetsWithFees(formAssets, tokenMap, {
            useCase: "create",
            maxActionNumber: maxUses,
            includeLinkCreationFee,
            skipBalanceCheck: false,
        });

        return result.insufficientTokenSymbol;
    }

    static isLinkTypeSupported(linkType: LINK_TYPE): boolean {
        return this.supportedLinkTypes.includes(linkType);
    }

    static supportsMultipleAssets(linkType: LINK_TYPE): boolean {
        return this.supportMultiAsset.includes(linkType);
    }
}
