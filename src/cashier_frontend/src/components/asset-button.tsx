import React, { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { UsdSwitch } from "./link-details/usd-switch";
import { AmountActionButtons } from "./link-details/amount-action-buttons";
import { FungibleToken } from "@/types/fungible-token.speculative";
import { convertDecimalBigIntToNumber } from "@/utils";

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
    showInput = true,
}) => {
    // Determine which value to display based on isUsd flag
    const displayValue = isUsd ? usdValue : tokenValue;

    return (
        <div className="flex flex-col w-full">
            {/* Asset selector with input */}
            <div className={cn("input-field-asset flex items-center")}>
                {childrenNode ? (
                    <span className="flex items-center w-full">
                        <span onClick={handleClick} className="flex-grow text-left">
                            {childrenNode}
                        </span>
                        <div className="flex w-fit items-center">
                            {showInput && (
                                <input
                                    value={displayValue === "0" ? "" : displayValue}
                                    onChange={(e) => onInputChange?.(e.target.value)}
                                    type="number"
                                    step="any"
                                    className="w-fit ml-auto text-end text-[14px] font-normal placeholder:text-[#D9D9D9] focus:outline-none"
                                    placeholder="0"
                                />
                            )}
                            {isUsd && <span className="text-[12px] text-gray-400 ml-1">USD$</span>}
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
                    <p className="text-[10px] font-light text-grey/60">
                        Balance{" "}
                        {token?.amount
                            ? convertDecimalBigIntToNumber(token.amount, token.decimals)
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
                            usdDecimals={2}
                        />
                    )}
                </div>
            )}

            {/* Preset Buttons */}
            {showPresetButtons && presetButtons.length > 0 && (
                <div className="mt-2">
                    <AmountActionButtons data={presetButtons} isDisabled={isDisabled} />
                </div>
            )}
        </div>
    );
};

export default AssetButton;
