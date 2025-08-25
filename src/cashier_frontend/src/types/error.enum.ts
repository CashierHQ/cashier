// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

/**
 * Comprehensive error enumeration for the Cashier frontend application
 *
 * This enum provides a centralized way to handle all error types across the application.
 * Each error code corresponds to a translation key in the locales files.
 *
 * @example
 * ```typescript
 * import { ErrorCode } from '@/types/error.enum';
 *
 * throw new CashierError(ErrorCode.INSUFFICIENT_BALANCE, {
 *   tokenSymbol: 'ICP',
 *   available: '10.5',
 *   required: '15.0'
 * });
 * ```
 */

export enum ErrorCode {
  // Generic errors
  UNKNOWN_ERROR = "UNKNOWN_ERROR",
  NETWORK_ERROR = "NETWORK_ERROR",
  TIMEOUT_ERROR = "TIMEOUT_ERROR",

  // Authentication & Authorization
  UNAUTHORIZED = "UNAUTHORIZED",
  ANONYMOUS_CALL = "ANONYMOUS_CALL",
  PERMISSION_DENIED = "PERMISSION_DENIED",

  // Validation errors
  REQUIRED = "REQUIRED",
  INVALID_INPUT = "INVALID_INPUT",
  INVALID_FORMAT = "INVALID_FORMAT",
  INVALID_AMOUNT = "INVALID_AMOUNT",
  INVALID_ADDRESS = "INVALID_ADDRESS",
  INVALID_CHAIN = "INVALID_CHAIN",
  INVALID_TOKEN_ADDRESS = "INVALID_TOKEN_ADDRESS",
  INVALID_MAX_ACTIONS = "INVALID_MAX_ACTIONS",
  INVALID_STATE_TRANSITION = "INVALID_STATE_TRANSITION",

  // Resource errors
  NOT_FOUND = "NOT_FOUND",
  LINK_NOT_FOUND = "LINK_NOT_FOUND",
  ACTION_NOT_FOUND = "ACTION_NOT_FOUND",
  TOKEN_NOT_FOUND = "TOKEN_NOT_FOUND",
  USER_INPUT_NOT_FOUND = "USER_INPUT_NOT_FOUND",

  // Balance & Financial errors
  INSUFFICIENT_BALANCE = "INSUFFICIENT_BALANCE",
  INSUFFICIENT_BALANCE_CREATE = "INSUFFICIENT_BALANCE_CREATE",
  NO_USES_AVAILABLE = "NO_USES_AVAILABLE",
  BALANCE_CHECK_FAILED = "BALANCE_CHECK_FAILED",

  // Asset errors
  NO_ASSETS_FOUND = "NO_ASSETS_FOUND",

  // Link errors
  LINK_ID_MISSING = "LINK_ID_MISSING",
  LINK_TYPE_UNSUPPORTED = "LINK_TYPE_UNSUPPORTED",
  LINK_CREATION_FAILED = "LINK_CREATION_FAILED",

  // Template errors
  TEMPLATE_COMING_SOON = "TEMPLATE_COMING_SOON",

  // Transaction errors
  TRANSACTION_FAILED = "TRANSACTION_FAILED",

  // Form submission errors
  FORM_VALIDATION_FAILED = "FORM_VALIDATION_FAILED",
}

/**
 * Error severity levels for different error types
 */
export enum ErrorSeverity {
  INFO = "info",
  WARNING = "warning",
  ERROR = "error",
  CRITICAL = "critical",
}

/**
 * Error categories for grouping related errors
 */
export enum ErrorCategory {
  VALIDATION = "validation",
  AUTHENTICATION = "authentication",
  NETWORK = "network",
  BUSINESS_LOGIC = "business_logic",
  USER_INPUT = "user_input",
  SYSTEM = "system",
  EXTERNAL_SERVICE = "external_service",
}

/**
 * Interface for error metadata that can be passed with error codes
 */
export interface ErrorMetadata {
  [key: string]: string | number | boolean | null | undefined;
}

/**
 * Configuration for error codes including severity, category, and default metadata
 */
interface ErrorCodeConfig {
  severity: ErrorSeverity;
  category: ErrorCategory;
  defaultMetadata?: ErrorMetadata;
}

/**
 * Mapping of error codes to their configuration
 */
