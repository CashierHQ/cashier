import { Actor, Agent } from "@dfinity/agent";
import { kongBackend } from ".";
import { parseResultResponse } from "@/utils";
import { Token } from "./shared/token";
import { Err, Ok, Result } from "ts-results";

// ToDo: move to const
export const KONGSWAP_BACKEND_CANISTER = "2ipq2-uqaaa-aaaar-qailq-cai";
const ckUSDT_ADDRESS = "cngnf-vqaaa-aaaar-qag4q-cai";
const ckUSDC_ADDRESS = "xevnm-gaaaa-aaaar-qafnq-cai";

type KongSwapActor = kongBackend._SERVICE;

export class KongSwapClient {
    private actor: KongSwapActor;

    constructor({ agent }: { agent: Agent }) {
        this.actor = Actor.createActor(kongBackend.idlFactory, {
            agent,
            canisterId: KONGSWAP_BACKEND_CANISTER,
        });
    }

    /**
   * Fetch all token prices from IC Explorer
   * @returns Object mapping token IDs to their USD prices
   */
    public async getTokenPrices(): Promise<Result<Record<string, number>, Error>> {
        try {
            const tokensRes = await this.actor.pools([ckUSDT_ADDRESS]);
            const result = parseResultResponse(tokensRes);

            // Map to a simple object of tokenId -> price
            const priceMap: Record<string, number> = {};
            for (const token of result) {
                try {
                    console.debug(`Processing pair: ${token.symbol_0}/${token.symbol_1} (${token.address_0})/(${token.address_1}) with price: ${token.price}`);
                    priceMap[token.address_0] = Number(token.price.toFixed(7));
                } catch (e) {
                    console.warn(
                        `Failed to parse price pair: ${token.symbol_0}/${token.symbol_1}`,
                        e,
                    );
                }
            }

            return Ok(priceMap);
        } catch (error) {
            console.error("Error fetching prices:", error);
            return Err(Error("Failed to fetch prices from KongSwap"));
        }

    }

    /**
     * Get the list of tokens supported by KongSwap
     * @returns Promise resolving to an array of Token objects
     */
    public async getListToken(): Promise<Token[]> {
        const tokensRes = await this.actor.tokens([]);
        const result = parseResultResponse(tokensRes);
        const response = result
            .map((data) => {
                if ("IC" in data) {
                    return {
                        symbol: data.IC.symbol,
                        name: data.IC.name,
                        address: data.IC.canister_id,
                        fee: data.IC.fee,
                        decimals: data.IC.decimals,
                        token_id: data.IC.token_id,
                        chain: data.IC.chain,
                        canister_id: data.IC.canister_id,
                    };
                }
                return null;
            })
            .filter((data) => data !== null) as Token[];
        return response;
    }

}
