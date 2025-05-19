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

import CanisterUtilsService from "@/services/canisterUtils.service";
import { LinkDetailModel } from "@/services/types/link.service.types";

export const getLinkIsClaimed = async (link: LinkDetailModel) => {
    const canisterUtils = new CanisterUtilsService();
    let linkIsClaimed = true;

    const linkId = link.id;
    const linkAssets = link.asset_info;

    for (const asset of linkAssets) {
        const balance = await canisterUtils.checkAccountBalanceWithSubAccount(
            linkId,
            asset.address,
        );
        if (balance > 0n) {
            linkIsClaimed = false;
            break;
        }
    }

    return linkIsClaimed;
};

export const getLinkAssetAmounts = async (link: LinkDetailModel) => {
    const canisterUtils = new CanisterUtilsService();
    const linkId = link.id;
    const linkAssets = link.asset_info;

    const assetAmounts: {
        address: string;
        totalAmount: bigint;
        pendingAmount: bigint;
        claimsAmount: bigint | undefined;
        assetClaimed: boolean;
    }[] = [];

    for (const asset of linkAssets) {
        const balance = await canisterUtils.checkAccountBalanceWithSubAccount(
            linkId,
            asset.address,
        );
        assetAmounts.push({
            address: asset.address,
            totalAmount: asset.amountPerUse * link.maxActionNumber,
            pendingAmount: balance,
            claimsAmount: link.useActionCounter,
            assetClaimed: balance === 0n,
        });
    }

    return assetAmounts;
};
