import { HttpAgent, Identity } from "@dfinity/agent";
import { FEATURE_FLAGS, IC_HOST } from "@/const";
import { PartialIdentity } from "@dfinity/identity";

export const getAgent = (identity?: Identity | PartialIdentity | undefined) => {
    const agent = HttpAgent.createSync({ identity, host: IC_HOST });
    if (FEATURE_FLAGS.ENABLE_LOCAL_IDENTITY_PROVIDER) {
        agent.fetchRootKey().catch((err: Error) => {
            console.warn(
                "Unable to fetch root key. Check to ensure that your local replica is running",
            );
            console.error(err);
        });
    }
    return agent;
};

