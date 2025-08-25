// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

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
