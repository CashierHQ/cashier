// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { LINK_TEMPLATES } from "@/constants/linkTemplates";
import { LINK_TYPE } from "@/services/types/enum";
import { UserInputItem } from "@/stores/linkCreationFormStore";

export interface ValidationError {
    field: string;
    code: string;
    message: string;
}

export interface ValidationResult {
    isValid: boolean;
    errors: ValidationError[];
}

export interface LinkTemplateValidationState {
    showNoNameError: boolean;
    showComingSoonError: boolean;
    showUnsupportedTypeError: boolean;
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
 *   // Errors are automatically displayed via validationState
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
    });

    // Clear all validation errors
    const clearValidationErrors = useCallback(() => {
        setValidationState({
            showNoNameError: false,
            showComingSoonError: false,
            showUnsupportedTypeError: false,
        });
    }, []);

    // Clear specific validation error
    const clearValidationError = useCallback((errorType: keyof LinkTemplateValidationState) => {
        setValidationState((prev) => ({
            ...prev,
            [errorType]: false,
        }));
    }, []);

    // Show specific validation error
    const showValidationError = useCallback((errorType: keyof LinkTemplateValidationState) => {
        setValidationState((prev) => ({
            ...prev,
            [errorType]: true,
        }));
    }, []);

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

    // Validate link template submission
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
                    code: "REQUIRED",
                    message: t("create.errors.no_name"),
                });
            }

            // Validate template availability
            const selectedTemplate = LINK_TEMPLATES[carouselIndex];
            if (selectedTemplate?.isComingSoon) {
                showValidationError("showComingSoonError");
                errors.push({
                    field: "template",
                    code: "COMING_SOON",
                    message: "This feature is coming soon",
                });
            }

            // Validate link type support
            if (currentLink?.linkType && !isLinkTypeSupported(currentLink.linkType as LINK_TYPE)) {
                showValidationError("showUnsupportedTypeError");
                errors.push({
                    field: "linkType",
                    code: "UNSUPPORTED",
                    message: "This link type is not supported",
                });
            }

            // Validate link existence
            if (currentLink && !currentLink.linkId) {
                errors.push({
                    field: "linkId",
                    code: "NOT_FOUND",
                    message: "Link not found",
                });
            }

            return {
                isValid: errors.length === 0,
                errors,
            };
        },
        [t, clearValidationErrors, showValidationError, isLinkTypeSupported],
    );

    // Get validation message for display
    const getValidationMessage = useCallback(
        (errorType: keyof LinkTemplateValidationState): string => {
            switch (errorType) {
                case "showNoNameError":
                    return t("create.errors.no_name");
                case "showComingSoonError":
                    return "This feature is coming soon";
                case "showUnsupportedTypeError":
                    return "This link type is not supported";
                default:
                    return "";
            }
        },
        [t],
    );

    // Check if any validation errors are active
    const hasValidationErrors = useCallback(() => {
        return Object.values(validationState).some((error) => error);
    }, [validationState]);

    return {
        // Validation state
        validationState,

        // Validation methods
        validateLinkTemplate,
        clearValidationErrors,
        clearValidationError,
        showValidationError,
        isLinkTypeSupported,

        // Utility methods
        getValidationMessage,
        hasValidationErrors,
    };
};
