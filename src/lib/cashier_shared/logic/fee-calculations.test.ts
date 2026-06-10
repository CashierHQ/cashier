import { describe, expect, it } from "vitest";
import {
  calculateGateFeeAmount,
  calculateIntentFees,
  calculateIntentInboundNetworkFee,
  calculateIntentOutboundNetworkFee,
  calculateIntentTotalAmount,
  calculateIntentTotalNetworkFee,
  calculateIntentUserFee,
  calculateMaxAssetAmount,
  getGateCreateFeeAmount,
  getGateOpenFeeAmount,
  getLinkCreationFeeAmount,
} from "./fee-calculations";
import { IntentParticipants, TokenStandard } from "../generated/ts/types";
import {
  getGateCreateFeeTableAmount,
  getGateOpenFeeTableAmount,
  getLinkCreationFeeTableAmount,
} from "../generated/ts/fee-table";

const UNKNOWN_PARTICIPANTS = "UnknownParticipants" as IntentParticipants;

describe("getLinkCreationFeeAmount", () => {
  it("returns the link creation fee from the generated fee table", () => {
    expect(getLinkCreationFeeAmount()).toBe(getLinkCreationFeeTableAmount());
  });
});

describe("getGateCreateFeeAmount", () => {
  it("returns the gate create fee from the generated fee table", () => {
    expect(getGateCreateFeeAmount()).toBe(getGateCreateFeeTableAmount());
  });
});

describe("getGateOpenFeeAmount", () => {
  it("returns the gate open fee from the generated fee table", () => {
    expect(getGateOpenFeeAmount()).toBe(getGateOpenFeeTableAmount());
  });
});

describe("calculateGateFeeAmount", () => {
  it("returns zero when there are no gates", () => {
    expect(calculateGateFeeAmount(0, 10, 100n, 5n)).toBe(0n);
  });

  it("charges create fee plus per-open fee for each gate", () => {
    expect(calculateGateFeeAmount(2, 3, 100n, 10n)).toBe(260n);
  });

  it("uses shared fee table defaults when fees are omitted", () => {
    expect(calculateGateFeeAmount(2, 3)).toBe(
      2n * (getGateCreateFeeAmount() + 3n * getGateOpenFeeAmount())
    );
  });
});

describe("calculateIntentTotalAmount", () => {
  it("returns the link creation fee for CreatorToTreasury", () => {
    expect(
      calculateIntentTotalAmount(
        IntentParticipants.CreatorToTreasury,
        999n,
        5,
        123n,
        456n
      )
    ).toBe(123n);
  });

  it("multiplies user input amount by max use for CreatorToLink", () => {
    expect(
      calculateIntentTotalAmount(
        IntentParticipants.CreatorToLink,
        10n,
        4,
        123n,
        456n
      )
    ).toBe(40n);
  });

  it("calculates gate fee amount for CreatorToGate", () => {
    expect(
      calculateIntentTotalAmount(
        IntentParticipants.CreatorToGate,
        999n,
        3,
        123n,
        456n,
        2,
        100n,
        10n
      )
    ).toBe(260n);
  });

  it("returns user input amount for UserToLink", () => {
    expect(
      calculateIntentTotalAmount(
        IntentParticipants.UserToLink,
        77n,
        3,
        123n,
        456n
      )
    ).toBe(77n);
  });

  it("returns user input amount for LinkToUser", () => {
    expect(
      calculateIntentTotalAmount(
        IntentParticipants.LinkToUser,
        88n,
        3,
        123n,
        456n
      )
    ).toBe(88n);
  });

  it("returns link max asset amount for LinkToCreator", () => {
    expect(
      calculateIntentTotalAmount(
        IntentParticipants.LinkToCreator,
        88n,
        3,
        123n,
        456n
      )
    ).toBe(456n);
  });

  it("returns zero for unknown participants", () => {
    expect(calculateIntentTotalAmount(UNKNOWN_PARTICIPANTS)).toBe(0n);
  });
});

