import type { Principal } from "@dfinity/principal";
import type { LinkDto as BackendLinkDto } from "$lib/generated/cashier_backend/cashier_backend.did";
import { LinkType } from "./linkType";
import { AssetInfo } from "./asset";
import { LinkState } from "./linkState";

export class Link {
  id: string;
  title: string;
  creator: Principal;
  asset_info: Array<AssetInfo>;
  link_type: LinkType;
  create_at: bigint;
  state: LinkState;

  link_use_action_max_count: bigint;

  link_use_action_counter: bigint;

  constructor(
    id: string,
    title: string,
    creator: Principal,
    asset_info: Array<AssetInfo>,
    link_type: LinkType,
    create_at: bigint,
    state: LinkState,
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

  static fromBackend(b: BackendLinkDto): Link {
    return new Link(
      b.id,
      b.title,
      b.creator,
      (b.asset_info || []).map((a) => AssetInfo.fromBackend(a)),
      LinkType.fromBackendType(b.link_type),
      b.create_at,
      LinkState.fromBackend(b.state),
      b.link_use_action_max_count,
      b.link_use_action_counter,
    );
  }

  toBackend(): BackendLinkDto {
    return {
      id: this.id,
      title: this.title,
      creator: this.creator,
      asset_info: this.asset_info.map((a) => a.toBackend()),
      link_type: this.link_type.toBackendType(),
      create_at: this.create_at,
      state: this.state.toBackend(),
      link_use_action_max_count: this.link_use_action_max_count,
      link_use_action_counter: this.link_use_action_counter,
    };
  }
}
