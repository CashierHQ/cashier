// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
    ErrorCode,
    ErrorSeverity,
    ErrorCategory,
    CashierError,
    ErrorMetadata,
    isCashierError,
} from "@/types/error.enum";

/**
 * Interface for translation function parameters
 */
interface TranslationOptions {
    [key: string]: string | number | boolean | null | undefined;
}

/**
 * Type for translation function
 */
type TranslationFunction = (key: string, options?: TranslationOptions) => string;

/**
 * Interface for error display options
 */
interface ErrorDisplayOptions {
    /** Whether to show toast notification */
    showToast?: boolean;
    /** Custom toast title */
    toastTitle?: string;
    /** Whether to log error to console */
    logError?: boolean;
    /** Custom error handler function */
    customHandler?: (error: CashierError) => void;
}

/**
 * Error handling service that provides centralized error management
 * with internationalization support and consistent user feedback
 */
export class ErrorHandlerService {
    private t: TranslationFunction;

    constructor(t: TranslationFunction) {
        this.t = t;
    }

    /**
     * Get the translation key for an error code
     */
    private getTranslationKey(code: ErrorCode): string {
        const keyMap: Record<ErrorCode, string> = {
            // Generic errors
            [ErrorCode.UNKNOWN_ERROR]: "error.generic.unknown_error",
            [ErrorCode.NETWORK_ERROR]: "error.generic.network_error",
            [ErrorCode.TIMEOUT_ERROR]: "error.generic.timeout_error",

            // Authentication & Authorization
            [ErrorCode.UNAUTHORIZED]: "error.authentication.unauthorized",
            [ErrorCode.ANONYMOUS_CALL]: "error.authentication.anonymous_call",
            [ErrorCode.PERMISSION_DENIED]: "error.authentication.permission_denied",

            // Validation errors
            [ErrorCode.REQUIRED]: "error.validation.required",
            [ErrorCode.INVALID_INPUT]: "error.validation.invalid_input",
            [ErrorCode.INVALID_FORMAT]: "error.validation.invalid_format",
            [ErrorCode.INVALID_AMOUNT]: "error.validation.invalid_amount",
            [ErrorCode.INVALID_ADDRESS]: "error.validation.invalid_address",
            [ErrorCode.INVALID_CHAIN]: "error.validation.invalid_chain",
            [ErrorCode.INVALID_TOKEN_ADDRESS]: "error.validation.invalid_token_address",
            [ErrorCode.INVALID_MAX_ACTIONS]: "error.validation.invalid_max_actions",
            [ErrorCode.INVALID_STATE_TRANSITION]: "error.validation.invalid_state_transition",

            // Resource errors
            [ErrorCode.NOT_FOUND]: "error.resource.not_found",
            [ErrorCode.LINK_NOT_FOUND]: "error.resource.link_not_found",
            [ErrorCode.ACTION_NOT_FOUND]: "error.resource.action_not_found",
            [ErrorCode.TOKEN_NOT_FOUND]: "error.resource.token_not_found",
            [ErrorCode.USER_INPUT_NOT_FOUND]: "error.resource.user_input_not_found",

            // Balance & Financial errors
            [ErrorCode.INSUFFICIENT_BALANCE]: "error.balance.insufficient_balance",
            [ErrorCode.INSUFFICIENT_BALANCE_CREATE]: "error.balance.insufficient_balance_create",
            [ErrorCode.NO_USES_AVAILABLE]: "error.balance.no_uses_available",
            [ErrorCode.BALANCE_CHECK_FAILED]: "error.balance.balance_check_failed",

            // Asset errors
            [ErrorCode.NO_ASSETS_FOUND]: "error.asset.no_assets_found",

            // Link errors
            [ErrorCode.LINK_ID_MISSING]: "error.link.link_id_missing",
            [ErrorCode.LINK_TYPE_UNSUPPORTED]: "error.link.link_type_unsupported",
            [ErrorCode.LINK_CREATION_FAILED]: "error.link.link_creation_failed",

            // Template errors
            [ErrorCode.TEMPLATE_COMING_SOON]: "error.template.template_coming_soon",

            // Transaction errors
            [ErrorCode.TRANSACTION_FAILED]: "error.transaction.transaction_failed",

            // Form submission errors
            [ErrorCode.FORM_VALIDATION_FAILED]: "error.form.form_validation_failed",
        };

        return keyMap[code] || "error.generic.unknown_error";
    }

    /**
     * Get the appropriate toast type based on error severity
     */
    private getToastType(severity: ErrorSeverity): "info" | "warning" | "error" {
        switch (severity) {
            case ErrorSeverity.INFO:
                return "info";
            case ErrorSeverity.WARNING:
                return "warning";
            case ErrorSeverity.ERROR:
            case ErrorSeverity.CRITICAL:
                return "error";
            default:
                return "error";
        }
    }

    /**
     * Format error message with metadata interpolation
     */
    private formatMessage(translationKey: string, metadata?: ErrorMetadata): string {
        if (!metadata) {
            return this.t(translationKey);
        }

        // Convert metadata to a format suitable for i18n interpolation
        const interpolationData: TranslationOptions = {};
        Object.entries(metadata).forEach(([key, value]) => {
            // Ensure values are compatible with TranslationOptions
            if (
                typeof value === "string" ||
                typeof value === "number" ||
                typeof value === "boolean" ||
                value == null
            ) {
                interpolationData[key] = value;
            } else {
                // Convert complex objects to strings
                interpolationData[key] = String(value);
            }
        });

        return this.t(translationKey, interpolationData);
    }

