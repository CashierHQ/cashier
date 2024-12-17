import * as dotenv from "dotenv";
dotenv.config();
import { createActor } from "../declarations/cashier_backend";
import { Secp256k1KeyIdentity } from "@dfinity/identity-secp256k1";
import { HttpAgent } from "@dfinity/agent";
import { back, continueActive, continueUpdate } from "./updateLink";
import { callCreateAction } from "./createAction";
import { _SERVICE } from "../declarations/cashier_backend/cashier_backend.did";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const safeParseJSON = (arg: Record<string, unknown>): any => {
    return JSON.stringify(
        arg,
        (key, value) => (typeof value === "bigint" ? value.toString() : value), // return everything else unchanged
    );
};

export type Response<T, E> =
    | {
          ok: T;
      }
    | {
          err: E;
      }
    | {
          Ok: T;
      }
    | {
          Err: E;
      };

export const parseResultResponse = <T, E>(response: Response<T, E>): T => {
    if ("ok" in response) {
        return response.ok;
    } else if ("Ok" in response) {
        return response.Ok;
    } else if ("err" in response) {
        throw new Error(safeParseJSON(response.err as Record<string, unknown>));
    } else if ("Err" in response) {
        throw new Error(safeParseJSON(response.Err as Record<string, unknown>));
    }

    throw new Error("Invalid response");
};

const initializeAgent = (canisterId: string) => {
    const identity = Secp256k1KeyIdentity.generate();
    const agent = HttpAgent.createSync({
        identity,
        host: "http://127.0.0.1:4943",
    });

    if (process.env.DFX_NETWORK !== "ic") {
        agent.fetchRootKey().catch((err) => {
            console.warn(
                "Unable to fetch root key. Check to ensure that your local replica is running",
            );
            console.error(err);
        });
    }

    return createActor(canisterId, { agent });
};

const createUserAndLink = async (backend: _SERVICE) => {
    await backend.create_user();
    const createLinkRes = await backend.create_link({
        link_type: {
            TipLink: null,
        },
    });

    return parseResultResponse(createLinkRes);
};

const getLinks = async (backend: _SERVICE) => {
    const links = await backend.get_links([
        {
            offset: BigInt(0),
            limit: BigInt(10),
        },
    ]);

    console.log("link", links);
    return links;
};

const getLink = async (backend: _SERVICE, linkId: string) => {
    const link = await backend.get_link(linkId, [
        {
            intent_type: "Create",
        },
    ]);

    console.log("link", safeParseJSON(link));
    return link;
};

const updateLink = async (backend: _SERVICE, linkId: string) => {
    const res = await continueUpdate({
        backend,
        id: linkId,
    });

    console.log("updateLink res", safeParseJSON(res));
    return res;
};

const updateActive = async (backend: _SERVICE, linkId: string) => {
    const res = await continueActive({
        backend,
        id: linkId,
    });

    console.log("updateActive res", safeParseJSON(res));
    return res;
};

const backLink = async (backend: _SERVICE, linkId: string) => {
    const back_res = await back({
        backend,
        id: linkId,
    });

    console.log("back_res", back_res);
    return back_res;
};

const createAction = async (backend: _SERVICE, linkId: string) => {
    const create_action_res = await callCreateAction({
        backend,
        id: linkId,
    });

    console.log("create_action_res", safeParseJSON(create_action_res));
    return create_action_res;
};

const main = async () => {
    const canisterId = process.env.CANISTER_ID_CASHIER_BACKEND;

    if (!canisterId) {
        console.error("CANISTER_ID_CASHIER_BACKEND is not set");
        return;
    }

    const backend = initializeAgent(canisterId);

    const linkId = await createUserAndLink(backend);

    await getLinks(backend);
    await backend.get_user();

    // Update the link to preview
    await updateLink(backend, linkId);

    // Add assets -> choose link type
    await backLink(backend, linkId);

    // choose link type -> Add assets
    await updateLink(backend, linkId);

    // Add assets -> Create link
    await updateLink(backend, linkId);

    console.log("=====================================");
    await updateLink(backend, linkId);

    // Create link action
    await createAction(backend, linkId);

    console.log("=====================================");

    await getLink(backend, linkId);

    console.log("=====================================");

    // Create link -> active
    await updateActive(backend, linkId);

    console.log("=====================================");

    await getLink(backend, linkId);

    console.log("=====================================");
};

main();
