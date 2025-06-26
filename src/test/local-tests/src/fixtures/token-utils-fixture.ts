// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { Agent, HttpAgent, Identity } from "@dfinity/agent";
import { PartialIdentity } from "@dfinity/identity";
import { IcrcLedgerCanister, mapTokenMetadata } from "@dfinity/ledger-icrc";
import { Principal } from "@dfinity/principal";
import { Token, TokenAmountV2 } from "@dfinity/utils";
import { parse as uuidParse } from "uuid";

export interface FungibleTokenFixture {
    decimals: number;
    name: string;
    symbol: string;
    address: string;
}

export class TokenUtilServiceFixture {
    private agent: Agent;
    private identity: Identity | PartialIdentity;

    constructor(identity: Identity | PartialIdentity, host: string = "http://127.0.0.1:4943") {
        const agent = HttpAgent.createSync({ identity, host });

        // Fetch root key for local development
        agent.fetchRootKey().catch((err: Error) => {
            console.warn(
                "Unable to fetch root key. Check to ensure that your local replica is running",
            );
            console.error(err);
        });

        this.agent = agent;
        this.identity = identity;
    }

    async getTokenMetadata(tokenAddress: string) {
        const ledgerCanister = IcrcLedgerCanister.create({
            agent: this.agent,
            canisterId: Principal.fromText(tokenAddress),
        });

        const metadata = await ledgerCanister.metadata({});
        const result = mapTokenMetadata(metadata);
        return result;
    }

    async getHumanReadableAmount(amount: bigint, tokenAddress: string): Promise<number> {
        if (!amount || !tokenAddress) {
            return 0;
        }

        const tokenMetadata = await this.getTokenMetadata(tokenAddress);
        const tokenV2 = TokenAmountV2.fromUlps({ amount, token: tokenMetadata as Token });
        const ulps = tokenV2.toUlps();
        return Number(ulps) / 10 ** tokenV2.token.decimals;
    }

    // For token objects (sync)
    getHumanReadableAmountFromToken(amount: bigint, token: FungibleTokenFixture): number {
        if (!amount || !token || token.decimals === undefined) {
            return 0;
        }

        return Number(amount) / 10 ** token.decimals;
    }

    async balanceOf(tokenAddress: string): Promise<bigint> {
        const ledgerCanister = IcrcLedgerCanister.create({
            agent: this.agent,
            canisterId: Principal.fromText(tokenAddress),
        });

        const ownerPrincipal = this.identity.getPrincipal();

        try {
            const balance = await ledgerCanister.balance({
                owner: ownerPrincipal,
            });
            return balance;
        } catch (error) {
            console.error("Error fetching balance:", error);
            return BigInt(0);
        }
    }

    async balanceOfAccount(
        account: {
            owner: Principal;
            subaccount?: Uint8Array | undefined;
        },
        tokenAddress: string,
    ): Promise<bigint> {
        const ledgerCanister = IcrcLedgerCanister.create({
            agent: this.agent,
            canisterId: Principal.fromText(tokenAddress),
        });

        try {
            const balance = await ledgerCanister.balance(account);
            return balance;
        } catch (error) {
            console.error("Error fetching balance:", error);
            return BigInt(0);
        }
    }

    async batchBalanceOfAccount(
        account: {
            owner: Principal;
            subaccount?: Uint8Array | undefined;
        },
        ledgers: Principal[],
    ) {
        const tasks = ledgers.map(async (ledgerCanisterId) => {
            const ledgerCanister = IcrcLedgerCanister.create({
                agent: this.agent,
                canisterId: ledgerCanisterId,
            });

            try {
                const balance = await ledgerCanister.balance(account);
                return { tokenAddress: ledgerCanisterId, balance };
            } catch (error) {
                console.error(error);
                return { tokenAddress: ledgerCanisterId, balance: BigInt(0) };
            }
        });

        return await Promise.all(tasks);
    }

