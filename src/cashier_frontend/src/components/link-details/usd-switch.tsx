// Cashier — No-code blockchain transaction builder
// Copyright (C) 2025 TheCashierApp LLC
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

import { FungibleToken } from "@/types/fungible-token.speculative";
import { formatDollarAmount, formatNumber } from "@/utils/helpers/currency";
import { Repeat2 } from "lucide-react";
import { FC, useMemo, ReactNode } from "react";
import { useTranslation } from "react-i18next";

export type ConversionResult = {
    tokenAmount: number;
    usdAmount: number;
    tokenFormatted: string;
    usdFormatted: string | ReactNode;
};

type UsdSwitchProps = {
    token: FungibleToken;
    amount?: number | null;
    symbol?: string;
    isUsd: boolean;
    canConvert?: boolean;
    onToggle: (isUsd: boolean) => void;
    // Optional formatting settings
    tokenDecimals?: number;
    usdDecimals?: number;
};

export const UsdSwitch: FC<UsdSwitchProps> = ({
    token,
    isUsd,
    onToggle,
    amount,
    symbol,
    canConvert,
    tokenDecimals = 8,
    usdDecimals = 2,
}) => {
    const { t } = useTranslation();

    // Calculate both USD and token amounts from the current amount
    const conversionResult = useMemo((): ConversionResult => {
        const tokenToUsd = token.usdConversionRate;
        const tokenAmount = amount || 0;

        // Default values
        const result = {
            tokenAmount: 0,
            usdAmount: 0,
            tokenFormatted: "0",
            usdFormatted: "$0",
        };

        if (!tokenAmount || !tokenToUsd) return result;

        const usdAmount = tokenAmount * tokenToUsd;

        return {
            tokenAmount,
            usdAmount,
            tokenFormatted: formatNumber(tokenAmount.toString()),
            usdFormatted: formatNumber(usdAmount.toString()),
        };
    }, [amount, token.usdConversionRate, tokenDecimals, usdDecimals]);

    // Choose what to display based on isUsd
    const valueToDisplay = useMemo(() => {
        if (isUsd) {
            console.log("USD amount:", conversionResult.usdAmount);
            console.log("USD formatted:", amount);
            return `${formatNumber(amount?.toString() || "0")} ${symbol}`;
        }

        // Handle special case for zero to avoid double dollar signs
        if (conversionResult.usdAmount === 0) {
            return <span className="flex items-center">~$0</span>;
        }

        return formatDollarAmount(conversionResult.usdAmount);
    }, [isUsd, amount, symbol, conversionResult]);

    // Provide a utility function to convert between USD and token amounts
    const convertAmount = (value: number, toUsd: boolean): number => {
        if (!token.usdConversionRate || value === 0) return 0;

        if (toUsd) {
            // Convert token to USD
            return value * token.usdConversionRate;
        } else {
            // Convert USD to token
            return value / token.usdConversionRate;
        }
    };

    if (!canConvert) {
        return (
            <span className="text-[10px] font-light text-grey-400">
                {t("transaction.usd_conversion.no_price_available")}
            </span>
        );
    }

    return (
        <button
            type="button"
            className="flex items-center text-grey-400"
            onClick={() => onToggle(!isUsd)}
            aria-label={isUsd ? "Switch to token amount" : "Switch to USD amount"}
        >
            <span className="text-[10px] font-light">{valueToDisplay}</span>
            <Repeat2 className="ml-1 text-destructive" size={15} strokeWidth={2} />
        </button>
    );
};

// Utility functions that can be imported elsewhere
export const convertToUsd = (tokenAmount: number, conversionRate?: number): number => {
    if (!conversionRate || tokenAmount === 0) return 0;
    return tokenAmount * conversionRate;
};

export const convertFromUsd = (usdAmount: number, conversionRate?: number): number => {
    if (!conversionRate || usdAmount === 0) return 0;
    return usdAmount / conversionRate;
};
