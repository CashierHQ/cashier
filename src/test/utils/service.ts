import { HttpAgent, Identity } from "@dfinity/agent";
import { createActor } from "../../declarations/cashier_backend";

export class ServiceHelper {
    private identity?: Identity;

    private canisterId: string;

    constructor({ identity, canisterId }: { identity?: Identity; canisterId: string }) {
        this.identity = identity;
        this.canisterId = canisterId;
    }

    public withIdentity(identity: Identity) {
        this.identity = identity;
        return this;
    }

    public async initActor() {
        const agent = HttpAgent.createSync({
            identity: this.identity,
            host: "http://127.0.0.1:4943",
        });

        agent.fetchRootKey().catch((err) => {
            console.warn(
                "Unable to fetch root key. Check to ensure that your local replica is running",
            );
            console.error(err);
        });

        return createActor(this.canisterId, { agent });
    }
}
