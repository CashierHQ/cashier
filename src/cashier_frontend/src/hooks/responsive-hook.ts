import { useMediaQuery } from "@uidotdev/usehooks";
import { useCallback, useMemo } from "react";

export interface MediaQuery {
    isLargeDevice: boolean;
    isMediumDevice: boolean;
    isExtraLargeDevice: boolean;
    isSmallDevice: boolean;
    showCompactHeader: (pathname: string) => boolean;
    hideHeader: (pathname: string) => boolean;
    showHeaderWithBackButtonAndWalletButton: (pathname: string, search?: string) => boolean;
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
        (pathname: string, search?: string) => {
            const matchesPath = headerWithBackButtonAndWalletButtonPaths.some((pattern) =>
                pattern.test(pathname),
            );
            const matchesQuery = search
                ? new URLSearchParams(search).get("step") === "claim"
                : false;
            return matchesPath && matchesQuery;
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
