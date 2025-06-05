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

import { useCallback } from "react";
import { NavigateOptions, useNavigate } from "react-router-dom";
import { LINK_USER_STATE } from "@/services/types/enum";
import { LinkGetUserStateOutputModel } from "@/services/types/link.service.types";

/**
 * Hook for centralized link navigation.
 *
 * This hook centralizes all navigation logic related to link flows:
 * - Default view: /{linkId} - The initial link view
 * - Choose wallet view: /{linkId}/choose-wallet - Where users select a wallet
 * - Complete view: /{linkId}/complete - Shown after successful link usage
 *
 * Using this hook ensures consistent navigation behavior across components
 * and simplifies future route changes.
 *
 * @example
 * const { goToLinkDefault, goToChooseWallet, goToComplete } = useLinkNavigation(linkId);
 *
 * // Navigate to default link page
 * goToLinkDefault();
 *
 * // Navigate to choose wallet page
 * goToChooseWallet();
 *
 * // Navigate to completion page with replace option
 * goToComplete({ replace: true });
 */
export const useLinkUseNavigation = (linkId?: string) => {
    const navigate = useNavigate();

    /**
     * Navigate to the link's default view
     */
    const goToLinkDefault = useCallback(() => {
        if (!linkId) return;
        navigate(`/${linkId}`);
    }, [linkId, navigate]);

    /**
     * Navigate to the choose wallet view
     */
    const goToChooseWallet = useCallback(() => {
        if (!linkId) return;
        navigate(`/${linkId}/choose-wallet`);
    }, [linkId, navigate]);

    /**
     * Navigate to the completion view
     * @param options Navigation options
     */
    const goToComplete = useCallback(
        (options?: NavigateOptions) => {
            if (!linkId) return;
            navigate(`/${linkId}/complete`, options);
        },
        [linkId, navigate],
    );

    /**
     * Handle navigation based on link user state
     * @param userState The current link user state
     * @param isAuthenticated Whether the user is authenticated
     */
    const handleStateBasedNavigation = useCallback(
        (userState?: LinkGetUserStateOutputModel, isAuthenticated?: boolean) => {
            if (!linkId) return;

            // For logged-in users with complete state, redirect to complete page
            if (isAuthenticated && userState?.link_user_state === LINK_USER_STATE.COMPLETE) {
                goToComplete({ replace: true });
            }
        },
        [linkId, goToComplete],
    );

    return {
        goToLinkDefault,
        goToChooseWallet,
        goToComplete,
        handleStateBasedNavigation,
    };
};