describe("calculateIntentTotalNetworkFee", () => {
  it("adds inbound and outbound network fees", () => {
    expect(
      calculateIntentTotalNetworkFee(
        IntentParticipants.CreatorToLink,
        TokenStandard.ICRC2,
        10n,
        3
      )
    ).toBe(50n);
  });

  it("returns inbound-only network fee for CreatorToGate", () => {
    expect(
      calculateIntentTotalNetworkFee(
        IntentParticipants.CreatorToGate,
        TokenStandard.ICRC2,
        10n,
        3
      )
    ).toBe(20n);
  });

  it("returns outbound-only network fee for LinkToUser", () => {
    expect(
      calculateIntentTotalNetworkFee(
        IntentParticipants.LinkToUser,
        TokenStandard.ICRC1,
        10n,
        3
      )
    ).toBe(10n);
  });
});

describe("calculateIntentInboundNetworkFee", () => {
  it("uses 1x inbound fee for ICRC1 wallet-originated participants", () => {
    for (const participants of [
      IntentParticipants.CreatorToTreasury,
      IntentParticipants.CreatorToLink,
      IntentParticipants.CreatorToGate,
      IntentParticipants.UserToLink,
    ]) {
      expect(
        calculateIntentInboundNetworkFee(participants, TokenStandard.ICRC1, 7n)
      ).toBe(7n);
    }
  });

  it("uses 2x inbound fee for ICRC2 wallet-originated participants", () => {
    for (const participants of [
      IntentParticipants.CreatorToTreasury,
      IntentParticipants.CreatorToLink,
      IntentParticipants.CreatorToGate,
      IntentParticipants.UserToLink,
    ]) {
      expect(
        calculateIntentInboundNetworkFee(participants, TokenStandard.ICRC2, 7n)
      ).toBe(14n);
    }
  });

  it("has no inbound fee for link-originated participants", () => {
    for (const participants of [
      IntentParticipants.LinkToUser,
      IntentParticipants.LinkToCreator,
    ]) {
      expect(
        calculateIntentInboundNetworkFee(participants, TokenStandard.ICRC2, 7n)
      ).toBe(0n);
    }
  });

  it("returns zero for unknown participants", () => {
    expect(
      calculateIntentInboundNetworkFee(
        UNKNOWN_PARTICIPANTS,
        TokenStandard.ICRC2,
        7n
      )
    ).toBe(0n);
  });
});

describe("calculateIntentOutboundNetworkFee", () => {
  it("has no outbound fee for CreatorToTreasury and CreatorToGate", () => {
    for (const participants of [
      IntentParticipants.CreatorToTreasury,
      IntentParticipants.CreatorToGate,
    ]) {
      expect(calculateIntentOutboundNetworkFee(participants, 7n, 3)).toBe(0n);
    }
  });

  it("multiplies outbound fee by max use for CreatorToLink", () => {
    expect(
      calculateIntentOutboundNetworkFee(IntentParticipants.CreatorToLink, 7n, 3)
    ).toBe(21n);
  });

  it("uses one outbound fee for UserToLink, LinkToUser, and LinkToCreator", () => {
    for (const participants of [
      IntentParticipants.UserToLink,
      IntentParticipants.LinkToUser,
      IntentParticipants.LinkToCreator,
    ]) {
      expect(calculateIntentOutboundNetworkFee(participants, 7n, 3)).toBe(7n);
    }
  });

  it("returns zero for unknown participants", () => {
    expect(calculateIntentOutboundNetworkFee(UNKNOWN_PARTICIPANTS, 7n, 3)).toBe(
      0n
    );
  });
});

describe("calculateIntentUserFee", () => {
  it("charges amount plus network fee for CreatorToTreasury and CreatorToGate", () => {
    for (const participants of [
      IntentParticipants.CreatorToTreasury,
      IntentParticipants.CreatorToGate,
    ]) {
      expect(calculateIntentUserFee(participants, 100n, 7n)).toBe(107n);
    }
  });

  it("charges only network fee for CreatorToLink, UserToLink, and LinkToCreator", () => {
    for (const participants of [
      IntentParticipants.CreatorToLink,
      IntentParticipants.UserToLink,
      IntentParticipants.LinkToCreator,
    ]) {
      expect(calculateIntentUserFee(participants, 100n, 7n)).toBe(7n);
    }
  });

  it("is free for LinkToUser", () => {
    expect(
      calculateIntentUserFee(IntentParticipants.LinkToUser, 100n, 7n)
    ).toBe(0n);
  });

  it("returns zero for unknown participants", () => {
    expect(calculateIntentUserFee(UNKNOWN_PARTICIPANTS, 100n, 7n)).toBe(0n);
  });
});

