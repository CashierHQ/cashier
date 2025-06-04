import { Chain } from "@/services/types/link.service.types";
import { convertDecimalBigIntToNumber } from "..";
import { FungibleToken } from "@/types/fungible-token.speculative";
import { IntentModel } from "@/services/types/intent.service.types";
import { TASK } from "@/services/types/enum";

export class FeeHelpers {
    static getLinkCreationFee() {
        return {
            displayAmount: BigInt(100000), // 0.001 ICP (8 decimals)
            amount: BigInt(90000), // 0.0009 ICP (8 decimals)
            decimals: 8,
            symbol: "ICP",
            address: "ryjl3-tyaaa-aaaaa-aaaba-cai",
        };
    }
    static calculateNetworkFees(tokenInfo: FungibleToken) {
        const fee = FeeHelpers.calculateNetworkFeesInBigInt(tokenInfo);
        const decimals = tokenInfo.decimals;

        if (!fee || !decimals) {
            throw new Error("Token fee or decimals not found");
        }
        return convertDecimalBigIntToNumber(fee, decimals);
    }

    static calculateNetworkFeesInBigInt(tokenInfo: FungibleToken) {
        switch (tokenInfo.chain) {
            case Chain.IC:
                const fee = tokenInfo.fee;
                if (!fee) {
                    throw new Error("Token fee not found");
                }
                return fee;
            default:
                return 0n;
        }
    }

    static getDisplayAmount(tokenInfo: FungibleToken, amount: bigint, maxActionNumber: number) {
        const tokenDecimals = tokenInfo.decimals;
        // const totalTokenAmount =
        //     (Number(FeeHelpers.calculateNetworkFeesInBigInt(tokenInfo) + BigInt(amount)) *
        //         (Number(maxActionNumber) + 1)) /
        //     10 ** tokenDecimals;

        const totalFeeAmount = FeeHelpers.calculateNetworkFees(tokenInfo) * (maxActionNumber + 1);
        const totalTokenAmount = (Number(amount) * maxActionNumber) / 10 ** tokenDecimals;
        return totalTokenAmount + totalFeeAmount;
    }

    static shouldDisplayFeeBasedOnIntent(intent: IntentModel) {
        if (
            intent.task === TASK.TRANSFER_WALLET_TO_LINK ||
            intent.task === TASK.TRANSFER_WALLET_TO_TREASURY
        ) {
            return true;
        }
        return false;
    }
}
