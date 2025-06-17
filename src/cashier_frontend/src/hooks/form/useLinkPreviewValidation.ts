// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useTokens } from "@/hooks/useTokens";
import { LinkDetailModel } from "@/services/types/link.service.types";
import { ValidationResult, ValidationError, FormAsset } from "@/types/validation.types";
import { ValidationService } from "@/services/validation.service";
import { ErrorCode } from "@/types/error.enum";
import { LINK_TYPE } from "@/services/types/enum";

/**
 * Enhanced centralized validation hook for LinkPreview component with balance checking
 */
export const useLinkPreviewValidation = () => {
    const { t } = useTranslation();
    const { createTokenMap, getTokenPrice } = useTokens();

    // Show toast notification for validation errors
    const showValidationErrorToast = useCallback(
        (errors: ValidationError[]) => {
            errors.forEach((error) => {
                switch (error.code) {
                    case ErrorCode.LINK_NOT_FOUND:
                        toast.error(t("error.resource.link_not_found"), {
                            description: error.message,
                        });
                        break;
                    case ErrorCode.ACTION_NOT_FOUND:
                        toast.error(t("error.resource.action_not_found"), {
                            description: error.message,
                        });
                        break;
                    case ErrorCode.INSUFFICIENT_BALANCE:
                        toast.error(t("error.balance.insufficient_balance"), {
                            description: error.message,
                        });
                        break;
                    case ErrorCode.TRANSACTION_FAILED:
                        toast.error(t("error.transaction.transaction_failed"), {
                            description: error.message,
                        });
                        break;
                    case ErrorCode.LINK_CREATION_FAILED:
                        toast.error(t("error.link.link_creation_failed"), {
                            description: error.message,
                        });
                        break;
                    case ErrorCode.FORM_VALIDATION_FAILED:
                        toast.error(t("error.form.form_validation_failed"), {
                            description: error.message,
                        });
                        break;
                    default:
                        toast.error(t("common.error"), {
                            description: error.message,
                        });
                        break;
                }
            });
        },
        [t],
    );

    // Validate link preview before submission
    const validateLinkPreview = useCallback(
        (link: LinkDetailModel | null): ValidationResult => {
            const errors: ValidationError[] = [];

            // Validate link existence
            if (!link) {
                errors.push({
                    field: "link",
                    code: ErrorCode.LINK_NOT_FOUND,
                    message: t("error.resource.link_not_found"),
                });
            }

            // Validate link type
            if (link && !link.linkType) {
                errors.push({
                    field: "linkType",
                    code: ErrorCode.FORM_VALIDATION_FAILED,
                    message: t("error.form.form_validation_failed"),
                });
            }

            // Show toast notifications for errors
            if (errors.length > 0) {
                showValidationErrorToast(errors);
            }

            return {
                isValid: errors.length === 0,
                errors,
            };
        },
        [showValidationErrorToast],
    );

    // Simplified action creation validation
    const validateActionCreation = useCallback(
        (link: LinkDetailModel | null): ValidationResult => {
            const errors: ValidationError[] = [];

            if (!link) {
                errors.push({
                    field: "link",
                    code: ErrorCode.LINK_NOT_FOUND,
                    message: t("error.resource.link_not_found"),
                });
            }

            if (errors.length > 0) {
                showValidationErrorToast(errors);
            }

            return { isValid: errors.length === 0, errors };
        },
        [showValidationErrorToast],
    ); // Balance validation for transaction processing with creation fee control
    const validateBalanceWithCreationFee = useCallback(
        (
            link: LinkDetailModel | null,
            maxActionNumber?: number,
            includeLinkCreationFee: boolean = false,
        ): ValidationResult => {
            const errors: ValidationError[] = [];

            console.log("Validating balance with creation fee control", link);

            if (!link || !link.asset_info) {
                throw new Error(t("error.resource.link_not_found"));
            }

            try {
                const tokenMap = createTokenMap();
                const actionNum = Number(link.maxActionNumber || maxActionNumber || 1);

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
                        useCase: "create",
                        linkType: link.linkType as LINK_TYPE,
                        maxActionNumber: actionNum,
                        includeLinkCreationFee,
                        skipBalanceCheck: false,
                    },
                );

                // Convert validation errors to our format
                validationResult.errors.forEach((error) => {
                    const errorCode =
                        error.code === ErrorCode.INSUFFICIENT_BALANCE_CREATE
                            ? ErrorCode.INSUFFICIENT_BALANCE_CREATE
                            : ErrorCode.INSUFFICIENT_BALANCE;

                    let message = error.message;

                    // Handle template-based error messages
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

                // Check max action number for airdrops
                if (actionNum <= 0) {
                    errors.push({
                        field: "maxActionNumber",
                        code: ErrorCode.FORM_VALIDATION_FAILED,
                        message: "maxActionNumber must be greater than 0",
                    });
                }
            } catch (error) {
                errors.push({
                    field: "balance",
                    code: ErrorCode.BALANCE_CHECK_FAILED,
                    message: `Balance validation failed: ${error instanceof Error ? error.message : String(error)}`,
                });
            }

            // Show toast notifications for errors
            if (errors.length > 0) {
                showValidationErrorToast(errors);
            }

            return { isValid: errors.length === 0, errors };
        },
        [createTokenMap, getTokenPrice, showValidationErrorToast],
    );

    // Enhanced link preview validation with balance check
    const validateLinkPreviewWithBalance = useCallback(
        (
            link: LinkDetailModel | null,
            options: {
                maxActionNumber?: bigint;
                includeLinkCreationFee?: boolean;
            } = {},
        ): ValidationResult => {
            // First run basic link validation
            const basicValidation = validateLinkPreview(link);
            if (!basicValidation.isValid) {
                return basicValidation;
            }

            // Then run balance validation with optional creation fee control
            const balanceValidation = validateBalanceWithCreationFee(
                link,
                Number(options.maxActionNumber),
                options.includeLinkCreationFee ?? true,
            );

            console.log("Balance Validation Result:", balanceValidation);

            // Combine results
            const allErrors = [...basicValidation.errors, ...balanceValidation.errors];
            return {
                isValid: allErrors.length === 0,
                errors: allErrors,
            };
        },
        [validateLinkPreview, validateBalanceWithCreationFee],
    );

    return {
        validateLinkPreview,
        validateActionCreation,
        validateBalanceWithCreationFee,
        validateLinkPreviewWithBalance,
        showValidationErrorToast,
    };
};
