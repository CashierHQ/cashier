// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { IC_EXPLORER_IMAGES_PATH } from "@/const";
import { LINK_TYPE } from "@/services/types/enum";
import { LinkDetailModel } from "@/services/types/link.service.types";
import { Result, Err, Ok } from "ts-results";

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

export const responseToResult = <T, E>(
  response: Response<T, E>,
): Result<T, Error> => {
  if ("ok" in response) {
    return Ok(response.ok);
  } else if ("Ok" in response) {
    for (const key in response.Ok) {
      if (
        (Array.isArray(response.Ok[key]) && response.Ok[key].length === 0) ||
        !response.Ok[key]
      ) {
        delete response.Ok[key];
      }
    }
    return Ok(response.Ok);
  } else if ("err" in response) {
    return Err(
      new Error(safeParseJSON(response.err as Record<string, unknown>)),
    );
  } else if ("Err" in response) {
    return Err(
      new Error(safeParseJSON(response.Err as Record<string, unknown>)),
    );
  }

  return Err(new Error("Invalid response"));
};

export const parseResultResponse = <T, E>(response: Response<T, E>): T => {
  return responseToResult(response).unwrap();
};

// Helper: normalize various timestamp inputs to BigInt nanoseconds
const toBigIntNanoseconds = (input: unknown): bigint => {
  if (input === undefined || input === null) return 0n;

  // If already a bigint, assume it's nanoseconds
  if (typeof input === "bigint") return input as bigint;

  const s = String(input).trim();

  // If it's not purely numeric, try parsing as a date string (ISO etc.) -> ms
  if (!/^[-+]?\d+$/.test(s)) {
    const ms = Date.parse(s);
    if (Number.isNaN(ms)) return 0n;
    return BigInt(ms) * 1000000n; // ms -> ns
  }

  // It's a numeric string or number
  const n = BigInt(s);

  // Heuristic: if absolute value >= 1e15 treat as nanoseconds already (ns ~1e18, ms ~1e12)
  const abs = n < 0n ? -n : n;
  if (abs >= 1000000000000000n) {
    return n; // treat as ns
  }

  // Otherwise treat as milliseconds and convert to nanoseconds
  return n * 1000000n;
};

// Group link list by creation date (start of day in milliseconds)
// Eg: { "1672531200000": [LinkDetailModel, ...], "1672617600000": [LinkDetailModel, ...], ... }
export const groupLinkListByDate = (
  linkList: LinkDetailModel[],
): Record<string, LinkDetailModel[]> => {
  if (linkList?.length > 0) {
    // Copy before sorting to avoid mutating the original array
    const sortedItems = [...linkList].sort((a, b) => {
      const na = toBigIntNanoseconds(a.create_at);
      const nb = toBigIntNanoseconds(b.create_at);
      return nb > na ? 1 : nb < na ? -1 : 0;
    });

    return sortedItems.reduce(
      (groups: Record<string, LinkDetailModel[]>, item: LinkDetailModel) => {
        // Convert create_at to BigInt nanoseconds
        const ns = toBigIntNanoseconds(item.create_at);

        // Calculate start-of-day timestamp in nanoseconds (UTC)
        const nsPerDay = 86400000n * 1000000n; // ms in day * ns per ms
        const dayStartNs = (ns / nsPerDay) * nsPerDay;

        const dateKey = String(dayStartNs);

        if (!groups[dateKey]) groups[dateKey] = [];
        groups[dateKey].push(item);
        return groups;
      },
      {},
    );
  }

  return {};
};

// Format a date input (start-of-day timestamp in ms or ISO/date string) to "MMM D, YYYY"
export const formatDateString = (
  dateInput?: string | number | bigint,
): string => {
  if (dateInput === undefined || dateInput === null) return "";

  // Convert input to BigInt nanoseconds first
  const ns = toBigIntNanoseconds(dateInput as unknown);
  if (ns === 0n) return "";

  // Convert nanoseconds to milliseconds for Date
  const ms = Number(ns / 1000000n);
  const date = new Date(ms);
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

export const getScreenDimensions = () => {
  if (window.screen) {
    return {
      width: window.screen.width,
      height: window.screen.height,
    };
  }
  // Default dimensions for SSR
  return {
    width: 1920,
    height: 1080,
  };
};
