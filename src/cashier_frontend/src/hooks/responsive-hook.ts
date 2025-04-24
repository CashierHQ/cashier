import { useMediaQuery } from "@uidotdev/usehooks";
import { useCallback, useMemo } from "react";

export interface MediaQuery {
    isLargeDevice: boolean;
    isMediumDevice: boolean;
    isExtraLargeDevice: boolean;
    isSmallDevice: boolean;
    showCompactHeader: (pathname: string) => boolean;
    customCompactHeaderTitle: (pathname: string) => string | null;
}

export function useResponsive(): MediaQuery {
    const compactHeaderPaths = ["/wallet"];

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
    const customCompactHeaderTitle = useCallback((pathname: string) => {
        if (pathname.startsWith("/wallet/send")) {
            return "Send";
        }
        if (pathname.startsWith("/wallet/receive")) {
            return "Receive";
        }

        return null;
    }, []);
    return {
        isLargeDevice,
        isMediumDevice,
        isExtraLargeDevice,
        isSmallDevice,
        showCompactHeader,
        customCompactHeaderTitle,
    };
}
