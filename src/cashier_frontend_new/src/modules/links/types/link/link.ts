import type { Principal } from "@dfinity/principal";
import type { LinkDto as BackendLinkDto } from "$lib/generated/cashier_backend/cashier_backend.did";
import { LinkTypeMapper, type LinkTypeValue } from "./linkType";
import { AssetInfo, AssetInfoMapper } from "./asset";
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
}
