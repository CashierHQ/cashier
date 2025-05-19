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

import { IC_EXPLORER_IMAGES_PATH } from "@/const";
import { Chain } from "@/services/types/link.service.types";

const chainNameMap: { [key in Chain]: string } = {
    [Chain.IC]: "Internet Computer",
};

export function mapChainToPrettyName(chain: Chain | string): string {
    // Handle string case "IC" -> convert to enum value Chain.IC
    if (typeof chain === "string") {
        // Try to convert string to Chain enum if possible
        const enumValue = Object.values(Chain).find(
            (enumKey) => enumKey === chain || enumKey.toLowerCase() === chain.toLowerCase(),
        );

        if (enumValue) {
            return chainNameMap[enumValue as Chain];
        }

        // If string doesn't match any enum, return capitalized string
        return chain.charAt(0).toUpperCase() + chain.slice(1).toLowerCase();
    }

    // Handle direct enum case
    if (chain in chainNameMap) {
        return chainNameMap[chain];
    }

    // Fallback
    return "Unknown Chain";
}

const chainLogoMap: { [key in Chain]: string } = {
    [Chain.IC]: `${IC_EXPLORER_IMAGES_PATH}ryjl3-tyaaa-aaaaa-aaaba-cai`,
};

export function mapChainToLogo(chain: Chain | string): string {
    // Handle string case "IC" -> convert to enum value Chain.IC
    if (typeof chain === "string") {
        // Try to convert string to Chain enum if possible
        const enumValue = Object.values(Chain).find(
            (enumKey) => enumKey === chain || enumKey.toLowerCase() === chain.toLowerCase(),
        );

        if (enumValue && enumValue in chainLogoMap) {
            return chainLogoMap[enumValue as Chain];
        }

        // If direct match to key fails, try case-insensitive matching
        for (const key in chainLogoMap) {
            if (key.toLowerCase() === chain.toLowerCase()) {
                return chainLogoMap[key as Chain];
            }
        }

        // Fallback to a generic logo
        return "/assets/images/unknown-chain.svg";
    }

    // Handle direct enum case
    if (chain in chainLogoMap) {
        return chainLogoMap[chain];
    }

    // Fallback
    return "/assets/images/unknown-chain.svg";
}
