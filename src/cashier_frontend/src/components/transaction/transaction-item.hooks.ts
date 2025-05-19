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

import { IntentModel } from "@/services/types/intent.service.types";
import { useEffect, useState } from "react";
import { useTokens } from "@/hooks/useTokens";

export const useTransactionItemMeta = (intent: IntentModel) => {
    const [tokenSymbol, setTokenSymbol] = useState<string>();
    const [displayAmount, setDisplayAmount] = useState<number>();
    const [displayNetworkFee, setDisplayNetworkFee] = useState<number>();

    const { getToken, isLoadingBalances } = useTokens();

    // Get token data directly from useTokens
    const token = getToken(intent.asset.address);

    useEffect(() => {
        if (token && token.decimals !== undefined) {
            // Set token symbol
            setTokenSymbol(token.symbol);

            // Calculate amount using token decimals
            setDisplayAmount(Number(intent.amount) / 10 ** token.decimals);

            // Calculate network fee if present
            if (token.fee !== undefined) {
                setDisplayNetworkFee(Number(token.fee) / 10 ** token.decimals);
            }
        }
    }, [token, intent.amount]);

    return {
        tokenSymbol,
        displayAmount,
        displayNetworkFee,
        isLoadingMetadata: isLoadingBalances || !token,
    };
};
