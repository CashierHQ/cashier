import * as dotenv from "dotenv";
dotenv.config();
import { createActor } from "../declarations/cashier_backend";
import { Secp256k1KeyIdentity } from "@dfinity/identity-secp256k1";
import { HttpAgent } from "@dfinity/agent";

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
    });

    const backend = createActor(canisterId, {
        agent,
    });
    const createUserRes = await backend.create_user();
    const createLinkRes = await backend.create_link({
        link_type: {
            NftCreateAndAirdrop: null,
        },
    });

    console.log("createUserRes", createUserRes);
    console.log("createLinkRes", createLinkRes);
    const links = await backend.get_links([
        {
            offset: BigInt(0),
            limit: BigInt(10),
        },
    ]);
    console.log("links", safeParseJSON(links));
    const user = await backend.get_user();
    console.log("user", user);

    const id = parseResultResponse(createLinkRes);
    console.log("id", id);

    const updateRes = await backend.update_link(id, {
        title: ["test"],
        asset_info: [
            {
                chain: { IC: null },
                address: "test",
                amount: 100,
            },
        ],
        description: [],
        actions: [],
        state: [
            {
                PendingDetail: null,
            },
        ],
        template: [],
        image: [],
    });

    console.log("updateRes", updateRes);

    const link = await backend.get_link(id);
    console.log("link", safeParseJSON(link));
};

main();
