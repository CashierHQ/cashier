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

import { useMediaQuery } from "@uidotdev/usehooks";
import { useCallback } from "react";

// Interface for device size detection
export interface DeviceSizeQuery {
    isLargeDevice: boolean;
    isMediumDevice: boolean;
    isExtraLargeDevice: boolean;
    isSmallDevice: boolean;
}

// Interface for header functionality
export interface HeaderQuery {
    showCompactHeader: (pathname: string) => boolean;
    hideHeader: (pathname: string) => boolean;
    showHeaderWithBackButtonAndWalletButton: (
        pathname: string,
        search?: string,
        isSignedOut?: boolean,
    ) => boolean;
}

// Combined interface for backward compatibility
export interface MediaQuery extends DeviceSizeQuery, HeaderQuery {}

/**
 * Hook for detecting device size based on media queries
 */
export function useDeviceSize(): DeviceSizeQuery {
    const isSmallDevice = useMediaQuery("only screen and (max-width : 768px)");
    const isMediumDevice = useMediaQuery(
        "only screen and (min-width : 769px) and (max-width : 992px)",
    );
    const isLargeDevice = useMediaQuery(
        "only screen and (min-width : 993px) and (max-width : 1200px)",
    );
    const isExtraLargeDevice = useMediaQuery("only screen and (min-width : 1201px)");

    return {
        isLargeDevice,
        isMediumDevice,
        isExtraLargeDevice,
        isSmallDevice,
    };
}

/**
 * Hook for header-related functionality
 */
export function useHeader(): HeaderQuery {
    const hideHeaderPaths = [
        "/wallet/send",
        "/wallet/receive",
        "/wallet/manage",
        "/wallet/import",
        "/wallet/details",
    ];
    const compactHeaderPaths = ["/wallet"];

    const headerWithBackButtonAndWalletButtonPaths = [
        /^\/[^/]+\/choose-wallet$/, // Matches paths like "/uuid/choose-wallet"
    ];

    const showCompactHeader = useCallback(
        (pathname: string) => compactHeaderPaths.some((path) => pathname.startsWith(path)),
        [compactHeaderPaths],
    );
    const hideHeader = useCallback(
        (pathname: string) => hideHeaderPaths.some((path) => pathname.startsWith(path)),
        [hideHeaderPaths],
    );
    const showHeaderWithBackButtonAndWalletButton = useCallback(
        (pathname: string, search?: string, isSignedOut?: boolean) => {
            const matchesPath = headerWithBackButtonAndWalletButtonPaths.some((pattern) =>
                pattern.test(pathname),
            );

            return matchesPath || (matchesPath && isSignedOut) || false;
        },
        [headerWithBackButtonAndWalletButtonPaths],
    );

    return {
        showCompactHeader,
        hideHeader,
        showHeaderWithBackButtonAndWalletButton,
    };
}

/**
 * Combined hook for backward compatibility
 */
export function useResponsive(): MediaQuery {
    const deviceSize = useDeviceSize();
    const header = useHeader();

    return {
        ...deviceSize,
        ...header,
    };
}
