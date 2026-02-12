import { authState } from "$modules/auth/state/auth.svelte";
import { validationService } from "$modules/links/services/validationService";
import { LinkStep } from "$modules/links/types/linkStep";
import { walletStore } from "$modules/token/state/walletStore.svelte";
import type { LinkCreationState } from "..";
import type { LinkCreationStore } from "$modules/creationLink/state/linkCreationStore.svelte";
import { ChooseLinkTypeState } from "../chooseLinkType";
import { PreviewState } from "../preview";
import { parseBalanceUnits } from "$modules/shared/utils/converter";
import { formatNumber } from "$modules/shared/utils/formatNumber";
import { locale } from "$lib/i18n";
import type { Intent } from "$shared";
import {
	calculateIntentFees,
	IntentParticipants,
	TokenStandard,
	IntentType,
	IntentState,
	AddressType,
} from "$shared";
import { actionStore } from "$modules/creationLink/state/actionStore.svelte";
import { CASHIER_BACKEND_CANISTER_ID, FEE_TREASURY_PRINCIPAL } from "$modules/shared/constants";
import { ICP_LEDGER_CANISTER_ID, ICP_LEDGER_FEE } from "$modules/token/constants";
import { Principal } from "@dfinity/principal";

const LINK_CREATION_FEE_AMOUNT = 10_000n;

// State when the user is adding asset details for the tip link (shared package test)
export class AddAssetTipSharedTestState implements LinkCreationState {
	readonly step = LinkStep.ADD_ASSET;
	#link: LinkCreationStore;

	constructor(link: LinkCreationStore) {
		this.#link = link;

		// Initialize Action only if not already present (e.g. when going back from Preview we keep existing intents)
		if (!actionStore.action || actionStore.action.intents.length === 0) {
			try {
				const creatorPrincipal = authState.account?.owner
					? Principal.fromText(authState.account.owner)
					: Principal.fromText("aaaaa-aa");
				actionStore.initializeForCreateLink(creatorPrincipal);
			} catch (e) {
				console.warn("Could not initialize Action:", e);
			}
		}
	}

	// Build Intent for CreatorToTreasury (link creation fee).
	// Backend uses total_amount + network_fee for ICRC2 approve_amount - both must be set.
	private buildCreatorToTreasuryIntent(
		linkCreationFee: bigint,
		icpNetworkFee: bigint,
		icpPrincipal: Principal,
		treasuryPrincipal: Principal,
		creatorPrincipal: Principal,
	): Intent {
		const feeResult = calculateIntentFees({
			intent_participants: IntentParticipants.CreatorToTreasury,
			token_standard: TokenStandard.ICRC2,
			link_creation_fee: linkCreationFee,
			asset_network_fee: icpNetworkFee,
		});
		return {
			id: crypto.randomUUID(),
			intent_type: IntentType.Send,
			asset: {
				address: icpPrincipal,
				token_standard: TokenStandard.ICRC2,
			},
			amount: linkCreationFee,
			total_amount: BigInt(feeResult.intent_total_amount),
			network_fee: BigInt(feeResult.intent_total_network_fee),
			user_fee: BigInt(feeResult.intent_user_fee),
			source_address: creatorPrincipal,
			source_address_type: AddressType.Creator,
			dest_address: treasuryPrincipal,
			dest_address_type: AddressType.Treasury,
			dependencies: [],
			intent_state: IntentState.Created,
		};
	}

	// Build Intent for CreatorToLink (funding the link).
	// Backend uses total_amount + network_fee for ICRC2 approve_amount - both must be set.
	private buildCreatorToLinkIntent(
		assetAddress: Principal,
		tokenStandard: TokenStandard,
		amount: bigint,
		maxUse: number,
		assetNetworkFee: bigint,
		linkPrincipal: Principal,
		creatorPrincipal: Principal,
	): Intent {
		const feeResult = calculateIntentFees({
			intent_participants: IntentParticipants.CreatorToLink,
			token_standard: tokenStandard,
			user_input_amount: amount,
			max_use: maxUse,
			asset_network_fee: assetNetworkFee,
		});
		return {
			id: crypto.randomUUID(),
			intent_type: IntentType.Send,
			asset: {
				address: assetAddress,
				token_standard: tokenStandard,
			},
			amount,
			total_amount: BigInt(feeResult.intent_total_amount),
			network_fee: BigInt(feeResult.intent_total_network_fee),
			user_fee: BigInt(feeResult.intent_user_fee),
			source_address: creatorPrincipal,
			source_address_type: AddressType.Creator,
			dest_address: linkPrincipal,
			dest_address_type: AddressType.Link,
			dependencies: [],
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

		// Build and store Intents in Action for V3 create flow
		const creatorPrincipal = authState.account?.owner
			? Principal.fromText(authState.account.owner)
			: Principal.fromText("aaaaa-aa");
		const treasuryPrincipal = Principal.fromText(FEE_TREASURY_PRINCIPAL);
		const icpPrincipal = Principal.fromText(ICP_LEDGER_CANISTER_ID);
		const linkPrincipal = Principal.fromText(CASHIER_BACKEND_CANISTER_ID);

		actionStore.updateCreator(creatorPrincipal);

		const tokens = walletStore.query.data ?? [];
		const icpToken = tokens.find((t) => t.address === ICP_LEDGER_CANISTER_ID);
		const icpNetworkFee = icpToken?.fee ?? ICP_LEDGER_FEE;

		const treasuryIntent = this.buildCreatorToTreasuryIntent(
			LINK_CREATION_FEE_AMOUNT,
			icpNetworkFee,
			icpPrincipal,
			treasuryPrincipal,
			creatorPrincipal,
		);

		const assetAddress = Principal.fromText(
			this.#link.createLinkData.assets[0].address,
		);
		const useAmount = this.#link.createLinkData.assets[0].useAmount;
		const assetToken = tokens.find(
			(t) => t.address === this.#link.createLinkData.assets[0].address,
		);
		const assetNetworkFee = assetToken?.fee ?? ICP_LEDGER_FEE;
		const tokenStandard =
			this.#link.createLinkData.assets[0].address === ICP_LEDGER_CANISTER_ID
				? TokenStandard.ICRC2
				: TokenStandard.ICRC1;
		const maxUse = this.#link.createLinkData.maxUse ?? 1;

		const linkIntent = this.buildCreatorToLinkIntent(
			assetAddress,
			tokenStandard,
			useAmount,
			maxUse,
			assetNetworkFee,
			linkPrincipal,
			creatorPrincipal,
		);

		actionStore.setIntents([treasuryIntent, linkIntent]);

		this.#link.state = new PreviewState(this.#link);
	}

	// Go back to the link type selection state
	async goBack(): Promise<void> {
		this.#link.state = new ChooseLinkTypeState(this.#link);
	}
}
