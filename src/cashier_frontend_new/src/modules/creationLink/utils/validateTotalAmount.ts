// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

export type ValidateTotalAmountParams = {
  perUseAmount: number;
  maxUse: number;
  maxTotalAmount: number;
};

export type ValidateTotalAmountResult = {
  isValid: boolean;
  calculatedTotal: number;
  maxPerUse: number;
  exceedsLimit: boolean;
};

/**
 * Validates if total amount (perUse * maxUse) doesn't exceed maxTotalAmount
 * @param params - Parameters for validation
 * @returns Validation result with calculated values
 */
export function validateTotalAmount(
  params: ValidateTotalAmountParams,
): ValidateTotalAmountResult {
  const { perUseAmount, maxUse, maxTotalAmount } = params;

  if (maxUse <= 0) {
    return {
      isValid: true,
      calculatedTotal: 0,
      maxPerUse: 0,
      exceedsLimit: false,
    };
  }

  const calculatedTotal = perUseAmount * maxUse;
  const exceedsLimit = calculatedTotal > maxTotalAmount;
  const maxPerUse = maxTotalAmount / maxUse;

  return {
    isValid: !exceedsLimit,
    calculatedTotal,
    maxPerUse,
    exceedsLimit,
  };
}
