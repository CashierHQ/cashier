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
import { useCallback, useMemo } from "react";

export interface MediaQuery {
    isLargeDevice: boolean;
    isMediumDevice: boolean;
    isExtraLargeDevice: boolean;
    isSmallDevice: boolean;
    showCompactHeader: (pathname: string) => boolean;
    hideHeader: (pathname: string) => boolean;
    showHeaderWithBackButtonAndWalletButton: (
        pathname: string,
        search?: string,
        isSignedOut?: boolean,
    ) => boolean;
}

export function useResponsive(): MediaQuery {
    const hideHeaderPaths = [
        "/wallet/send",
        "/wallet/receive",
        "/wallet/manage",
        "/wallet/import",
        "/wallet/details",
    ];
    const compactHeaderPaths = ["/wallet"];

    const headerWithBackButtonAndWalletButtonPaths = [/^\/[^/]+$/]; // Matches paths like "/uuid"

    const isSmallDevice = useMediaQuery("only screen and (max-width : 768px)");
    const isMediumDevice = useMediaQuery(
        "only screen and (min-width : 769px) and (max-width : 992px)",
    );
    const isLargeDevice = useMediaQuery(
        "only screen and (min-width : 993px) and (max-width : 1200px)",
    );
    const isExtraLargeDevice = useMediaQuery("only screen and (min-width : 1201px)");
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
            const matchesQuery = search
                ? new URLSearchParams(search).get("step") === "claim"
                : false;
            return (
                (matchesPath && matchesQuery) ||
                (matchesPath && matchesQuery && isSignedOut) ||
                false
            );
        },
        [headerWithBackButtonAndWalletButtonPaths],
    );
    return {
        isLargeDevice,
        isMediumDevice,
        isExtraLargeDevice,
        isSmallDevice,
        showCompactHeader,
        hideHeader,
        showHeaderWithBackButtonAndWalletButton,
    };
}
