// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import CanisterUtilsService from "@/services/canisterUtils.service";
import { LinkDetailModel } from "@/services/types/link.service.types";

export const getLinkIsUsed = async (link: LinkDetailModel) => {
    const canisterUtils = new CanisterUtilsService();
    let linkIsUsed = true;

    const linkId = link.id;
    const linkAssets = link.asset_info;

    for (const asset of linkAssets) {
        const balance = await canisterUtils.checkAccountBalanceWithSubAccount(
            linkId,
            asset.address,
        );
        if (balance > 0n) {
            linkIsUsed = false;
            break;
        }
    }

    return linkIsUsed;
};

export const getLinkAssetAmounts = async (link: LinkDetailModel) => {
    const canisterUtils = new CanisterUtilsService();
    const linkId = link.id;
    const linkAssets = link.asset_info;

    const assetAmounts: {
        address: string;
        totalAmount: bigint;
        pendingAmount: bigint;
        usesAmount: bigint | undefined;
        assetUsed: boolean;
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
            usesAmount: link.useActionCounter,
            assetUsed: balance === 0n,
        });
    }

    return assetAmounts;
};
