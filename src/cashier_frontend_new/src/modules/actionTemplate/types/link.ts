import { type Link as BackendSharedLink } from "$lib/generated/cashier_backend/cashier_backend.did";
import type { DevalueSerde } from "$lib/managedState";
import {
  SharedAssetInfoMapper,
  type SerializedSharedAssetInfo,
} from "$modules/actionTemplate/types/asset_info";
import {
  SharedLinkStateMapper,
  type SharedLinkStateValue,
} from "$modules/actionTemplate/types/link_state";
import {
  SharedLinkTypeMapper,
  type SharedLinkTypeValue,
} from "$modules/actionTemplate/types/link_type";
import { type Link as SharedLink } from "$shared";
import { Principal } from "@icp-sdk/core/principal";

/**
 * Serialized form of SharedLink to use in local storage
 */
export type SerializedSharedLink = {
  id: string;
  title: string;
  link_type: SharedLinkTypeValue;
  link_state: SharedLinkStateValue;
  creator: string;
  asset_info: SerializedSharedAssetInfo[];
  max_use: bigint;
  use_count: bigint;
  created_at?: bigint;
};

/**
 * Mapper for converting between frontend SharedLink and backend Link
 */
export class SharedLinkMapper {
  /**
   * Convert frontend SharedLink to corresponding backend Link
   * @param link
   * @returns
   */
  static toBackendType(link: SharedLink): BackendSharedLink {
    const asset_info = link.asset_info.map(SharedAssetInfoMapper.toBackendType);
    return {
      id: link.id,
      title: link.title,
      link_type: SharedLinkTypeMapper.toBackendType(link.link_type),
      creator: link.creator,
      asset_info,
      max_use: link.max_use,
      use_count: link.use_count,
      created_at: link.created_at ? [link.created_at] : [],
      link_state: SharedLinkStateMapper.toBackendType(link.link_state),
    };
  }

  /**
   * Convert backend Link to corresponding frontend SharedLink
   * @param action
   * @returns
   */
  static toLocalType(action: BackendSharedLink): SharedLink {
    const asset_info = action.asset_info.map(SharedAssetInfoMapper.toLocalType);
    return {
      id: action.id,
      title: action.title,
      link_type: SharedLinkTypeMapper.toLocalType(action.link_type),
      creator: action.creator,
      asset_info,
      max_use: action.max_use,
      use_count: action.use_count,
      created_at:
        action.created_at.length > 0 ? action.created_at[0] : undefined,
      link_state: SharedLinkStateMapper.toLocalType(action.link_state),
    };
  }

  /**
   * (De)serialization functions for link templates
   */
  static serde: DevalueSerde = {
    serialize: {
      SharedLink: (t: unknown) => {
        const link = t as SharedLink | undefined;
        if (!link || typeof link !== "object" || Array.isArray(link)) {
          return false;
        }
        if (
          !("creator" in link) ||
          typeof link.creator !== "object" ||
          link.creator === null ||
          typeof link.creator.toText !== "function"
        ) {
          return false;
        }
        if (!("asset_info" in link) || !Array.isArray(link.asset_info)) {
          return false;
        }

        return {
          id: link.id,
          title: link.title,
          link_type: link.link_type,
          link_state: link.link_state,
          creator: link.creator.toText(),
          asset_info: link.asset_info.map(SharedAssetInfoMapper.toStorageType),
          max_use: link.max_use,
          use_count: link.use_count,
          created_at: link.created_at,
        } as SerializedSharedLink;
      },
    },
    deserialize: {
      SharedLink: (obj: unknown) => {
        const raw = obj as SerializedSharedLink;

        return {
          id: raw.id,
          title: raw.title,
          link_type: raw.link_type,
          link_state: raw.link_state,
          creator: Principal.fromText(raw.creator),
          asset_info: raw.asset_info.map(SharedAssetInfoMapper.fromStorageType),
          max_use: raw.max_use,
          use_count: raw.use_count,
          created_at: raw.created_at,
        } as SharedLink;
      },
    },
  };
}
