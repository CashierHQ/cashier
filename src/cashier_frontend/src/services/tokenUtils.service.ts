import { IcrcLedgerCanister, IcrcTokenMetadata, mapTokenMetadata } from "@dfinity/ledger-icrc";
import { Principal } from "@dfinity/principal";
import { defaultAgent, Token, TokenAmountV2 } from "@dfinity/utils";

export abstract class TokenUtilService {
    public static async getTokenMetadata(tokenAddres: string) {
        const { metadata } = IcrcLedgerCanister.create({
            agent: defaultAgent(),
            canisterId: Principal.fromText(tokenAddres ?? ""),
        });
        const data = await metadata({});
        const result = mapTokenMetadata(data);
        return result;
    }

    public static async getHumanReadableAmount(
        amount: bigint,
        tokenAddress: string,
    ): Promise<number> {
        if (!amount || !tokenAddress) {
            return 0;
        }
        const tokenMetadata = await this.getTokenMetadata(tokenAddress);
        const tokenV2 = TokenAmountV2.fromUlps({ amount, token: tokenMetadata as Token });
        const upls = tokenV2.toUlps();
        return Number(upls) / 10 ** tokenV2.token.decimals;
    }

    public static getHumanReadableAmountFromMetadata(
        amount: bigint,
        tokenMetadata: IcrcTokenMetadata | undefined,
    ) {
        if (!amount || !tokenMetadata) {
            return 0;
        }
        const tokenV2 = TokenAmountV2.fromUlps({ amount, token: tokenMetadata as Token });
        const upls = tokenV2.toUlps();
        return Number(upls) / 10 ** tokenV2.token.decimals;
    }
}