describe("calculateIntentFees", () => {
  it("calculates all fee fields for CreatorToTreasury using bigint input", () => {
    expect(
      calculateIntentFees({
        intent_participants: IntentParticipants.CreatorToTreasury,
        token_standard: TokenStandard.ICRC2,
        link_creation_fee: 100n,
        asset_network_fee: 10n,
      })
    ).toEqual({
      intent_total_amount: "100",
      intent_total_network_fee: "20",
      intent_user_fee: "120",
    });
  });

  it("parses string inputs before calculating", () => {
    expect(
      calculateIntentFees({
        intent_participants: IntentParticipants.CreatorToLink,
        token_standard: TokenStandard.ICRC1,
        user_input_amount: "5",
        max_use: 3,
        asset_network_fee: "2",
      })
    ).toEqual({
      intent_total_amount: "15",
      intent_total_network_fee: "8",
      intent_user_fee: "8",
    });
  });

  it("uses default gate fee table values when gate fees are omitted", () => {
    expect(
      calculateIntentFees({
        intent_participants: IntentParticipants.CreatorToGate,
        token_standard: TokenStandard.ICRC2,
        asset_network_fee: 10n,
        gate_count: 2,
        max_use: 3,
      })
    ).toEqual({
      intent_total_amount: (
        2n *
        (getGateCreateFeeAmount() + 3n * getGateOpenFeeAmount())
      ).toString(),
      intent_total_network_fee: "20",
      intent_user_fee: (
        2n * (getGateCreateFeeAmount() + 3n * getGateOpenFeeAmount()) +
        20n
      ).toString(),
    });
  });

  it("uses provided gate fee overrides when present", () => {
    expect(
      calculateIntentFees({
        intent_participants: IntentParticipants.CreatorToGate,
        token_standard: TokenStandard.ICRC2,
        asset_network_fee: 10n,
        gate_count: 2,
        max_use: 3,
        gate_create_fee: "100",
        gate_open_fee: "10",
      })
    ).toEqual({
      intent_total_amount: "260",
      intent_total_network_fee: "20",
      intent_user_fee: "280",
    });
  });

  it("uses link max asset amount for LinkToCreator", () => {
    expect(
      calculateIntentFees({
        intent_participants: IntentParticipants.LinkToCreator,
        token_standard: TokenStandard.ICRC1,
        asset_network_fee: 10n,
        link_max_asset_amount: "250",
      })
    ).toEqual({
      intent_total_amount: "250",
      intent_total_network_fee: "10",
      intent_user_fee: "10",
    });
  });
});

describe("calculateMaxAssetAmount", () => {
  it("returns zero when max use is not positive", () => {
    expect(
      calculateMaxAssetAmount({
        token_balance: 1_000n,
        token_standard: TokenStandard.ICRC2,
        ledger_fee: 10n,
        max_use: 0,
      })
    ).toBe(0n);
  });

  it("subtracts token transfer network fees and divides by max use", () => {
    expect(
      calculateMaxAssetAmount({
        token_balance: 1_000n,
        token_standard: TokenStandard.ICRC2,
        ledger_fee: 10n,
        max_use: 4,
      })
    ).toBe(235n);
  });

  it("uses 1x inbound fee for ICRC1 tokens", () => {
    expect(
      calculateMaxAssetAmount({
        token_balance: 1_000n,
        token_standard: TokenStandard.ICRC1,
        ledger_fee: 10n,
        max_use: 4,
      })
    ).toBe(237n);
  });

  it("subtracts fee-token creation fees when the asset is also the fee token", () => {
    expect(
      calculateMaxAssetAmount({
        token_balance: 1_000n,
        token_standard: TokenStandard.ICRC2,
        ledger_fee: 10n,
        max_use: 4,
        is_fee_token: true,
        fee_token_standard: TokenStandard.ICRC2,
        link_creation_fee: 100n,
        gate_fee: 50n,
      })
    ).toBe(195n);
  });

  it("returns zero when fees consume the available balance", () => {
    expect(
      calculateMaxAssetAmount({
        token_balance: 100n,
        token_standard: TokenStandard.ICRC2,
        ledger_fee: 10n,
        max_use: 4,
        is_fee_token: true,
        fee_token_standard: TokenStandard.ICRC2,
        link_creation_fee: 100n,
        gate_fee: 50n,
      })
    ).toBe(0n);
  });
});
