import { Principal } from "@dfinity/principal";
import type { LinkDto as BackendLinkDto } from "$lib/generated/cashier_backend/cashier_backend.did";
import type { DevalueSerde } from "$lib/managedState";
import { LinkTypeMapper, type LinkTypeValue } from "./linkType";
import { Asset, AssetInfo, AssetInfoMapper } from "./asset";
import { LinkStateMapper, type LinkStateValue } from "./linkState";

export class Link {
  id: string;
  title: string;
  creator: Principal;
  asset_info: Array<AssetInfo>;
  link_type: LinkTypeValue;
  create_at: bigint;
  state: LinkStateValue;
  link_use_action_max_count: bigint;
  link_use_action_counter: bigint;

  constructor(
    id: string,
    title: string,
    creator: Principal,
    asset_info: Array<AssetInfo>,
    link_type: LinkTypeValue,
    create_at: bigint,
    state: LinkStateValue,
    link_use_action_max_count: bigint,
    link_use_action_counter: bigint,
  ) {
    this.id = id;
    this.title = title;
    this.creator = creator;
    this.asset_info = asset_info;
    this.link_type = link_type;
    this.create_at = create_at;
    this.state = state;
    this.link_use_action_max_count = link_use_action_max_count;
    this.link_use_action_counter = link_use_action_counter;
  }
}

// Define a raw type for deserialization purposes
type LinkRaw = {
  id: string;
  title: string;
  creator: string;
  asset_info: Array<{
    asset: { chain: string; address?: string };
    amount_per_link_use_action: bigint;
    label: string;
  }>;
  link_type: LinkTypeValue;
  create_at: bigint;
  state: LinkStateValue;
  link_use_action_max_count: bigint;
  link_use_action_counter: bigint;
};

export class LinkMapper {
  static fromBackendType(b: BackendLinkDto): Link {
    return new Link(
      b.id,
      b.title,
      b.creator,
      (b.asset_info || []).map((a) => AssetInfoMapper.fromBackendType(a)),
      LinkTypeMapper.fromBackendType(b.link_type),
      b.create_at,
      LinkStateMapper.fromBackendType(b.state),
      b.link_use_action_max_count,
      b.link_use_action_counter,
    );
  }

  static toBackendType(link: Link): BackendLinkDto {
    return {
      id: link.id,
      title: link.title,
      creator: link.creator,
      asset_info: link.asset_info.map(AssetInfoMapper.toBackendType),
      link_type: LinkTypeMapper.toBackendType(link.link_type),
      create_at: link.create_at,
      state: LinkStateMapper.toBackend(link.state),
      link_use_action_max_count: link.link_use_action_max_count,
      link_use_action_counter: link.link_use_action_counter,
    };
  }

  /**
   * A helper serde for serializing and deserializing Link instances.
   * Used in managedState for persistence.
   */
  static serde: DevalueSerde = {
    serialize: {
      Link: (link: unknown) => {
        const value = link instanceof Link && {
          id: link.id,
          title: link.title,
          creator: link.creator.toString(),
          asset_info: link.asset_info.map((a) => {
            return {
              asset: {
                chain: a.asset.chain,
                address: a.asset.address?.toText(),
              },
              amount_per_link_use_action: a.amount_per_link_use_action,
              label: a.label,
            };
          }),
          link_type: link.link_type,
          create_at: link.create_at,
          state: link.state,
          link_use_action_max_count: link.link_use_action_max_count,
          link_use_action_counter: link.link_use_action_counter,
        };
        return value;
      },
    },
    deserialize: {
      Link: (obj: unknown) => {
        const raw = obj as LinkRaw;

        const asset_info = (raw.asset_info || []).map((a) => {
          const chain = a.asset.chain;
          if (chain === "IC") {
            const assetInstance = Asset.IC(
              Principal.fromText(a.asset.address as string),
            );
            return new AssetInfo(
              assetInstance,
              a.amount_per_link_use_action,
              a.label,
            );
          }
          throw new Error(
            `Unsupported asset chain during deserialize: ${chain}`,
          );
        });

        return new Link(
          raw.id,
          raw.title,
          Principal.fromText(raw.creator),
          asset_info,
          raw.link_type,
          raw.create_at,
          raw.state,
          raw.link_use_action_max_count,
          raw.link_use_action_counter,
        );
      },
    },
  };
}
