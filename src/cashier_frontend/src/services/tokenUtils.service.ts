import { IC_HOST } from "@/const";
import { Agent, HttpAgent, Identity } from "@dfinity/agent";
import { PartialIdentity } from "@dfinity/identity";
import { IcrcLedgerCanister, IcrcTokenMetadata, mapTokenMetadata } from "@dfinity/ledger-icrc";
import { Principal } from "@dfinity/principal";
import { defaultAgent, Token, TokenAmountV2 } from "@dfinity/utils";

export class TokenUtilService {
    private agent: Agent;
    private identity: Identity | undefined;

    constructor(identity?: Identity | PartialIdentity | undefined) {
        this.agent = HttpAgent.createSync({ identity, host: IC_HOST });
        this.identity = identity;
    }
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

    async balanceOf(tokenAddress: string) {
        const ledgerCanister = IcrcLedgerCanister.create({
            agent: this.agent,
            canisterId: Principal.fromText(tokenAddress),
        });

        const pid = this.identity?.getPrincipal().toString() ?? "";

        try {
            const balance = await ledgerCanister.balance({
                owner: Principal.fromText(pid),
                subaccount: [],
            });
            return balance;
        } catch (error) {
            console.error("Error fetching balance:", error);
            return BigInt(0);
        }
    }

    // the amount is in human readable format
    async transferTo(receiverAddress: string, tokenAddress: string, amount: number) {
        const ledgerCanister = IcrcLedgerCanister.create({
            agent: this.agent,
            canisterId: Principal.fromText(tokenAddress),
        });

        const tokenMetadata = await TokenUtilService.getTokenMetadata(tokenAddress);
        const tokenV2 = TokenAmountV2.fromNumber({ amount, token: tokenMetadata as Token });

        const transfer_amount = tokenV2.toE8s();

        return await ledgerCanister.transfer({
            to: {
                owner: Principal.fromText(receiverAddress),
                subaccount: [],
            },
            amount: transfer_amount,
            fee: undefined,
            memo: undefined,
            from_subaccount: undefined,
            created_at_time: undefined,
        });
    }
}
