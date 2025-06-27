// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { LINK_TEMPLATES } from "@/constants/linkTemplates";
import { LINK_TYPE } from "@/services/types/enum";
import { UserInputItem } from "@/stores/linkCreationFormStore";
import { ValidationResult, ValidationError } from "@/types/validation.types";
import { ErrorCode } from "@/types/error.enum";

export interface LinkTemplateValidationState {
    showNoNameError: boolean;
    showComingSoonError: boolean;
    showUnsupportedTypeError: boolean;
    validationErrors: ValidationError[];
}

/**
 * Centralized validation hook for LinkTemplate component
 *
 * Handles all validation logic including:
 * - Link name validation (required field)
 * - Template availability validation (coming soon check)
 * - Link type support validation
 * - Link existence validation
 *
 * Features:
 * - Centralized validation state management
 * - Automatic error clearing on user interaction
 * - Consistent error messaging
 * - Type-safe validation methods
 * - Toast notifications for validation errors
 *
 * @example
 * ```tsx
 * const {
 *   validationState,
 *   validateLinkTemplate,
 *   clearValidationError,
 * } = useLinkTemplateValidation();
 *
 * // Validate form submission
 * const result = validateLinkTemplate(currentLink, carouselIndex);
 * if (!result.isValid) {
 *   // Errors are automatically displayed via toast
 *   return;
 * }
 *
 * // Clear specific error on user interaction
 * clearValidationError('showNoNameError');
 * ```
 */
