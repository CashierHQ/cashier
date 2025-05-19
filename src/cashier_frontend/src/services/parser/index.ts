// Cashier — No-code blockchain transaction builder
// Copyright (C) 2025 TheCashierApp LLC
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

import { IDL, JsonValue } from "@dfinity/candid";
import { idlFactory } from "./icrc";

export const parseIcrc1Transfer = (bytes: ArrayBuffer): JsonValue => {
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
    return decoded;
};

export const parseIcrc2Approve = (bytes: ArrayBuffer): JsonValue => {
    const service = idlFactory({ IDL });

    const fields = service._fields;

    let approve_result_type = null;
    for (const field of fields) {
        if (field[0] === "icrc2_approve") {
            approve_result_type = field[1].retTypes[0];
        }
    }

    if (!approve_result_type) {
        throw new Error("Approve result not found");
    }

    const decoded = IDL.decode([approve_result_type], bytes)[0];
    console.log("🚀 ~ parseIcrc2Approve ~ decoded:", decoded);
    return decoded;
};
