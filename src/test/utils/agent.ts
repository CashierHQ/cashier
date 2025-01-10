import { HttpAgent, Identity } from "@dfinity/agent";
import { createActor } from "../../declarations/cashier_backend";

export const initLocalAgent = (canisterId: string, identity: Identity) => {
    const agent = HttpAgent.createSync({
        identity,
        host: "http://127.0.0.1:4943",
    });

    agent.fetchRootKey().catch((err) => {
        console.warn(
            "Unable to fetch root key. Check to ensure that your local replica is running",
        );
        console.error(err);
    });

    return createActor(canisterId, { agent });
};
