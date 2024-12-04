import * as dotenv from "dotenv";
dotenv.config();
import { createActor } from "../declarations/cashier_backend";
import { Secp256k1KeyIdentity } from "@dfinity/identity-secp256k1";
import { HttpAgent } from "@dfinity/agent";
import { back, continueActive, continueUpdate } from "./updateLink";

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

const main = async () => {
    const canisterId = process.env.CANISTER_ID_CASHIER_BACKEND;

    if (!canisterId) {
        console.error("CANISTER_ID_CASHIER_BACKEND is not set");
        return;
    }
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

    const backend = createActor(canisterId, {
        agent,
    });

    await backend.create_user();
    const createLinkRes = await backend.create_link({
        link_type: {
            NftCreateAndAirdrop: null,
        },
    });

    const linkId = parseResultResponse(createLinkRes);

    const links = await backend.get_links([
        {
            offset: BigInt(0),
            limit: BigInt(10),
        },
    ]);

    console.log("link", links);
    await backend.get_user();

    // Update the link to preview
    // new -> pending detail
    const res = await continueUpdate({
        backend,
        id: linkId,
    });

    console.log("res", safeParseJSON(res));

    const back_res = await back({
        backend,
        id: linkId,
    });

    console.log("back_res", back_res);

    // pending detail -> preview
    const res2 = await continueUpdate({
        backend,
        id: linkId,
    });

    await continueUpdate({
        backend,
        id: linkId,
    });

    console.log("res2", safeParseJSON(res2));

    // Active the link
    const active_link_res = await continueActive({
        backend,
        id: linkId,
    });

    console.log("active_link_res", safeParseJSON(active_link_res));
};

main();
