// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { CHAIN, LINK_INTENT_ASSET_LABEL } from "@/services/types/enum";
import { ErrorCode } from "./error.enum";

/**
 * Centralized validation types used across the application
 */

export interface ValidationError {
    field: string;
    code: ErrorCode;
    message: string;
    metadata?: Record<string, unknown>;
}

export interface ValidationResult {
    isValid: boolean;
    errors: ValidationError[];
    error?: string; // Optional single error message for backward compatibility
}

export interface FormAsset {
    tokenAddress: string;
    amount: bigint;
    label?: string | LINK_INTENT_ASSET_LABEL;
    chain?: CHAIN;
}

interface FlowResult<T = unknown> {
    success: boolean;
    data?: T;
    error?: Error;
    validationErrors?: ValidationError[];
}
