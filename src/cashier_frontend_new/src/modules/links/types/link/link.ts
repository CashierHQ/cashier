import type { Link as SharedLink } from "$shared";
import { Principal } from "@icp-sdk/core/principal";
import {
  Asset,
  AssetInfo,
  AssetInfoMapper,
} from "$modules/links/types/link/asset";
import {
  LinkStateMapper,
  type LinkStateValue,
} from "$modules/links/types/link/linkState";
import {
  LinkTypeMapper,
  type LinkTypeValue,
} from "$modules/links/types/link/linkType";

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

// Serialized form of Link used in serde
export type SerializedLink = {
  id: string;
  title: string;
  creator: string;
  asset_info: Array<{
    asset: { chain: string; address?: string };
    amount_per_link_use_action: bigint;
    label: string;
    available_amount?: bigint;
  }>;
  link_type: LinkTypeValue;
  create_at: bigint;
  state: LinkStateValue;
  link_use_action_max_count: bigint;
  link_use_action_counter: bigint;
};

export class LinkMapper {
  static fromSharedLink(link: SharedLink): Link {
    return new Link(
      link.id,
      link.title,
      link.creator,
      (link.asset_info || []).map((a) => AssetInfoMapper.fromSharedType(a)),
      LinkTypeMapper.fromSharedLinkType(link.link_type),
      link.created_at ?? 0n,
      LinkStateMapper.fromSharedLinkState(link.link_state),
      link.max_use,
      link.use_count,
    );
  }

  /**
   * A helper serde for serializing and deserializing Link instances.
   * Used in managedState for persistence.
   */
  static serde = {
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
              available_amount: a.available_amount,
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
        const serialized = obj as ReturnType<
          typeof LinkMapper.serde.serialize.Link
        >;

        if (!serialized) {
          throw new Error("Invalid serialized Link object");
        }

        const asset_info = (serialized.asset_info || []).map((a) => {
          const chain = a.asset.chain;
          if (chain === "IC") {
            const assetInstance = Asset.IC(
              Principal.fromText(a.asset.address as string),
            );
            return new AssetInfo(
              assetInstance,
              a.amount_per_link_use_action,
              a.label,
              a.available_amount,
            );
          }
          throw new Error(
            `Unsupported asset chain during deserialize: ${chain}`,
          );
        });

        return new Link(
          serialized.id,
          serialized.title,
          Principal.fromText(serialized.creator),
          asset_info,
          serialized.link_type,
          serialized.create_at,
          serialized.state,
          serialized.link_use_action_max_count,
          serialized.link_use_action_counter,
        );
      },
    },
  };
}
