import type { LinkTypeValue } from "$modules/links/types/link/linkType";
import type { DevalueSerde } from "$lib/managedState";
import type { LinkStateValue } from "./link/linkState";
import {
  CreateLinkAsset,
  CreateLinkData,
} from "$modules/creationLink/types/createLinkData";

// Temporary link representation used during link creation
export class TempLink {
  id: string;
  create_at: bigint;
  state: LinkStateValue;
  createLinkData: CreateLinkData;

  constructor(
    id: string,
    create_at: bigint,
    state: LinkStateValue,
    createLinkData: CreateLinkData,
  ) {
    this.id = id;
    this.create_at = create_at;
    this.state = state;
    this.createLinkData = createLinkData;
  }
}

// Serialized form of TempLink used in serde
export type SerializedLinkAsset = {
  address: string;
  useAmount: bigint;
};

// Serialized form of CreateLinkData used in TempLink serde
export type SerializedCreateLinkData = {
  title: string;
  linkType: LinkTypeValue;
  maxUse: number;
  assets: SerializedLinkAsset[];
};

// Serialized form of TempLink used in serde
export type SerializedTempLink = {
  id: string;
  create_at: bigint;
  state: LinkStateValue;
  createLinkData: SerializedCreateLinkData;
};

/**
 * Mapper for serializing and deserializing TempLink objects
 */
export class TempLinkMapper {
  /**
   * (De)serialization functions for TempLink
   */
  static serde: DevalueSerde = {
    serialize: {
      TempLink: (t: unknown) => {
        const temp = t instanceof TempLink && {
          id: t.id,
          create_at: t.create_at,
          state: t.state,
          createLinkData: {
            title: t.createLinkData.title,
            linkType: t.createLinkData.linkType,
            maxUse: t.createLinkData.maxUse,
            assets: (t.createLinkData.assets || []).map(
              (a: CreateLinkAsset) => ({
                address: a.address,
                useAmount: a.useAmount,
              }),
            ),
          },
        };
        return temp;
      },
      CreateLinkData: (c: unknown) => {
        const createLinkData = c instanceof CreateLinkData && {
          title: c.title,
          linkType: c.linkType,
          maxUse: c.maxUse,
          assets: (c.assets || []).map((a: CreateLinkAsset) => ({
            address: a.address,
            useAmount: a.useAmount,
          })),
        };
        return createLinkData;
      },
      CreateLinkAsset: (a: unknown) => {
        const asset = a instanceof CreateLinkAsset && {
          address: a.address,
          useAmount: a.useAmount,
        };
        return asset;
      },
    },
    deserialize: {
      TempLink: (obj: unknown) => {
        const raw = obj as SerializedTempLink;
        const createLinkData = new CreateLinkData({
          title: raw.createLinkData.title,
          linkType: raw.createLinkData.linkType,
          maxUse: raw.createLinkData.maxUse,
          assets: (raw.createLinkData.assets || []).map(
            (a: SerializedLinkAsset) =>
              new CreateLinkAsset(a.address, a.useAmount),
          ),
        });
        return new TempLink(raw.id, raw.create_at, raw.state, createLinkData);
      },
      CreateLinkData: (obj: unknown) => {
        const raw = obj as SerializedCreateLinkData;
        return new CreateLinkData({
          title: raw.title,
          linkType: raw.linkType,
          maxUse: raw.maxUse,
          assets: (raw.assets || []).map(
            (a: SerializedLinkAsset) =>
              new CreateLinkAsset(a.address, a.useAmount),
          ),
        });
      },
      CreateLinkAsset: (obj: unknown) => {
        const raw = obj as SerializedLinkAsset;
        return new CreateLinkAsset(raw.address, raw.useAmount);
      },
    },
  };
}