    async batchBalanceOf(tokenAddresses: Principal[]) {
        const tasks = tokenAddresses.map(async (tokenAddress) => {
            const ledgerCanister = IcrcLedgerCanister.create({
                agent: this.agent,
                canisterId: tokenAddress,
            });

            const ownerPrincipal = this.identity.getPrincipal();

            try {
                const balance = await ledgerCanister.balance({
                    owner: ownerPrincipal,
                });
                return { tokenAddress, balance };
            } catch (error) {
                console.error(`Error fetching balance for ${tokenAddress.toString()}:`, error);
                return { tokenAddress, balance: BigInt(0) };
            }
        });

        const results = await Promise.allSettled(tasks);

        const balances = results.map((result, index) => {
            if (result.status === "fulfilled") {
                return result.value;
            } else {
                return {
                    tokenAddress: tokenAddresses[index],
                    balance: BigInt(0),
                };
            }
        });

        return balances;
    }

    async transferTo(receiverAddress: string, tokenAddress: string, amount: number) {
        const ledgerCanister = IcrcLedgerCanister.create({
            agent: this.agent,
            canisterId: Principal.fromText(tokenAddress),
        });

        const tokenMetadata = await this.getTokenMetadata(tokenAddress);
        const tokenV2 = TokenAmountV2.fromNumber({ amount, token: tokenMetadata as Token });
        const transferAmount = tokenV2.toE8s();

        return await ledgerCanister.transfer({
            to: {
                owner: Principal.fromText(receiverAddress),
                subaccount: [],
            },
            amount: transferAmount,
            fee: undefined,
            memo: undefined,
            from_subaccount: undefined,
            created_at_time: undefined,
        });
    }

    async approve(tokenAddress: string, spenderAddress: string, amount: number) {
        const ledgerCanister = IcrcLedgerCanister.create({
            agent: this.agent,
            canisterId: Principal.fromText(tokenAddress),
        });

        const tokenMetadata = await this.getTokenMetadata(tokenAddress);
        const tokenV2 = TokenAmountV2.fromNumber({ amount, token: tokenMetadata as Token });
        const approveAmount = tokenV2.toE8s();

        return await ledgerCanister.approve({
            amount: approveAmount,
            spender: {
                owner: Principal.fromText(spenderAddress),
                subaccount: [],
            },
        });
    }

    async getFee(tokenAddress: string): Promise<bigint> {
        const ledgerCanister = IcrcLedgerCanister.create({
            agent: this.agent,
            canisterId: Principal.fromText(tokenAddress),
        });

        try {
            const fee = await ledgerCanister.transactionFee({});
            return fee;
        } catch (error) {
            console.error("Error fetching fee:", error);
            return BigInt(0);
        }
    }

    // Helper function to calculate link subaccount from link ID
    private linkIdToSubaccount(linkId: string): Uint8Array {
        const uuidBytes = uuidParse(linkId);
        const subaccount = new Uint8Array(32);
        subaccount.set(uuidBytes, 0);
        return subaccount;
    }

    // Transfer to link address (calculated from link ID)
    async transferToLink(
        tokenAddress: string,
        linkId: string,
        amount: bigint,
        backendCanisterId: string,
    ) {
        const ledgerCanister = IcrcLedgerCanister.create({
            agent: this.agent,
            canisterId: Principal.fromText(tokenAddress),
        });

        const linkSubaccount = this.linkIdToSubaccount(linkId);

        return await ledgerCanister.transfer({
            to: {
                owner: Principal.fromText(backendCanisterId),
                subaccount: [linkSubaccount],
            },
            amount: amount,
            fee: undefined,
            memo: undefined,
            from_subaccount: undefined,
            created_at_time: undefined,
        });
    }

    // Approve backend canister as spender
    async approveBackendCanister(tokenAddress: string, backendCanisterId: string, amount: bigint) {
        const ledgerCanister = IcrcLedgerCanister.create({
            agent: this.agent,
            canisterId: Principal.fromText(tokenAddress),
        });

        return await ledgerCanister.approve({
            amount: amount,
            spender: {
                owner: Principal.fromText(backendCanisterId),
                subaccount: [],
            },
        });
    }
}

export default TokenUtilServiceFixture;
