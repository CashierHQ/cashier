import {
    IcrcLedgerCanister,
    IcrcTokenMetadata,
    IcrcTokenMetadataResponse,
    mapTokenMetadata,
} from "@dfinity/ledger-icrc";
import { Agent } from "@dfinity/agent";
import { Principal } from "@dfinity/principal";

class TokenUtilsService {
    private agent: Agent;

    constructor(agentObj: Agent) {
        this.agent = agentObj;
    }

    async getICRCTokenMetadata(tokenAddress: string): Promise<IcrcTokenMetadata | undefined> {
        const { metadata } = IcrcLedgerCanister.create({
            agent: this.agent,
            canisterId: Principal.fromText(tokenAddress),
        });
        const data = await metadata({});
        const result = mapTokenMetadata(data);
        return result;
    }
}

export default TokenUtilsService;
