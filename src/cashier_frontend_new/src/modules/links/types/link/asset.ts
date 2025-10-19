import type { Asset as BackendAsset, AssetInfoDto as BackendAssetInfoDto } from "$lib/generated/cashier_backend/cashier_backend.did";
import type { Principal } from "@dfinity/principal";
import { rsMatch } from "$lib/rsMatch";

export class Asset {
	// Currently only IC is modeled in the backend union. Keep wrapper for future extensibility.
		private constructor(public readonly kind: string, public readonly address?: Principal) {}

		static IC(address: Principal) {
			return new Asset("IC", address);
		}

		toBackend(): BackendAsset {
				if (this.kind === "IC") {
					return { IC: { address: (this.address as unknown) as Principal } } as BackendAsset;
				}
			throw new Error(`Unsupported asset kind: ${this.kind}`);
		}

		static fromBackend(b: BackendAsset): Asset {
			return rsMatch(b, {
				IC: (v) => new Asset("IC", v.address),
			});
		}
}

export class AssetInfo {
	asset: Asset;
	amount_per_link_use_action: bigint;
	label: string;

	constructor(asset: Asset, amount_per_link_use_action: bigint, label: string) {
		this.asset = asset;
		this.amount_per_link_use_action = amount_per_link_use_action;
		this.label = label;
	}

	toBackend(): BackendAssetInfoDto {
		return {
			asset: this.asset.toBackend(),
			amount_per_link_use_action: this.amount_per_link_use_action,
			label: this.label,
		} as BackendAssetInfoDto;
	}

	static fromBackend(b: BackendAssetInfoDto): AssetInfo {
		return new AssetInfo(Asset.fromBackend(b.asset), b.amount_per_link_use_action, b.label);
	}
}