export const useLinkTemplateValidation = () => {
    const { t } = useTranslation();

    // Centralized validation state
    const [validationState, setValidationState] = useState<LinkTemplateValidationState>({
        showNoNameError: false,
        showComingSoonError: false,
        showUnsupportedTypeError: false,
        validationErrors: [],
    });

    // Clear all validation errors
    const clearValidationErrors = useCallback(() => {
        setValidationState({
            showNoNameError: false,
            showComingSoonError: false,
            showUnsupportedTypeError: false,
            validationErrors: [],
        });
    }, []);

    // Clear specific validation error
    const clearValidationError = useCallback((errorType: keyof LinkTemplateValidationState) => {
        setValidationState((prev) => ({
            ...prev,
            [errorType]: false,
        }));
    }, []);

    // Clear validation errors by field
    const clearValidationErrorsByField = useCallback((field: string) => {
        setValidationState((prev) => ({
            ...prev,
            validationErrors: prev.validationErrors.filter((error) => error.field !== field),
        }));
    }, []);

    // Show specific validation error
    const showValidationError = useCallback((errorType: keyof LinkTemplateValidationState) => {
        setValidationState((prev) => ({
            ...prev,
            [errorType]: true,
        }));
    }, []);

    // Show toast notification for validation errors
    const showValidationErrorToast = useCallback(
        (errors: ValidationError[]) => {
            errors.forEach((error) => {
                switch (error.code) {
                    case ErrorCode.REQUIRED:
                        toast.error(t("common.error"), {
                            description: error.message,
                        });
                        break;
                    case ErrorCode.TEMPLATE_COMING_SOON:
                        toast.info(t("error.template.template_coming_soon"), {
                            description: error.message,
                        });
                        break;
                    case ErrorCode.LINK_TYPE_UNSUPPORTED:
                        toast.error(t("error.link.link_type_unsupported"), {
                            description: error.message,
                        });
                        break;
                    case ErrorCode.NOT_FOUND:
                        toast.error(t("error.resource.not_found"), {
                            description: error.message,
                        });
                        break;
                    default:
                        toast.error(t("error.form.form_validation_failed"), {
                            description: error.message,
                        });
                        break;
                }
            });
        },
        [t],
    );

    // Check if link type is supported
    const isLinkTypeSupported = useCallback((linkType: LINK_TYPE) => {
        const supportedLinkTypes = [
            LINK_TYPE.SEND_TIP,
            LINK_TYPE.SEND_TOKEN_BASKET,
            LINK_TYPE.SEND_AIRDROP,
            LINK_TYPE.RECEIVE_PAYMENT,
        ];
        return supportedLinkTypes.includes(linkType);
    }, []);

    // Validate link template submission with toast notifications
    const validateLinkTemplate = useCallback(
        (
            currentLink: Partial<UserInputItem> | undefined,
            carouselIndex: number,
        ): ValidationResult => {
            const errors: ValidationError[] = [];

            // Clear previous errors
            clearValidationErrors();

            // Validate link name
            if (!currentLink?.title || currentLink.title.trim() === "") {
                showValidationError("showNoNameError");
                errors.push({
                    field: "title",
                    code: ErrorCode.REQUIRED,
                    message: t("create.errors.no_name"),
                });
            }

            // Validate template availability
            const selectedTemplate = LINK_TEMPLATES[carouselIndex];
            if (selectedTemplate?.isComingSoon) {
                showValidationError("showComingSoonError");
                errors.push({
                    field: "template",
                    code: ErrorCode.TEMPLATE_COMING_SOON,
                    message: t("error.template.template_coming_soon"),
                });
            }

            // Validate link type support
            if (currentLink?.linkType && !isLinkTypeSupported(currentLink.linkType as LINK_TYPE)) {
                showValidationError("showUnsupportedTypeError");
                errors.push({
                    field: "linkType",
                    code: ErrorCode.LINK_TYPE_UNSUPPORTED,
                    message: t("error.link.link_type_unsupported"),
                });
            }

            // Validate link existence
            if (currentLink && !currentLink.linkId) {
                errors.push({
                    field: "linkId",
                    code: ErrorCode.LINK_NOT_FOUND,
                    message: t("error.resource.link_not_found"),
                });
            }

            // Store validation errors in state
            setValidationState((prev) => ({
                ...prev,
                validationErrors: errors,
            }));

            // Show toast notifications for errors
            if (errors.length > 0) {
                showValidationErrorToast(errors);
            }

            return {
                isValid: errors.length === 0,
                errors,
            };
        },
        [
            t,
            clearValidationErrors,
            showValidationError,
            isLinkTypeSupported,
            showValidationErrorToast,
        ],
    );

    // Get validation message for display (fallback for UI components)
    const getValidationMessage = useCallback(
        (errorType: keyof LinkTemplateValidationState): string => {
            // First check for specific validation errors
            const relevantError = validationState.validationErrors.find((error) => {
                switch (errorType) {
                    case "showNoNameError":
                        return error.field === "title" && error.code === ErrorCode.REQUIRED;
                    case "showComingSoonError":
                        return (
                            error.field === "template" &&
                            error.code === ErrorCode.TEMPLATE_COMING_SOON
                        );
                    case "showUnsupportedTypeError":
                        return (
                            error.field === "linkType" &&
                            error.code === ErrorCode.LINK_TYPE_UNSUPPORTED
                        );
                    default:
                        return false;
                }
            });

            // Return the specific error message if found
            if (relevantError) {
                return relevantError.message;
            }

            // Fallback to default messages
            switch (errorType) {
                case "showNoNameError":
                    return t("create.errors.no_name");
                case "showComingSoonError":
                    return t("error.template.template_coming_soon");
                case "showUnsupportedTypeError":
                    return t("error.link.link_type_unsupported");
                default:
                    return "";
            }
        },
        [t, validationState.validationErrors],
    );

    // Check if any validation errors are active
    const hasValidationErrors = useCallback(() => {
        return (
            Object.values(validationState).some((error) => error) ||
            validationState.validationErrors.length > 0
        );
    }, [validationState]);

    // Get all validation errors for display
    const getAllValidationErrors = useCallback(() => {
        return validationState.validationErrors;
    }, [validationState.validationErrors]);

    // Get validation errors by field
    const getValidationErrorsByField = useCallback(
        (field: string) => {
            return validationState.validationErrors.filter((error) => error.field === field);
        },
        [validationState.validationErrors],
    );

    return {
        // Validation state
        validationState,

        // Validation methods
        validateLinkTemplate,
        clearValidationErrors,
        clearValidationError,
        clearValidationErrorsByField,
        showValidationError,
        isLinkTypeSupported,

        // Toast methods
        showValidationErrorToast,

        // Utility methods
        getValidationMessage,
        hasValidationErrors,
        getAllValidationErrors,
        getValidationErrorsByField,
    };
};
