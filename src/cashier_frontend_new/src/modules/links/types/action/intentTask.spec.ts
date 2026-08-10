import { describe, it, expect } from "vitest";
import IntentTask, {
  IntentTaskMapper,
} from "$modules/links/types/action/intentTask";
import { AddressType, IntentState, IntentType, type Intent } from "$shared";
import { Principal } from "@icp-sdk/core/principal";

describe("IntentTask.fromSharedType", () => {
  it("maps a creator-to-link transfer", () => {
    const principal = Principal.fromText("ryjl3-tyaaa-aaaaa-aaaba-cai");
    const intent: Intent = {
      id: "intent-1",
      intent_type: IntentType.Send,
      asset: { address: principal },
      amount: 1n,
      source_address: principal,
      source_address_type: AddressType.Creator,
      dest_address: principal,
      dest_address_type: AddressType.Link,
      intent_state: IntentState.Created,
      label: "SEND_ASSET",
    };

    const t = IntentTaskMapper.fromSharedType(intent);

    expect(t).toBe(IntentTask.TRANSFER_WALLET_TO_LINK);
  });
});
