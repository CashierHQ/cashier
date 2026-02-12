import { validationService } from "$modules/links/services/validationService";
import { LinkStep } from "$modules/links/types/linkStep";
import { walletStore } from "$modules/token/state/walletStore.svelte";
import type { LinkCreationState } from "..";
import type { LinkCreationStore } from "../../linkCreationStore.svelte";
import { ChooseLinkTypeState } from "../chooseLinkType";
import { PreviewState } from "../preview";
import { parseBalanceUnits } from "$modules/shared/utils/converter";
import { formatNumber } from "$modules/shared/utils/formatNumber";
import { locale } from "$lib/i18n";
import type {
	Intent,
	Asset,
} from "$shared";
import {
	calculateIntentFees,
	IntentParticipants,
	TokenStandard,
	IntentType,
	IntentState,
	AddressType,
} from "$shared";
import { actionStore } from "../../actionStore.svelte";
import { Principal } from "@dfinity/principal";

// State when the user is adding asset details for the tip link (shared package test)
export class AddAssetTipSharedTestState implements LinkCreationState {
	readonly step = LinkStep.ADD_ASSET;
	#link: LinkCreationStore;

	constructor(link: LinkCreationStore) {
		this.#link = link;

		// Initialize Action object on state creation with a placeholder principal
		// In production, this would come from the actual user's identity
		// For now, using a placeholder to demonstrate the Action object structure
		try {
			const placeholderPrincipal = Principal.fromText("aaaaa-aa");
			actionStore.initializeForCreateLink(placeholderPrincipal);
		} catch (e) {
			console.warn("Could not initialize Action:", e);
		}
	}

	// Build Intent for CreatorToTreasury (link creation fee)
	private buildCreatorToTreasuryIntent(
		linkCreationFee: bigint,
		icpPrincipal: Principal,
		treasuryPrincipal: Principal,
		creatorPrincipal: Principal,
	): Intent {
		return {
			id: crypto.randomUUID(),
			intent_type: IntentType.Transfer,
			asset: {
				address: icpPrincipal,
				token_standard: TokenStandard.ICRC2,
			},
			amount: linkCreationFee,
			source_address: creatorPrincipal,
			source_address_type: AddressType.Creator,
			dest_address: treasuryPrincipal,
			dest_address_type: AddressType.Treasury,
			intent_token_standard: TokenStandard.ICRC2,
			intent_state: IntentState.Created,
		};
	}

	// Build Intent for CreatorToLink (funding the link)
	private buildCreatorToLinkIntent(
		assetAddress: Principal,
		tokenStandard: TokenStandard,
		amount: bigint,
		linkPrincipal: Principal,
		creatorPrincipal: Principal,
	): Intent {
		return {
			id: crypto.randomUUID(),
			intent_type: IntentType.Transfer,
			asset: {
				address: assetAddress,
				token_standard: tokenStandard,
			},
			amount,
			source_address: creatorPrincipal,
			source_address_type: AddressType.Creator,
			dest_address: linkPrincipal,
			dest_address_type: AddressType.Link,
			intent_token_standard: tokenStandard,
			intent_state: IntentState.Created,
		};
	}

	// Calculate fees using shared package
	private calculateFeesWithSharedPackage(
		assetNetworkFee: bigint,
		tokenStandard: TokenStandard,
		userInputAmount: bigint,
		linkCreationFee: bigint,
		maxUse: number,
	) {
		// Calculate CreatorToTreasury fee
		const treasuryFee = calculateIntentFees({
			intent_participants: IntentParticipants.CreatorToTreasury,
			token_standard: TokenStandard.ICRC2,
			link_creation_fee: linkCreationFee,
			asset_network_fee: assetNetworkFee,
		});

		// Calculate CreatorToLink fee
		const linkFundingFee = calculateIntentFees({
			intent_participants: IntentParticipants.CreatorToLink,
			token_standard: tokenStandard,
			user_input_amount: userInputAmount,
			max_use: maxUse,
			asset_network_fee: assetNetworkFee,
		});

		return { treasuryFee, linkFundingFee };
	}

	// Validate the asset details and move to the preview state
	async goNext(): Promise<void> {
		if (
			!this.#link.createLinkData.assets ||
			this.#link.createLinkData.assets?.length === 0
		) {
			throw new Error("Asset is required to proceed");
		}
		if (this.#link.createLinkData.assets.length > 1) {
			throw new Error("Only one asset is supported for tip links");
		}
		if (this.#link.createLinkData.assets[0].address.trim() === "") {
			throw new Error("Address is required to proceed");
		}
		if (this.#link.createLinkData.assets[0].useAmount <= 0n) {
			throw new Error("Amount must be greater than zero to proceed");
		}

		// validate required amounts
		const validationResult = validationService.validateRequiredAmount(
			this.#link.createLinkData,
			walletStore.query.data || [],
		);

		if (validationResult.isErr()) {
			const errorMessage = validationResult.error.message;

			// Check if it's an insufficient amount error
			const insufficientAmountMatch = errorMessage.match(
				/Insufficient amount for asset ([^,]+), required: (\d+), available: (\d+)/,
			);

			if (insufficientAmountMatch && walletStore.query.data) {
				const [, address, requiredStr, availableStr] = insufficientAmountMatch;
				const required = BigInt(requiredStr);
				const available = BigInt(availableStr);

				// Find the token to get symbol and decimals
				const token = walletStore.query.data.find((t) => t.address === address);

				if (token) {
					const requiredAmount = parseBalanceUnits(required, token.decimals);
					const availableAmount = parseBalanceUnits(available, token.decimals);

					// Format the error message using locale
					const template = locale.t(
						"links.linkForm.addAsset.errors.insufficientBalance",
					);
					const formattedMessage = template
						.replace("{{required}}", formatNumber(requiredAmount))
						.replace("{{tokenSymbol}}", token.symbol)
						.replace("{{available}}", formatNumber(availableAmount));

					throw new Error(formattedMessage);
				}
			}

			// For other errors, throw the original message
			throw new Error(`Validation failed: ${errorMessage}`);
		}

		// Build and store Intents in Action
		// Note: This is a simplified example - in production, you'd need actual principals
		// For demonstration purposes, we're showing the Intent building pattern structure
		
		// Example of how Intents would be built (commented out to avoid principal errors):
		// const creatorPrincipal = Principal.fromText("user-principal");
		// const treasuryPrincipal = Principal.fromText("treasury-principal");
		// const icpPrincipal = Principal.fromText("ryjl3-tyaaa-aaaaa-aaaba-cai"); // ICP ledger
		// const linkPrincipal = Principal.fromText("link-canister-principal");
		
		// const treasuryIntent = this.buildCreatorToTreasuryIntent(
		//   linkCreationFee,
		//   icpPrincipal,
		//   treasuryPrincipal,
		//   creatorPrincipal
		// );
		
		// const linkIntent = this.buildCreatorToLinkIntent(
		//   Principal.fromText(this.#link.createLinkData.assets[0].address),
		//   TokenStandard.ICRC2,
		//   this.#link.createLinkData.assets[0].useAmount,
		//   linkPrincipal,
		//   creatorPrincipal
		// );
		
		// Add intents to Action
		// actionStore.addIntent(treasuryIntent);
		// actionStore.addIntent(linkIntent);
		
		// TODO: Calculate fees using shared package
		// const fees = this.calculateFeesWithSharedPackage(...);

		this.#link.state = new PreviewState(this.#link);
	}

	// Go back to the link type selection state
	async goBack(): Promise<void> {
		this.#link.state = new ChooseLinkTypeState(this.#link);
	}
}