    /**
     * Handle any error and convert it to a CashierError if needed
     */
    public normalizeError(error: unknown, fallbackCode?: ErrorCode): CashierError {
        if (isCashierError(error)) {
            return error;
        }

        if (error instanceof Error) {
            // Try to infer error code from error message
            const inferredCode = this.inferErrorCodeFromMessage(error.message);
            return new CashierError(
                inferredCode || fallbackCode || ErrorCode.UNKNOWN_ERROR,
                {
                    originalMessage: error.message,
                },
                error.message,
            );
        }

        return new CashierError(fallbackCode || ErrorCode.UNKNOWN_ERROR, {
            originalError: String(error),
        });
    }

    /**
     * Attempt to infer error code from error message
     */
    private inferErrorCodeFromMessage(message: string): ErrorCode | null {
        const messageLower = message.toLowerCase();

        if (messageLower.includes("insufficient balance")) return ErrorCode.INSUFFICIENT_BALANCE;
        if (messageLower.includes("not found")) return ErrorCode.NOT_FOUND;
        if (messageLower.includes("unauthorized")) return ErrorCode.UNAUTHORIZED;
        if (messageLower.includes("timeout")) return ErrorCode.TIMEOUT_ERROR;
        if (messageLower.includes("network")) return ErrorCode.NETWORK_ERROR;
        if (messageLower.includes("invalid")) return ErrorCode.INVALID_INPUT;
        if (messageLower.includes("required")) return ErrorCode.REQUIRED;
        if (messageLower.includes("transaction failed")) return ErrorCode.TRANSACTION_FAILED;

        return null;
    }

    /**
     * Display error to user with appropriate UI feedback
     */
    public displayError(error: unknown, options: ErrorDisplayOptions = {}): CashierError {
        const { showToast = true, toastTitle, logError = true, customHandler } = options;

        // Normalize the error
        const cashierError = this.normalizeError(error);

        // Log error if requested
        if (logError) {
            console.error("CashierError:", cashierError.toJSON());
        }

        // Call custom handler if provided
        if (customHandler) {
            customHandler(cashierError);
            return cashierError;
        }

        // Show toast notification
        if (showToast) {
            const translationKey = this.getTranslationKey(cashierError.code);
            const message = this.formatMessage(translationKey, cashierError.metadata);
            const toastType = this.getToastType(cashierError.severity);

            const title = toastTitle || this.getDefaultToastTitle(cashierError.category);

            switch (toastType) {
                case "info":
                    toast.info(title, { description: message });
                    break;
                case "warning":
                    toast.warning(title, { description: message });
                    break;
                case "error":
                    toast.error(title, { description: message });
                    break;
            }
        }

        return cashierError;
    }

    /**
     * Get default toast title based on error category
     */
    private getDefaultToastTitle(category: ErrorCategory): string {
        const titleMap: Record<ErrorCategory, string> = {
            [ErrorCategory.VALIDATION]: this.t("common.error"),
            [ErrorCategory.AUTHENTICATION]: this.t("error.authentication.unauthorized"),
            [ErrorCategory.NETWORK]: this.t("error.generic.network_error"),
            [ErrorCategory.BUSINESS_LOGIC]: this.t("common.error"),
            [ErrorCategory.USER_INPUT]: this.t("common.error"),
            [ErrorCategory.SYSTEM]: this.t("error.generic.unknown_error"),
            [ErrorCategory.EXTERNAL_SERVICE]: this.t("error.generic.network_error"),
        };

        return titleMap[category] || this.t("common.error");
    }

    /**
     * Create a new CashierError with the service's translation context
     */
    public createError(
        code: ErrorCode,
        metadata?: ErrorMetadata,
        customMessage?: string,
    ): CashierError {
        let message = customMessage;
        if (!message) {
            const translationKey = this.getTranslationKey(code);
            message = this.formatMessage(translationKey, metadata);
        }

        return new CashierError(code, metadata, message);
    }

    /**
     * Throw a new CashierError with proper translation
     */
    public throwError(code: ErrorCode, metadata?: ErrorMetadata, customMessage?: string): never {
        throw this.createError(code, metadata, customMessage);
    }

    /**
     * Get translated error message without displaying it
     */
    public getErrorMessage(code: ErrorCode, metadata?: ErrorMetadata): string {
        const translationKey = this.getTranslationKey(code);
        return this.formatMessage(translationKey, metadata);
    }

    /**
     * Check if an error should be retried based on its category and severity
     */
    public isRetryable(error: CashierError): boolean {
        // Network errors and timeouts are typically retryable
        if (error.category === ErrorCategory.NETWORK) {
            return true;
        }

        // Some external service errors might be retryable
        if (error.category === ErrorCategory.EXTERNAL_SERVICE) {
            return true;
        }

        // Validation and user input errors are not retryable
        if (
            error.category === ErrorCategory.VALIDATION ||
            error.category === ErrorCategory.USER_INPUT
        ) {
            return false;
        }

        return false;
    }
}

/**
 * Hook to get an error handler service instance with current translation context
 */
export function useErrorHandler(): ErrorHandlerService {
    const { t } = useTranslation();
    return new ErrorHandlerService(t);
}
