import { HttpAgent, Identity } from "@dfinity/agent";
import { FEATURE_FLAGS, IC_HOST } from "@/const";
import { PartialIdentity } from "@dfinity/identity";

/**
 * Creates and configures an HttpAgent instance for Internet Computer interactions. Mostly used inside actor
 *
 * This utility function creates a new HttpAgent with the provided identity (optional) and host configuration from constant.
 * For local development environments, it automatically fetches the root key to enable
 * communication with local replicas.
 */
export const getAgent = (identity?: Identity | PartialIdentity | undefined) => {
  const agent = HttpAgent.createSync({
    identity,
    host: IC_HOST,
    shouldFetchRootKey: FEATURE_FLAGS.ENABLE_LOCAL_IDENTITY_PROVIDER,
  });
  return agent;
};
