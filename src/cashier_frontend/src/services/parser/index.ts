import { IDL } from "@dfinity/candid";
import { fromBase64 } from "@slide-computer/signer";
import { idlFactory } from "./icrc";

export const parseIcrc1Transfer = (bytes: ArrayBuffer) => {
    const service = idlFactory({ IDL });

    const fields = service._fields;

    let transfer_result_type = null;
    for (const field of fields) {
        if (field[0] === "icrc1_transfer") {
            transfer_result_type = field[1].retTypes[0];
        }
    }

    if (!transfer_result_type) {
        throw new Error("Transfer result not found");
    }

    const decoded = IDL.decode([transfer_result_type], bytes)[0];

    console.log("decoded", decoded);
};

const res2 =
    "RElETAhrAryKAX3F/tIBAWsI0cSYfALCkey5An+UwceJBAPrgqiXBAShw+v9BwXwh+bbCQaT5b7IDH/rnNvVDwdsAsfrxNAJccSYsbUNfWwBm7O+pgp9bAGLvfKbAX1sAb+bt/ANfWwBo7uRjAp4bAGcuracAn0BAADHBQ==";

parseIcrc1Transfer(fromBase64(res2));

//