const ERROR_CODE_CONFIG: Record<ErrorCode, ErrorCodeConfig> = {
  // Generic errors
  [ErrorCode.UNKNOWN_ERROR]: {
    severity: ErrorSeverity.CRITICAL,
    category: ErrorCategory.SYSTEM,
  },
  [ErrorCode.NETWORK_ERROR]: {
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.NETWORK,
  },
  [ErrorCode.TIMEOUT_ERROR]: {
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.NETWORK,
  },

  // Authentication & Authorization
  [ErrorCode.UNAUTHORIZED]: {
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.AUTHENTICATION,
  },
  [ErrorCode.ANONYMOUS_CALL]: {
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.AUTHENTICATION,
  },
  [ErrorCode.PERMISSION_DENIED]: {
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.AUTHENTICATION,
  },

  // Validation errors
  [ErrorCode.REQUIRED]: {
    severity: ErrorSeverity.WARNING,
    category: ErrorCategory.VALIDATION,
  },
  [ErrorCode.INVALID_INPUT]: {
    severity: ErrorSeverity.WARNING,
    category: ErrorCategory.VALIDATION,
  },
  [ErrorCode.INVALID_FORMAT]: {
    severity: ErrorSeverity.WARNING,
    category: ErrorCategory.VALIDATION,
  },
  [ErrorCode.INVALID_AMOUNT]: {
    severity: ErrorSeverity.WARNING,
    category: ErrorCategory.VALIDATION,
  },
  [ErrorCode.INVALID_ADDRESS]: {
    severity: ErrorSeverity.WARNING,
    category: ErrorCategory.VALIDATION,
  },
  [ErrorCode.INVALID_CHAIN]: {
    severity: ErrorSeverity.WARNING,
    category: ErrorCategory.VALIDATION,
  },
  [ErrorCode.INVALID_TOKEN_ADDRESS]: {
    severity: ErrorSeverity.WARNING,
    category: ErrorCategory.VALIDATION,
  },
  [ErrorCode.INVALID_MAX_ACTIONS]: {
    severity: ErrorSeverity.WARNING,
    category: ErrorCategory.VALIDATION,
  },
  [ErrorCode.INVALID_STATE_TRANSITION]: {
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.BUSINESS_LOGIC,
  },

  // Resource errors
  [ErrorCode.NOT_FOUND]: {
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.BUSINESS_LOGIC,
  },
  [ErrorCode.LINK_NOT_FOUND]: {
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.BUSINESS_LOGIC,
  },
  [ErrorCode.ACTION_NOT_FOUND]: {
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.BUSINESS_LOGIC,
  },
  [ErrorCode.TOKEN_NOT_FOUND]: {
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.BUSINESS_LOGIC,
  },
  [ErrorCode.USER_INPUT_NOT_FOUND]: {
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.BUSINESS_LOGIC,
  },

  // Balance & Financial errors
  [ErrorCode.INSUFFICIENT_BALANCE]: {
    severity: ErrorSeverity.WARNING,
    category: ErrorCategory.BUSINESS_LOGIC,
  },
  [ErrorCode.INSUFFICIENT_BALANCE_CREATE]: {
    severity: ErrorSeverity.WARNING,
    category: ErrorCategory.BUSINESS_LOGIC,
  },
  [ErrorCode.NO_USES_AVAILABLE]: {
    severity: ErrorSeverity.WARNING,
    category: ErrorCategory.BUSINESS_LOGIC,
  },
  [ErrorCode.BALANCE_CHECK_FAILED]: {
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.BUSINESS_LOGIC,
  },

  // Asset errors
  [ErrorCode.NO_ASSETS_FOUND]: {
    severity: ErrorSeverity.WARNING,
    category: ErrorCategory.USER_INPUT,
  },

  // Link errors
  [ErrorCode.LINK_ID_MISSING]: {
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.BUSINESS_LOGIC,
  },
  [ErrorCode.LINK_TYPE_UNSUPPORTED]: {
    severity: ErrorSeverity.WARNING,
    category: ErrorCategory.BUSINESS_LOGIC,
  },
  [ErrorCode.LINK_CREATION_FAILED]: {
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.BUSINESS_LOGIC,
  },

  // Template errors
  [ErrorCode.TEMPLATE_COMING_SOON]: {
    severity: ErrorSeverity.INFO,
    category: ErrorCategory.BUSINESS_LOGIC,
  },

  // Transaction errors
  [ErrorCode.TRANSACTION_FAILED]: {
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.BUSINESS_LOGIC,
  },

  // Form submission errors
  [ErrorCode.FORM_VALIDATION_FAILED]: {
    severity: ErrorSeverity.WARNING,
    category: ErrorCategory.VALIDATION,
  },
};

/**
 * Custom error class for Cashier application errors
 */
export class CashierError extends Error {
  public readonly code: ErrorCode;
  public readonly severity: ErrorSeverity;
  public readonly category: ErrorCategory;
  public readonly metadata?: ErrorMetadata;
  public readonly timestamp: Date;

  constructor(code: ErrorCode, metadata?: ErrorMetadata, message?: string) {
    const config = ERROR_CODE_CONFIG[code];
    const errorMessage = message || `Error code: ${code}`;

    super(errorMessage);

    this.name = "CashierError";
    this.code = code;
    this.severity = config.severity;
    this.category = config.category;
    this.metadata = { ...config.defaultMetadata, ...metadata };
    this.timestamp = new Date();

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (
      typeof (Error as unknown as { captureStackTrace?: unknown })
        .captureStackTrace === "function"
    ) {
      (
        Error as unknown as {
          captureStackTrace: (target: object, constructor: object) => void;
        }
      ).captureStackTrace(this, CashierError);
    }
  }

  /**
   * Check if error is of a specific category
   */
  isCategory(category: ErrorCategory): boolean {
    return this.category === category;
  }

  /**
   * Check if error is of a specific severity
   */
  isSeverity(severity: ErrorSeverity): boolean {
    return this.severity === severity;
  }

  /**
   * Get a user-friendly representation of the error
   */
  toString(): string {
    return `${this.name}[${this.code}]: ${this.message}`;
  }

  /**
   * Convert to a plain object for serialization
   */
  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      severity: this.severity,
      category: this.category,
      metadata: this.metadata,
      timestamp: this.timestamp.toISOString(),
      stack: this.stack,
    };
  }
}

/**
 * Type guard to check if an error is a CashierError
 */
export function isCashierError(error: unknown): error is CashierError {
  return error instanceof CashierError;
}
