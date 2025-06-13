// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import React, { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { UsdSwitch } from "./link-details/usd-switch";
import { AmountActionButtons } from "./link-details/amount-action-buttons";
import { FungibleToken } from "@/types/fungible-token.speculative";
import { convertDecimalBigIntToNumber } from "@/utils";
import { formatNumber } from "@/utils/helpers/currency";

interface AssetButtonProps {
    handleClick: () => void;
    text: string;
    childrenNode?: React.ReactNode;
    tokenValue?: string;
    usdValue?: string;
    onInputChange?: (value: string) => void;
    isUsd?: boolean;
    token?: FungibleToken;
    onToggleUsd?: (value: boolean) => void;
    canConvert?: boolean;
    tokenDecimals?: number;
    showPresetButtons?: boolean;
    presetButtons?: Array<{ content: string; action: () => void }>;
    isDisabled?: boolean;
    showMaxButton?: boolean;
    onMaxClick?: () => void;
    showInput?: boolean;
    isTip?: boolean;
}

const AssetButton: React.FC<AssetButtonProps> = ({
    text,
    handleClick,
    childrenNode,
    tokenValue,
    usdValue,
    onInputChange,
    isUsd = false,
    token,
    onToggleUsd,
    canConvert = false,
    tokenDecimals = 8,
    showPresetButtons = false,
    presetButtons = [],
    isDisabled = false,
    showMaxButton = false,
    onMaxClick,
    isTip,
    showInput = true,
}) => {
    // Determine which value to display based on isUsd flag
    const displayValue = isUsd ? usdValue : tokenValue;

    // Local state for immediate UI feedback
    const [localInputValue, setLocalInputValue] = useState<string>(displayValue || "");

    // Update local state when props change
    React.useEffect(() => {
        setLocalInputValue(displayValue || "");
    }, [displayValue]);

    // Ref for debounce timer
    const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Validate and format input for crypto amounts
    const handleInputChange = (value: string) => {
        // Allow only digits and at most one decimal point (period or comma)
        let sanitized = "";
        let hasDecimal = false;

        for (let i = 0; i < value.length; i++) {
            const char = value[i];

            // Allow digits
            if (/[0-9]/.test(char)) {
                sanitized += char;
            }
            // Allow only one decimal point (either . or ,)
            else if ((char === "." || char === ",") && !hasDecimal) {
                sanitized += "."; // Always store as period internally
                hasDecimal = true;
            }
        }

        // Update local state immediately for UI feedback
        setLocalInputValue(sanitized);

        // Clear any existing timer
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }

        // Set a new timer to call onInputChange after 500ms
        debounceTimerRef.current = setTimeout(() => {
            onInputChange?.(sanitized);
        }, 1000);
    };

    // Format the display value to avoid scientific notation
    const formatDisplayValue = (value: string): string => {
        if (!value) return "";

        // Parse the value as a number
        const num = parseFloat(value);

        // If it's a valid number but would display as scientific notation
        if (!isNaN(num) && Math.abs(num) > 0 && Math.abs(num) < 0.0001) {
            // Convert to decimal string without scientific notation
            return num.toLocaleString("fullwide", {
                useGrouping: false,
                maximumFractionDigits: 20,
            });
        }

        return value;
    };

    return (
        <div className="flex flex-col w-full relative">
            {/* Asset selector with input */}
            <div className={cn("input-field-asset flex items-center relative")}>
                {childrenNode ? (
                    <span className="flex items-center w-full relative">
                        <span onClick={handleClick} className="text-left w-fit">
                            {childrenNode}
                        </span>
                        <div className="flex w-fit items-center ml-auto relative">
                            {showInput && (
                                <>
                                    <div className="relative flex items-center">
                                        {isUsd && (
                                            <span className="text-[14px] text-gray-400 mr-1">
                                                $
                                            </span>
                                        )}
                                        <input
                                            id={`asset-input-${token?.address}`}
                                            value={formatDisplayValue(localInputValue)}
                                            onChange={(e) => handleInputChange(e.target.value)}
                                            type="text"
                                            inputMode="decimal"
                                            className="w-auto min-w-[30px] ml-auto text-end text-[14px] font-normal placeholder:text-[#D9D9D9] focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                            placeholder="0"
                                            style={{
                                                width: `${Math.max((formatDisplayValue(localInputValue) || "").length * 9, 30)}px`,
                                                maxWidth: "250px",
                                                position: "relative",
                                                zIndex: 0,
                                            }}
                                        />
                                        {/* Overlay rendered after input, with higher z-index */}
                                        <div
                                            onClick={() => {
                                                const input = document.getElementById(
                                                    `asset-input-${token?.address}`,
                                                );
                                                input?.focus();
                                            }}
                                            className="absolute right-0 top-0 h-full w-[100px] z-20 cursor-pointer"
                                        />
                                    </div>
                                </>
                            )}
                        </div>
                    </span>
                ) : (
                    <span className="flex items-center">
                        <span className="flex-grow text-left">{text}</span>
                    </span>
                )}
            </div>

            {/* Balance and USD Switch */}
            {token && (
                <div className="flex px-1 items-center justify-between mt-1.5">
                    <p className="text-[10px] font-light text-grey-400/60">
                        Balance{" "}
                        {token?.amount
                            ? formatNumber(
                                  convertDecimalBigIntToNumber(
                                      token.amount,
                                      token.decimals,
                                  ).toString(),
                              )
                            : 0}{" "}
                        {token?.symbol}
                    </p>

                    {onToggleUsd && (
                        <UsdSwitch
                            token={token}
                            amount={parseFloat(tokenValue || "0") || 0}
                            symbol={token?.name ?? ""}
                            isUsd={isUsd}
                            onToggle={onToggleUsd}
                            canConvert={canConvert}
                            tokenDecimals={tokenDecimals}
                            usdDecimals={4}
                        />
                    )}
                </div>
            )}

            {/* Preset Buttons */}
            {showPresetButtons && presetButtons.length > 0 && canConvert && isTip && (
                <div className="mt-8">
                    <AmountActionButtons data={presetButtons} isDisabled={isDisabled} />
                </div>
            )}
        </div>
    );
};

export default AssetButton;
