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

import { useState, useCallback } from "react";
import { feeService } from "@/services/fee.service";
import { AssetInfo } from "@/services/types/fee.types";

/**
 * Hook for accessing the fee service functionality in React components
 */
export const useFeeService = () => {
    // Track loading state for async operations
    const [isLoading, setIsLoading] = useState<boolean>(false);
    // Track any errors that occur during fee calculation
    const [error, setError] = useState<Error | null>(null);

    /**
     * Get fee for a specific chain, link type and fee type
     */
    const getFee = useCallback(
        (chain: string, linkType: string, feeType: string): AssetInfo | null => {
            try {
                return feeService.getFee(chain, linkType, feeType);
            } catch (err) {
                setError(err instanceof Error ? err : new Error("Error getting fee"));
                return null;
            }
        },
        [],
    );

    /**
     * Get all fees for a specific chain and link type
     */
    const getAllFees = useCallback((chain: string, linkType: string): AssetInfo[] => {
        try {
            return feeService.getAllFees(chain, linkType);
        } catch (err) {
            setError(err instanceof Error ? err : new Error("Error getting all fees"));
            return [];
        }
    }, []);

    /**
     * Calculate the total fee for a chain and link type
     */
    const calculateTotalFee = useCallback(
        async (chain: string, linkType: string): Promise<number> => {
            setIsLoading(true);
            setError(null);
            try {
                const totalFee = await feeService.calculateTotalFee(chain, linkType);
                return totalFee;
            } catch (err) {
                setError(err instanceof Error ? err : new Error("Error calculating total fee"));
                return 0;
            } finally {
                setIsLoading(false);
            }
        },
        [],
    );

    /**
     * Clear any errors
     */
    const clearError = useCallback(() => {
        setError(null);
    }, []);

    return {
        getFee,
        getAllFees,
        calculateTotalFee,
        isLoading,
        error,
        clearError,
        // Also expose the fee service instance for advanced usage
        feeService,
    };
};
