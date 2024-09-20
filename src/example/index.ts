import * as dotenv from "dotenv";
dotenv.config();
import { createActor } from "../declarations/cashier_backend";

const main = async () => {
    const canisterId = process.env.CANISTER_ID_CASHIER_BACKEND;

    if (!canisterId) {
        console.error("CANISTER_ID_CASHIER_BACKEND is not set");
        return;
    }
    const backend = createActor(canisterId);
    const links = await backend.get_links();
    console.log("links", links);
    const user = await backend.get_user();
    console.log("user", user);
};

main();
