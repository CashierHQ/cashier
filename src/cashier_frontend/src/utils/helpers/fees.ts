import { Chain } from "@/services/types/link.service.types";
import { convertDecimalBigIntToNumber } from "..";
import { FungibleToken } from "@/types/fungible-token.speculative";

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
}
