/**
 * Tests for generated fee calculation functions
 * Uses shared test fixtures to validate both TypeScript and Rust implementations
 */

import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

// Import generated functions (will be available after generation)
import {
  calculateIntentTotalAmount,
  calculateIntentTotalNetworkFee,
  calculateIntentUserFee,
  calculateIntentFees,
  IntentParticipants,
  TokenStandard,
} from "../generated/ts/index.js";

// Load test fixtures
const fixturesPath = path.join(
  import.meta.dirname,
  "fixtures",
  "fee-calculations.json"
);
const fixtures = JSON.parse(fs.readFileSync(fixturesPath, "utf-8"));

describe("calculateIntentTotalAmount", () => {
  const testCases = fixtures.testCases.calculateIntentTotalAmount;

  testCases.forEach(
    (tc: {
      name: string;
      input: {
        participants: string;
        userInputAmount: string;
        maxUse: number;
        linkCreationFee: string;
        linkMaxAssetAmount: string;
      };
      expected: string;
    }) => {
      it(tc.name, () => {
        const result = calculateIntentTotalAmount(
          IntentParticipants[
            tc.input.participants as keyof typeof IntentParticipants
          ],
          BigInt(tc.input.userInputAmount),
          tc.input.maxUse,
          BigInt(tc.input.linkCreationFee),
          BigInt(tc.input.linkMaxAssetAmount)
        );
        expect(result.toString()).toBe(tc.expected);
      });
    }
  );
});

describe("calculateIntentTotalNetworkFee", () => {
  const testCases = fixtures.testCases.calculateIntentTotalNetworkFee;

  testCases.forEach(
    (tc: {
      name: string;
      input: {
        participants: string;
        tokenStandard: string;
        assetNetworkFee: string;
        maxUse: number;
      };
      expected: string;
      comment?: string;
    }) => {
      it(tc.name, () => {
        const result = calculateIntentTotalNetworkFee(
          IntentParticipants[
            tc.input.participants as keyof typeof IntentParticipants
          ],
          TokenStandard[tc.input.tokenStandard as keyof typeof TokenStandard],
          BigInt(tc.input.assetNetworkFee),
          tc.input.maxUse
        );
        expect(result.toString()).toBe(tc.expected);
      });
    }
  );
});

describe("calculateIntentUserFee", () => {
  const testCases = fixtures.testCases.calculateIntentUserFee;

  testCases.forEach(
    (tc: {
      name: string;
      input: {
        participants: string;
        totalAmount: string;
        totalNetworkFee: string;
      };
      expected: string;
    }) => {
      it(tc.name, () => {
        const result = calculateIntentUserFee(
          IntentParticipants[
            tc.input.participants as keyof typeof IntentParticipants
          ],
          BigInt(tc.input.totalAmount),
          BigInt(tc.input.totalNetworkFee)
        );
        expect(result.toString()).toBe(tc.expected);
      });
    }
  );
});

describe("calculateIntentFees (end-to-end)", () => {
  const testCases = fixtures.testCases.calculateIntentFees_endToEnd;

  testCases.forEach(
    (tc: {
      name: string;
      description?: string;
      input: {
        intent_participants: string;
        token_standard: string;
        user_input_amount: string;
        max_use: number;
        link_creation_fee: string;
        asset_network_fee: string;
        link_max_asset_amount: string;
      };
      expected: {
        intent_total_amount: string;
        intent_total_network_fee: string;
        intent_user_fee: string;
      };
    }) => {
      it(tc.name, () => {
        const result = calculateIntentFees({
          intent_participants:
            IntentParticipants[
              tc.input.intent_participants as keyof typeof IntentParticipants
            ],
          token_standard:
            TokenStandard[
              tc.input.token_standard as keyof typeof TokenStandard
            ],
          user_input_amount: tc.input.user_input_amount,
          max_use: tc.input.max_use,
          link_creation_fee: tc.input.link_creation_fee,
          asset_network_fee: tc.input.asset_network_fee,
          link_max_asset_amount: tc.input.link_max_asset_amount,
        });

        expect(result.intent_total_amount).toBe(
          tc.expected.intent_total_amount
        );
        expect(result.intent_total_network_fee).toBe(
          tc.expected.intent_total_network_fee
        );
        expect(result.intent_user_fee).toBe(tc.expected.intent_user_fee);
      });
    }
  );
});
