// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { useMediaQuery } from "@uidotdev/usehooks";
import { useCallback } from "react";

// Interface for device size detection
interface DeviceSizeQuery {
  isLargeDevice: boolean;
  isMediumDevice: boolean;
  isExtraLargeDevice: boolean;
  isSmallDevice: boolean;
}

// Interface for header functionality
interface HeaderQuery {
  showCompactHeader: (pathname: string) => boolean;
  hideHeader: (pathname: string) => boolean;
  showHeaderWithBackButtonAndWalletButton: (
    pathname: string,
    search?: string,
    isSignedOut?: boolean,
  ) => boolean;
}

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
  const isExtraLargeDevice = useMediaQuery(
    "only screen and (min-width : 1201px)",
  );

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
    (pathname: string) =>
      compactHeaderPaths.some((path) => pathname.startsWith(path)),
    [compactHeaderPaths],
  );
  const hideHeader = useCallback(
    (pathname: string) =>
      hideHeaderPaths.some((path) => pathname.startsWith(path)),
    [hideHeaderPaths],
  );
  const showHeaderWithBackButtonAndWalletButton = useCallback(
    (pathname: string, search?: string, isSignedOut?: boolean) => {
      const matchesPath = headerWithBackButtonAndWalletButtonPaths.some(
        (pattern) => pattern.test(pathname),
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
