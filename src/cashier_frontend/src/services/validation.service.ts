// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { ErrorCode } from "@/types/error.enum";

import { LINK_TYPE, CHAIN } from "@/services/types/enum";
import { FungibleToken } from "@/types/fungible-token.speculative";
import { ActionModel } from "@/services/types/action.service.types";
import { FeeHelpers } from "@/services/fee.service";
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
        allAvailableTokens: FungibleToken[] | undefined,
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
            const token = allAvailableTokens?.find((t) => t.address === asset.tokenAddress);
            const tokenSymbol = token?.symbol || "Unknown";

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
     * Frontend-only validation for link details form
     */
    static validateLinkDetails(
        formAssets: FormAsset[],
        maxActionNumber: number,
        allAvailableTokens: FungibleToken[] | undefined,
        linkType?: LINK_TYPE,
    ): ValidationResult {
        const errors: ValidationError[] = [];

        // Validate max action number
        if (!maxActionNumber || maxActionNumber <= 0) {
            errors.push({
                field: "maxActionNumber",
                code: ErrorCode.INVALID_MAX_ACTIONS,
                message: "Max actions must be greater than 0",
            });
        }

        // Validate assets based on link type
        const isAirdrop = linkType === LINK_TYPE.SEND_AIRDROP;
        const assetValidation = this.validateLinkDetailsAssets(formAssets, allAvailableTokens, {
            isAirdrop,
            maxActionNumber,
            skipCheckingBalance: linkType === LINK_TYPE.RECEIVE_PAYMENT,
        });

        errors.push(...assetValidation.errors);

        return {
            isValid: errors.length === 0,
            errors,
        };
    }

    /**
     * Check for insufficient balance
     */
    static checkInsufficientBalance(
        formAssets: FormAsset[],
        allAvailableTokens: FungibleToken[] | undefined,
        uses: number = 1,
    ): string | null {
        const notEnoughBalanceAssets = formAssets.filter((asset) => {
            const token = allAvailableTokens?.find((t) => t.address === asset.tokenAddress);
            if (!token) return false;

            const assetAmount = asset.amount;
            const tokenAmount = token.amount;
            const assetAmountWithoutFee =
                BigInt(uses) * (assetAmount + FeeHelpers.calculateNetworkFeesInES8(token));

            return assetAmountWithoutFee > Number(tokenAmount);
        });

        if (notEnoughBalanceAssets.length > 0) {
            const token = allAvailableTokens?.find(
                (t) => t.address === notEnoughBalanceAssets[0].tokenAddress,
            );
            return token?.symbol || "Unknown";
        }

        return null;
    }

    /**
     * Frontend-only validation for user balance
     */
    static validateUserBalance(
        action: ActionModel,
        getToken: (address: string) => FungibleToken | undefined,
    ): ValidationResult {
        const errors: ValidationError[] = [];

        if (action.intents && action.intents.length > 0) {
            for (const intent of action.intents) {
                const token = getToken(intent.asset.address);

                if (!token || token.amount === undefined || token.amount === null) {
                    errors.push({
                        field: `balance.${intent.asset.address}`,
                        code: ErrorCode.TOKEN_NOT_FOUND,
                        message: `Could not find token balance for ${intent.asset.address}`,
                    });
                    continue;
                }

                const totalAmount = BigInt(intent.amount);
                const userBalance = token.amount;

                if (userBalance < totalAmount) {
                    const tokenDecimals = token.decimals || 8;
                    const formattedRequired = Number(totalAmount) / 10 ** tokenDecimals;
                    const formattedBalance = Number(userBalance) / 10 ** tokenDecimals;

                    errors.push({
                        field: `balance.${intent.asset.address}`,
                        code: ErrorCode.INSUFFICIENT_BALANCE,
                        message: "error.balance.insufficient_balance",
                        metadata: {
                            tokenSymbol: token.symbol,
                            required: formattedRequired.toFixed(4),
                            available: formattedBalance.toFixed(4),
                            tokenAddress: intent.asset.address,
                        },
                    });
                }
            }
        }

        return {
            isValid: errors.length === 0,
            errors,
        };
    }

    /**
     * Validate balance based on link state and link type
     */
    static validateBalanceForLinkState(
        formAssets: FormAsset[],
        linkType: LINK_TYPE,
        linkState: string,
        maxActionNumber: number,
        allAvailableTokens: FungibleToken[] | undefined,
        options: {
            skipBalanceCheck?: boolean;
            customValidations?: (assets: FormAsset[], tokens: FungibleToken[]) => ValidationResult;
        } = {},
    ): ValidationResult {
        const { skipBalanceCheck = false, customValidations } = options;
        const errors: ValidationError[] = [];

        // Skip balance validation for receive payment types as they don't require user balance
        if (
            linkType === LINK_TYPE.RECEIVE_PAYMENT ||
            linkType === LINK_TYPE.RECEIVE_MULTI_PAYMENT
        ) {
            return { isValid: true, errors: [] };
        }

        // Skip if explicitly requested or if tokens are not available
        if (skipBalanceCheck || !allAvailableTokens || !formAssets?.length) {
            return { isValid: true, errors: [] };
        }

        // Validate each asset based on link type and state
        formAssets.forEach((asset, index) => {
            const token = allAvailableTokens.find((t) => t.address === asset.tokenAddress);

            if (!token) {
                errors.push({
                    field: `assets.${index}.token`,
                    code: ErrorCode.TOKEN_NOT_FOUND,
                    message: `Asset #${index + 1}: Token not found for address ${asset.tokenAddress}`,
                    metadata: {
                        tokenAddress: asset.tokenAddress,
                        assetIndex: index,
                    },
                });
                return;
            }

            // Calculate required amount based on link type
            const requiredAmount = this.calculateRequiredAmount(
                asset.amount,
                linkType,
                maxActionNumber,
                token,
            );

            const userBalance = token.amount || BigInt(0);

            // Validate balance based on link state
            const balanceValidation = this.validateBalanceForState(
                userBalance,
                requiredAmount,
                linkState,
                linkType,
                token,
                index,
            );

            if (!balanceValidation.isValid) {
                errors.push(...balanceValidation.errors);
            }
        });

        // Apply custom validations if provided
        if (customValidations && allAvailableTokens) {
            const customResult = customValidations(formAssets, allAvailableTokens);
            if (!customResult.isValid) {
                errors.push(...customResult.errors);
            }
        }

        return {
            isValid: errors.length === 0,
            errors,
        };
    }

    /**
     * Calculate required amount based on link type
     */
    private static calculateRequiredAmount(
        assetAmount: bigint,
        linkType: LINK_TYPE,
        maxActionNumber: number,
        token: FungibleToken,
    ): bigint {
        const networkFee = FeeHelpers.calculateNetworkFeesInES8(token);

        switch (linkType) {
            case LINK_TYPE.SEND_AIRDROP:
                // For airdrops, multiply by max action number (uses)
                return (assetAmount + networkFee) * BigInt(maxActionNumber);

            case LINK_TYPE.SEND_TIP:
                // For tips, single use only
                return assetAmount + networkFee;

            case LINK_TYPE.SEND_TOKEN_BASKET:
                // For token baskets, usually single use but can be configured
                return (assetAmount + networkFee) * BigInt(maxActionNumber);

            default:
                return assetAmount + networkFee;
        }
    }

    /**
     * Validate balance based on link state
     */
    private static validateBalanceForState(
        userBalance: bigint,
        requiredAmount: bigint,
        linkState: string,
        linkType: LINK_TYPE,
        token: FungibleToken,
        assetIndex: number,
    ): ValidationResult {
        const errors: ValidationError[] = [];
        const tokenSymbol = token.symbol || "Unknown";
        const tokenDecimals = token.decimals || 8;

        // Convert amounts to decimal for display
        const availableAmount = Number(userBalance) / Math.pow(10, tokenDecimals);
        const requestedAmount = Number(requiredAmount) / Math.pow(10, tokenDecimals);

        // State-specific validation logic
        switch (linkState) {
            case "AddAssets":
            case "Preview":
                // During creation, check if user has enough balance
                if (userBalance < requiredAmount) {
                    errors.push({
                        field: `assets.${assetIndex}.balance`,
                        code: ErrorCode.INSUFFICIENT_BALANCE,
                        message: "error.balance.insufficient_balance",
                        metadata: {
                            tokenSymbol,
                            available: availableAmount.toFixed(4),
                            required: requestedAmount.toFixed(4),
                            tokenAddress: token.address,
                            linkType,
                            linkState,
                            assetIndex,
                        },
                    });
                }
                break;

            case "CreateLink":
                // Final validation before creating the link
                if (userBalance < requiredAmount) {
                    errors.push({
                        field: `assets.${assetIndex}.balance`,
                        code: ErrorCode.INSUFFICIENT_BALANCE_CREATE,
                        message: "error.balance.insufficient_balance_create",
                        metadata: {
                            tokenSymbol,
                            available: availableAmount.toFixed(4),
                            required: requestedAmount.toFixed(4),
                            linkType: this.getLinkTypeDisplayName(linkType),
                            tokenAddress: token.address,
                            linkState,
                            assetIndex,
                        },
                    });
                }
                break;

            case "Active":
                // For active links, check if there's still balance for withdrawals
                // This is mainly for the link creator to withdraw unused funds
                break;

            case "Inactive":
                // For inactive links, balance validation might not be needed
                // unless we're checking for withdrawal capabilities
                break;

            default:
                // For unknown states, apply basic balance validation
                if (userBalance < requiredAmount) {
                    errors.push({
                        field: `assets.${assetIndex}.balance`,
                        code: ErrorCode.INSUFFICIENT_BALANCE,
                        message: "error.balance.insufficient_balance",
                        metadata: {
                            tokenSymbol,
                            available: availableAmount.toFixed(4),
                            required: requestedAmount.toFixed(4),
                            tokenAddress: token.address,
                            linkType,
                            linkState,
                            assetIndex,
                        },
                    });
                }
                break;
        }

        return {
            isValid: errors.length === 0,
            errors,
        };
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
            useCase?: "create" | "use" | "withdraw";
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

            // Calculate fees based on use case and link type
            const networkFees = FeeHelpers.calculateNetworkFeesInES8(token);
            let totalAssetAmount: bigint;

            switch (useCase) {
                case "create":
                    // For creation, calculate total amount needed including fees
                    totalAssetAmount = this.calculateRequiredAmount(
                        asset.amount,
                        linkType,
                        maxActionNumber,
                        token,
                    );
                    break;
                case "use":
                    // For uses, just the asset amount (fees handled separately)
                    totalAssetAmount = asset.amount;
                    break;
                case "withdraw":
                    // For withdrawals, minimal fees
                    totalAssetAmount = asset.amount + networkFees;
                    break;
                default:
                    totalAssetAmount = asset.amount + networkFees;
            }

            // Store total fees per token
            totalFeesPerToken[asset.tokenAddress] = totalAssetAmount;

            // Balance validation (if not skipped)
            if (!skipBalanceCheck && token.amount !== undefined && token.amount !== null) {
                const userBalance = token.amount;

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

    /**
     * Enhanced validateBalanceForUseCase that uses the unified validation system
     */
    static validateBalanceForUseCase(
        formAssets: FormAsset[],
        useCase: "add_asset" | "create" | "use" | "withdraw",
        linkType: LINK_TYPE,
        token_map: Record<string, FungibleToken>,
        options: {
            maxActionNumber?: number;
            currentUses?: number;
            linkBalance?: bigint;
        } = {},
    ): ValidationResult {
        const { maxActionNumber = 1 } = options;
        const errors: ValidationError[] = [];

        if (!token_map || !formAssets?.length) {
            return { isValid: true, errors: [] };
        }
        const token_fee = FeeHelpers.getLinkCreationFee();

        formAssets.forEach((asset, index) => {
            const token = token_map[asset.tokenAddress];
            if (!token) return;

            const tokenSymbol = token.symbol || "Unknown";
            const tokenDecimals = token.decimals || 8;
            const userBalance = token.amount || BigInt(0);
            const is_token_fee = asset.tokenAddress === token_fee.address;
            // this calculate based on asset info + ledger fee
            let tokenNeedAmount = this.calculateRequiredAmount(
                asset.amount,
                linkType,
                maxActionNumber,
                token,
            );

            switch (useCase) {
                case "add_asset":
                    // Check if user has enough balance to create the link
                    if (userBalance < tokenNeedAmount) {
                        const availableAmount = Number(userBalance) / Math.pow(10, tokenDecimals);
                        const requiredAmount =
                            Number(tokenNeedAmount) / Math.pow(10, tokenDecimals);

                        errors.push({
                            field: `assets.${index}.balance`,
                            code: ErrorCode.INSUFFICIENT_BALANCE_CREATE,
                            message: "error.balance.insufficient_balance_create",
                            metadata: {
                                tokenSymbol,
                                available: availableAmount.toFixed(4),
                                required: requiredAmount.toFixed(4),
                                linkType: this.getLinkTypeDisplayName(linkType),
                                tokenAddress: asset.tokenAddress,
                                useCase,
                            },
                        });
                    }
                    break;
                case "create":
                    if (is_token_fee) {
                        tokenNeedAmount += token_fee.amount;
                    }
                    // Similar to above but add up for create link fee
                    if (userBalance < tokenNeedAmount) {
                        const availableAmount = Number(userBalance) / Math.pow(10, tokenDecimals);
                        const requiredAmount =
                            Number(tokenNeedAmount) / Math.pow(10, tokenDecimals);

                        errors.push({
                            field: `assets.${index}.balance`,
                            code: ErrorCode.INSUFFICIENT_BALANCE_CREATE,
                            message: "error.balance.insufficient_balance_create",
                            metadata: {
                                tokenSymbol,
                                available: availableAmount.toFixed(4),
                                required: requiredAmount.toFixed(4),
                                linkType: this.getLinkTypeDisplayName(linkType),
                                tokenAddress: asset.tokenAddress,
                                useCase,
                            },
                        });
                    }
                    break;

                case "use":
                    // For using, check if link has enough balance (for send-type links)
                    if (
                        [
                            LINK_TYPE.SEND_TIP,
                            LINK_TYPE.SEND_AIRDROP,
                            LINK_TYPE.SEND_TOKEN_BASKET,
                        ].includes(linkType)
                    ) {
                        // Note: linkBalance should be provided for this validation
                        // This is more of a link-side validation rather than user balance
                        // Implementation would check if the link has sufficient funds for uses
                    }
                    break;

                case "withdraw":
                    // For withdrawing, check if link has balance to withdraw
                    // This is typically for link creators withdrawing unused funds
                    break;

                default:
                    break;
            }
        });

        return {
            isValid: errors.length === 0,
            errors,
        };
    }

    static isLinkTypeSupported(linkType: LINK_TYPE): boolean {
        return this.supportedLinkTypes.includes(linkType);
    }

    static supportsMultipleAssets(linkType: LINK_TYPE): boolean {
        return this.supportMultiAsset.includes(linkType);
    }
}
