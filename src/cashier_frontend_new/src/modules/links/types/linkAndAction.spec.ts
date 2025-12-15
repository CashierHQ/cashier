import { describe, it, expect } from "vitest";
import { Principal } from "@dfinity/principal";
import * as devalue from "devalue";
import { LinkAction, LinkActionMapper } from "./linkAndAction";
import { Link } from "./link/link";
import { AssetInfo } from "./link/asset";
import { LinkType } from "./link/linkType";
import { LinkState } from "./link/linkState";
import Action from "./action/action";
import Intent from "./action/intent";
import IntentTask from "./action/intentTask";
import IntentState from "./action/intentState";
import IntentType, { TransferData } from "./action/intentType";
import Wallet from "./wallet";
import { ActionType } from "./action/actionType";
import { ActionState } from "./action/actionState";
import { LinkUserState } from "./link/linkUserState";
import Asset from "./asset";

describe("LinkActionMapper", () => {
  function makeSampleLink(id = "link-1", title = "Test Link") {
    const creator = Principal.fromText("ryjl3-tyaaa-aaaaa-aaaba-cai");
    const assetAddress = Principal.fromText("ryjl3-tyaaa-aaaaa-aaaba-cai");
    const assetInfo = new AssetInfo(
      Asset.IC(assetAddress),
      BigInt(5000000),
      "TEST_ASSET",
    );

    return new Link(
      id,
      title,
      creator,
      [assetInfo],
      LinkType.TIP,
      BigInt(Date.now()),
      LinkState.ACTIVE,
      BigInt(10),
      BigInt(0),
    );
  }

  function makeSampleAction(id = "action-1") {
    const principal = Principal.fromText("ryjl3-tyaaa-aaaaa-aaaba-cai");
    const wallet = new Wallet(principal, null);
    const asset = Asset.IC(principal);

    const transferData = new TransferData(wallet, asset, wallet, BigInt(100));
    const intentType = new IntentType(transferData);
    const intent = new Intent(
      "intent-1",
      IntentTask.TRANSFER_WALLET_TO_LINK,
      intentType,
      BigInt(Date.now()),
      IntentState.CREATED,
    );

    return new Action(
      id,
      principal,
      ActionType.RECEIVE,
      ActionState.CREATED,
      [intent],
      undefined,
    );
  }

  describe("serde", () => {
    it("serializes and deserializes LinkAction with both link and action", () => {
      const link = makeSampleLink();
      const action = makeSampleAction();
      const linkAction = new LinkAction(link, action, LinkUserState.COMPLETED);

      const serialized =
        LinkActionMapper.serde.serialize.LinkAction(linkAction);
      expect(serialized).toBeDefined();
      expect(serialized).toHaveProperty("link");
      expect(serialized).toHaveProperty("action");
      expect(serialized).toHaveProperty("link_user_state");

      const deserialized =
        LinkActionMapper.serde.deserialize.LinkAction(serialized);
      expect(deserialized).toBeInstanceOf(LinkAction);
      expect(deserialized.link).toBeInstanceOf(Link);
      expect(deserialized.link.id).toBe(link.id);
      expect(deserialized.link.title).toBe(link.title);
      expect(deserialized.action).toBeInstanceOf(Action);
      expect(deserialized.action?.id).toBe(action.id);
      expect(deserialized.link_user_state).toBe(LinkUserState.COMPLETED);
    });

    it("serializes and deserializes LinkAction with only link (no action)", () => {
      const link = makeSampleLink();
      const linkAction = new LinkAction(
        link,
        undefined,
        LinkUserState.COMPLETED,
      );

      const serialized =
        LinkActionMapper.serde.serialize.LinkAction(linkAction);
      expect(serialized).toBeDefined();
      expect(serialized).toHaveProperty("link");
      expect(serialized?.action).toBeUndefined();
      expect(serialized).toHaveProperty("link_user_state");

      const deserialized =
        LinkActionMapper.serde.deserialize.LinkAction(serialized);
      expect(deserialized).toBeInstanceOf(LinkAction);
      expect(deserialized.link).toBeInstanceOf(Link);
      expect(deserialized.link.id).toBe(link.id);
      expect(deserialized.action).toBeUndefined();
      expect(deserialized.link_user_state).toBe(LinkUserState.COMPLETED);
    });

    it("serializes and deserializes LinkAction without link_user_state", () => {
      const link = makeSampleLink();
      const action = makeSampleAction();
      const linkAction = new LinkAction(link, action);

      const serialized =
        LinkActionMapper.serde.serialize.LinkAction(linkAction);
      expect(serialized).toBeDefined();

      const deserialized =
        LinkActionMapper.serde.deserialize.LinkAction(serialized);
      expect(deserialized).toBeInstanceOf(LinkAction);
      expect(deserialized.link).toBeInstanceOf(Link);
      expect(deserialized.action).toBeInstanceOf(Action);
      expect(deserialized.link_user_state).toBeUndefined();
    });

    it("returns undefined when serializing non-LinkAction value", () => {
      const notLinkAction = { link: "not a Link", action: null };
      const serialized =
        LinkActionMapper.serde.serialize.LinkAction(notLinkAction);
      expect(serialized).toBeUndefined();
    });

    it("throws error when deserializing invalid object", () => {
      expect(() => {
        LinkActionMapper.serde.deserialize.LinkAction(undefined);
      }).toThrow("Invalid serialized LinkAction object");
    });
  });

  describe("devalue integration", () => {
    it("serializes LinkAction with devalue.stringify without stack overflow", () => {
      const link = makeSampleLink();
      const action = makeSampleAction();
      const linkAction = new LinkAction(link, action, LinkUserState.COMPLETED);

      // Create a combined serde with LinkAction, Action, and Link serializers
      const combinedSerde = {
        serialize: {
          ...LinkActionMapper.serde.serialize,
        },
        deserialize: {
          ...LinkActionMapper.serde.deserialize,
        },
      };

      // This should NOT throw RangeError
      const stringified = devalue.stringify(
        linkAction,
        combinedSerde.serialize,
      );
      expect(stringified).toBeDefined();
      expect(typeof stringified).toBe("string");

      const parsed = devalue.parse(
        stringified,
        combinedSerde.deserialize,
      ) as LinkAction;
      expect(parsed).toBeInstanceOf(LinkAction);
      expect(parsed.link.id).toBe(link.id);
      expect(parsed.link.title).toBe(link.title);
      expect(parsed.action?.id).toBe(action.id);
      expect(parsed.link_user_state).toBe(LinkUserState.COMPLETED);
    });

    it("handles LinkAction without action in devalue roundtrip", () => {
      const link = makeSampleLink("link-2", "Another Link");
      const linkAction = new LinkAction(
        link,
        undefined,
        LinkUserState.COMPLETED,
      );

      const combinedSerde = {
        serialize: {
          ...LinkActionMapper.serde.serialize,
        },
        deserialize: {
          ...LinkActionMapper.serde.deserialize,
        },
      };

      const stringified = devalue.stringify(
        linkAction,
        combinedSerde.serialize,
      );
      const parsed = devalue.parse(
        stringified,
        combinedSerde.deserialize,
      ) as LinkAction;

      expect(parsed).toBeInstanceOf(LinkAction);
      expect(parsed.link.id).toBe("link-2");
      expect(parsed.link.title).toBe("Another Link");
      expect(parsed.action).toBeUndefined();
      expect(parsed.link_user_state).toBe(LinkUserState.COMPLETED);
    });
  });

  describe("nested serialization", () => {
    it("properly serializes nested Link and Action instances", () => {
      const link = makeSampleLink();
      const action = makeSampleAction();
      const linkAction = new LinkAction(link, action);

      const serialized =
        LinkActionMapper.serde.serialize.LinkAction(linkAction);

      // Verify link is serialized (not a Link instance)
      expect(serialized?.link).toBeDefined();
      expect(serialized?.link).not.toBeInstanceOf(Link);
      expect(typeof serialized?.link).toBe("object");

      // Verify action is serialized (not an Action instance)
      expect(serialized?.action).toBeDefined();
      expect(serialized?.action).not.toBeInstanceOf(Action);
      expect(typeof serialized?.action).toBe("object");
    });

    it("deserializes nested objects back to proper class instances", () => {
      const link = makeSampleLink();
      const action = makeSampleAction();
      const linkAction = new LinkAction(link, action, LinkUserState.COMPLETED);

      const serialized =
        LinkActionMapper.serde.serialize.LinkAction(linkAction);
      const deserialized =
        LinkActionMapper.serde.deserialize.LinkAction(serialized);

      // Verify deserialized instances are proper classes
      expect(deserialized.link).toBeInstanceOf(Link);
      expect(deserialized.link.creator).toBeInstanceOf(Principal);
      expect(deserialized.action).toBeInstanceOf(Action);
      expect(deserialized.action?.creator).toBeInstanceOf(Principal);
      expect(deserialized.action?.intents[0]).toBeInstanceOf(Intent);
    });
  });
});
