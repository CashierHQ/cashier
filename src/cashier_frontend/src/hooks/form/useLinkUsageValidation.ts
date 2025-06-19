// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useTokens } from "@/hooks/useTokens";
import { LinkDetailModel } from "@/services/types/link.service.types";
import { ValidationResult, ValidationError, FormAsset } from "@/types/validation.types";
import { ValidationService } from "@/services/validation.service";
import { ErrorCode } from "@/types/error.enum";
import { LINK_TYPE } from "@/services/types/enum";

/**
 * Hook for validating asset info and fees for link usage
 */
export const useLinkUsageValidation = () => {
    const { t } = useTranslation();
    const { createTokenMap } = useTokens();

    /**
     * Validates if the user has sufficient balance for link usage including any fees
     * @param link The link to validate
     * @param options Additional validation options
     */
    const validateAssetAndFees = useCallback(
        (link: LinkDetailModel | null): ValidationResult => {
            const errors: ValidationError[] = [];

            if (!link || !link.asset_info) {
                errors.push({
                    field: "link",
                    code: ErrorCode.LINK_NOT_FOUND,
                    message: t("error.resource.link_not_found"),
                });
                return { isValid: false, errors };
            }

            try {
                const tokenMap = createTokenMap();
                const actionNum = Number(link.maxActionNumber || 1);

                // Convert link assets to FormAsset format for validation
                const formAssets: FormAsset[] = link.asset_info.map((asset) => ({
                    tokenAddress: asset.address,
                    amount: asset.amountPerUse,
                    chain: asset.chain,
                    label: asset.label,
                }));

                // Use the unified validation system
                const validationResult = ValidationService.validateAssetsWithFees(
                    formAssets,
                    tokenMap,
                    {
                        useCase: "use",
                        linkType: link.linkType as LINK_TYPE,
                        maxActionNumber: actionNum,
                        includeLinkCreationFee: false,
                        skipBalanceCheck: false,
                    },
                );

                console.log("Validation result:", validationResult);

                // Convert validation errors to our format
                validationResult.errors.forEach((error) => {
                    const errorCode =
                        error.code === ErrorCode.INSUFFICIENT_BALANCE_CREATE
                            ? ErrorCode.INSUFFICIENT_BALANCE_CREATE
                            : ErrorCode.INSUFFICIENT_BALANCE;

                    let message = error.message;
                    if (error.metadata && error.message.startsWith("error.")) {
                        message = t(error.message, error.metadata);
                    }

                    errors.push({
                        field: error.field,
                        code: errorCode,
                        message,
                        metadata: error.metadata,
                    });
                });
            } catch (error) {
                errors.push({
                    field: "balance",
                    code: ErrorCode.BALANCE_CHECK_FAILED,
                    message: `Balance validation failed: ${error instanceof Error ? error.message : String(error)}`,
                });
            }

            return { isValid: errors.length === 0, errors };
        },
        [createTokenMap, t],
    );

    return {
        validateAssetAndFees,
    };
};
