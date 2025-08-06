// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { IC_EXPLORER_IMAGES_PATH } from "@/const";
import { LINK_TYPE } from "@/services/types/enum";
import { LinkDetailModel } from "@/services/types/link.service.types";

export const safeParseJSON = (arg: Record<string, unknown | undefined>): string => {
    return JSON.stringify(arg, (key, value) =>
        typeof value === "bigint" ? value.toString() : value,
    );
};

export type Response<T, E> =
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

export const resizeImage = (file: Blob): Promise<Blob> => {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                if (img.width <= 500 && img.height <= 500) return resolve(file);
                const elem = document.createElement("canvas");
                if (img.width > img.height) {
                    elem.width = 500;
                    elem.height = (500 * img.height) / img.width;
                } else {
                    elem.width = (500 * img.width) / img.height;
                    elem.height = 500;
                }
                const ctx = elem.getContext("2d");
                ctx?.drawImage(img, 0, 0, elem.width, elem.height);
                ctx?.canvas.toBlob((blob) => {
                    if (blob) {
                        resolve(blob);
                    }
                });
            };
        };
    });
};

export const fileToBase64 = (file: Blob) => {
    return new Promise<string>((resolve, reject) => {
        const fileReader = new FileReader();
        fileReader.readAsDataURL(file);
        fileReader.onload = () => {
            resolve(fileReader?.result as string);
        };
        fileReader.onerror = (error) => {
            reject(error);
        };
    });
};

export const convertNanoSecondsToDate = (nanoSeconds: bigint): Date => {
    let result = new Date();
    try {
        const parseValue = Number(nanoSeconds);
        result = new Date(parseValue / 1000000);
    } catch (error) {
        console.log(error);
    } finally {
        return result;
    }
};

export const groupLinkListByDate = (
    linkList: LinkDetailModel[],
): Record<string, LinkDetailModel[]> => {
    if (linkList?.length > 0) {
        const sortedItems = linkList.sort((a, b) => b.create_at.getTime() - a.create_at.getTime());
        return sortedItems.reduce(
            (groups: Record<string, LinkDetailModel[]>, item: LinkDetailModel) => {
                const dateKey = item.create_at.toISOString().split("T")[0];
                if (!groups[dateKey]) {
                    groups[dateKey] = [];
                }
                groups[dateKey].push(item);
                return groups;
            },
            {},
        );
    } else {
        return {};
    }
};

export const formatDateString = (dateString: string): string => {
    if (dateString && dateString.trim() !== "") {
        const date = new Date(dateString);
        const monthShort = date.toLocaleString("default", { month: "short" });
        const day = date.getDate();
        const year = date.getFullYear();
        return `${monthShort} ${day}, ${year}`;
    } else {
        return "";
    }
};

// Convert token amount to number with exponential token's decimals
export const convertTokenAmountToNumber = (amount: number, decimals: number): number => {
    return Math.floor(amount * 10 ** decimals);
};
export const convertDecimalBigIntToNumber = (amount: bigint, decimals: number): number => {
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

