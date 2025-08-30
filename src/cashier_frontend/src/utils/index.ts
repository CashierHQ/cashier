// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { IC_EXPLORER_IMAGES_PATH } from "@/const";
import { LINK_TYPE } from "@/services/types/enum";
import { LinkDetailModel } from "@/services/types/link.service.types";

export const safeParseJSON = (
  arg: Record<string, unknown | undefined>,
): string => {
  return JSON.stringify(arg, (key, value) =>
    typeof value === "bigint" ? value.toString() : value,
  );
};

type Response<T, E> =
  | {
      ok: T;
    }
  | {
      err: E;
    }
  | {
      Ok: T;
    }
  | {
      Err: E;
    };

export const parseResultResponse = <T, E>(response: Response<T, E>): T => {
  if ("ok" in response) {
    return response.ok;
  } else if ("Ok" in response) {
    for (const key in response.Ok) {
      if (
        (Array.isArray(response.Ok[key]) && response.Ok[key].length === 0) ||
        !response.Ok[key]
      ) {
        delete response.Ok[key];
      }
    }
    return response.Ok;
  } else if ("err" in response) {
    throw new Error(safeParseJSON(response.err as Record<string, unknown>));
  } else if ("Err" in response) {
    throw new Error(safeParseJSON(response.Err as Record<string, unknown>));
  }

  throw new Error("Invalid response");
};

// Group link list by creation date (start of day in milliseconds)
// Eg: { "1672531200000": [LinkDetailModel, ...], "1672617600000": [LinkDetailModel, ...], ... }
export const groupLinkListByDate = (
  linkList: LinkDetailModel[],
): Record<string, LinkDetailModel[]> => {
  if (linkList?.length > 0) {
    // Copy before sorting to avoid mutating the original array
    const sortedItems = [...linkList].sort(
      (a, b) => Number(b.create_at) - Number(a.create_at),
    );

    return sortedItems.reduce(
      (groups: Record<string, LinkDetailModel[]>, item: LinkDetailModel) => {
        // Normalize create_at to a number (supports number | string | bigint-like values)
        const ts = Number(item.create_at);

        // Calculate start-of-day timestamp in milliseconds (UTC)
        const dayStart = Math.floor(ts / 86400000) * 86400000;

        // Use the day-start timestamp as the group key (stringified)
        const dateKey = String(dayStart);

        if (!groups[dateKey]) {
          groups[dateKey] = [];
        }
        groups[dateKey].push(item);
        return groups;
      },
      {},
    );
  }

  return {};
};

// Format a date input (start-of-day timestamp in ms or ISO/date string) to "MMM D, YYYY"
export const formatDateString = (dateInput?: string | number): string => {
  if (dateInput === undefined || dateInput === null) return "";

  // Accept either a numeric timestamp (ms) or an ISO/date string.
  const isNumeric =
    typeof dateInput === "number" || /^\\d+$/.test(String(dateInput).trim());
  const date = isNumeric
    ? new Date(Number(dateInput))
    : new Date(String(dateInput));

  if (Number.isNaN(date.getTime())) return "";

  const monthShort = date.toLocaleString("default", { month: "short" });
  const day = date.getDate();
  const year = date.getFullYear();
  return `${monthShort} ${day}, ${year}`;
};

// Convert token amount to number with exponential token's decimals
export const convertTokenAmountToNumber = (
  amount: number,
  decimals: number,
): number => {
  return Math.floor(amount * 10 ** decimals);
};
export const convertDecimalBigIntToNumber = (
  amount: bigint,
  decimals: number,
): number => {
  // Use string conversion to avoid floating-point precision issues
  const amountStr = amount.toString();
  const divisor = 10 ** decimals;

  // For very large numbers, we still need to use division
  // but we can improve precision by using parseFloat with proper formatting
  if (amountStr.length <= 15) {
    // Safe range for JavaScript number precision
    return Number(amount) / divisor;
  }

  // For larger numbers, use string manipulation to maintain precision
  const wholePart = amountStr.slice(0, -decimals) || "0";
  const fractionalPart = amountStr.slice(-decimals).padStart(decimals, "0");

  // Remove trailing zeros from fractional part
  const trimmedFractional = fractionalPart.replace(/0+$/, "");

  if (trimmedFractional) {
    return parseFloat(`${wholePart}.${trimmedFractional}`);
  } else {
    return parseFloat(wholePart);
  }
};

export const transformShortAddress = (address: string): string => {
  return `${address.slice(0, 8)} ... ${address.slice(-8)}`;
};

export const getTokenImage = (tokenAddress: string) => {
  return `${IC_EXPLORER_IMAGES_PATH}${tokenAddress}`;
};

export const getLinkDefaultAvatar = (linkType: LINK_TYPE) => {
  switch (linkType) {
    case LINK_TYPE.SEND_TIP:
      return `/tip-link-default.svg`;
    case LINK_TYPE.SEND_AIRDROP:
      return `/airdrop-default.svg`;
    case LINK_TYPE.SEND_TOKEN_BASKET:
      return `/token-basket-default.svg`;
    case LINK_TYPE.RECEIVE_PAYMENT:
      return `/receive-payment-default.svg`;
    default:
      return `/smallLogo.svg`;
  }
};
