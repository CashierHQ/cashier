import { IcrcLedgerCanister, mapTokenMetadata } from "@dfinity/ledger-icrc";
import { Principal } from "@dfinity/principal";
import { defaultAgent, Token, TokenAmountV2 } from "@dfinity/utils";

class TokenUtils {
    private anonymousAgent = defaultAgent();

    getAnonymousAgent() {
        return this.anonymousAgent;
    }

    async getTokenMetadata(tokenAddres: string) {
        const { metadata } = IcrcLedgerCanister.create({
            agent: this.anonymousAgent,
            canisterId: Principal.fromText(tokenAddres ?? ""),
        });
        const data = await metadata({});
        const result = mapTokenMetadata(data);
        return result;
    }

    async getHumanReadableAmount(amount: bigint, tokenAddress: string): Promise<number> {
        const tokenMetadata = await this.getTokenMetadata(tokenAddress);
        const tokenV2 = TokenAmountV2.fromUlps({ amount, token: tokenMetadata as Token });
        const upls = tokenV2.toUlps();
        return Number(upls) / 10 ** tokenV2.token.decimals;
    }
}

export default TokenUtils;
