<script lang="ts">
	import Button from "$lib/shadcn/components/ui/button/button.svelte";
	import Label from "$lib/shadcn/components/ui/label/label.svelte";
	import type { LinkCreationStore } from "$modules/creationLink/state/linkCreationStore.svelte";
	import { parseBalanceUnits } from "$modules/shared/utils/converter";
	import { formatBalanceUnits } from "$modules/shared/utils/converter";
	import {
		formatUsdAmount,
		formatNumber,
	} from "$modules/shared/utils/formatNumber";
	import { walletStore } from "$modules/token/state/walletStore.svelte";
	import type { TokenWithPriceAndBalance } from "$modules/token/types";
	import { calculateMaxAmountForAsset } from "$modules/links/utils/amountCalculator";
	import { locale } from "$lib/i18n";
	import AssetButton from "$modules/creationLink/components/shared/AssetButton.svelte";
	import SelectedAssetButtonInfo from "$modules/creationLink/components/shared/SelectedAssetButtonInfo.svelte";
	import TokenSelectorDrawer from "$modules/creationLink/components/shared/TokenSelectorDrawer.svelte";
	import { toast } from "svelte-sonner";
	import { USD_AMOUNT_PRESETS } from "$modules/creationLink/constants/amountPresets";
	import { actionStore } from "../../state/actionStore.svelte";

	const {
		link,
	}: {
		link: LinkCreationStore;
	} = $props();

	let showAssetDrawer = $state(false);
	let localTokenAmount = $state("");
	let localUsdAmount = $state("");
	let isUsd = $state(false);

	// Access action reactively
	const action = $derived(actionStore.action);
	const intents = $derived(action?.intents ?? []);

	// Auto-select the first token when wallet data becomes available and assets are empty
	$effect(() => {
		if (
			walletStore.query.data &&
			walletStore.query.data.length > 0 &&
			link.createLinkData.assets.length === 0
		) {
			link.createLinkData = {
				...link.createLinkData,
				assets: [
					{
						address: walletStore.query.data[0].address,
						useAmount: 0n,
					},
				],
			};
		}
	});

	let selectedAddress: string | undefined = $derived.by(() => {
		const assets = link.createLinkData?.assets;
		if (assets && assets.length > 0) return assets[0].address;
		return undefined;
	});

	let selectedToken: TokenWithPriceAndBalance | null = $derived.by(() => {
		if (!selectedAddress || !walletStore.query.data) return null;

		const token = walletStore.findTokenByAddress(selectedAddress);
		if (token.isErr()) return null;
		return token.unwrap();
	});

	const tokenUsdPrice = $derived.by(() => {
		return selectedToken?.priceUSD;
	});

	const canConvert = $derived.by(() => {
		return tokenUsdPrice !== undefined && tokenUsdPrice > 0;
	});

	const decimals = $derived.by(() => {
		return selectedToken?.decimals || 8;
	});

	// Track previous token address and amount to detect changes
	let previousTokenAddress = $state<string | undefined>(undefined);
	let previousUseAmount = $state<bigint | undefined>(undefined);

	// Sync form amount with local state and handle token changes
	$effect(() => {
		const currentAddress = selectedToken?.address;
		const asset = link.createLinkData.assets[0];
		const currentUseAmount = asset?.useAmount;

		const addressChanged =
			currentAddress && currentAddress !== previousTokenAddress;
		const amountChanged =
			currentUseAmount !== undefined && currentUseAmount !== previousUseAmount;

		if (addressChanged) {
			localTokenAmount = "";
			localUsdAmount = "";
			previousTokenAddress = currentAddress;
			previousUseAmount = currentUseAmount;
		} else if (!currentAddress) {
			previousTokenAddress = undefined;
			previousUseAmount = undefined;
		}
	});

	function handleSelectToken(address: string) {
		link.createLinkData = {
			...link.createLinkData,
			assets: [
				{
					address,
					useAmount: 0n,
				},
			],
		};
		showAssetDrawer = false;
	}

	function setTokenAmount(value: string) {
		if (!selectedToken) return;

		const parsedValue = parseFloat(value || "0");
		const amount = formatBalanceUnits(parsedValue, selectedToken.decimals);

		const currentAsset = link.createLinkData.assets[0];
		if (!currentAsset) return;

		link.createLinkData = {
			...link.createLinkData,
			assets: [
				{
					...currentAsset,
					useAmount: amount,
				},
			],
		};
	}

	function handleToggleUsd() {
		isUsd = !isUsd;
	}

	function handleAmountChange(value: string, isUsdInput: boolean = false) {
		if (!selectedToken) return;

		// Update the appropriate local state
		if (isUsdInput) {
			localUsdAmount = value;
		} else {
			localTokenAmount = value;
		}

		// Parse the input value
		const parsedValue = parseFloat(value || "0");

		if (parsedValue === 0) {
			// If zero, clear both fields
			localTokenAmount = "";
			localUsdAmount = "";
			setTokenAmount("0");
			return;
		}

		// If converting from USD to tokens
		if (isUsdInput && canConvert && tokenUsdPrice) {
			const tokenAmountNeeded = parsedValue / tokenUsdPrice;
			const formattedTokenAmount = formatNumber(tokenAmountNeeded, {
				tofixed: 8,
			});
			localTokenAmount = formattedTokenAmount;
			setTokenAmount(formattedTokenAmount);
		}
		// If converting from tokens to USD
		else if (!isUsdInput) {
			if (canConvert && tokenUsdPrice) {
				const usdValue = parsedValue * tokenUsdPrice;
				localUsdAmount = formatUsdAmount(usdValue);
			}
			setTokenAmount(value);
		}
	}

	function handleMaxClick() {
		if (!isMaxAvailable || !selectedToken) return;

		const maxAmountResult = calculateMaxAmountForAsset(
			link.createLinkData.assets[0].address,
			1, // maxUse for tip link
			walletStore.query.data || [],
		);

		if (maxAmountResult.isErr()) {
			console.error("Error calculating max amount:", maxAmountResult.error);
			return;
		}

		const maxAmountBigInt = maxAmountResult.unwrap();
		const maxTokenAmount = parseBalanceUnits(maxAmountBigInt, decimals);
		const formattedMax = formatNumber(maxTokenAmount, { tofixed: 8 });

		localTokenAmount = formattedMax;
		if (canConvert && tokenUsdPrice) {
			const usdValue = maxTokenAmount * tokenUsdPrice;
			localUsdAmount = formatUsdAmount(usdValue);
		}
		setTokenAmount(formattedMax);
	}

	const maxTokenBalance = $derived.by(() => {
		if (!selectedToken) return 0;

		const maxAmountResult = calculateMaxAmountForAsset(
			link.createLinkData.assets[0].address,
			1, // maxUse for tip link
			walletStore.query.data || [],
		);

		if (maxAmountResult.isErr()) {
			return 0;
		}

		const maxAmountBigInt = maxAmountResult.unwrap();
		return parseBalanceUnits(maxAmountBigInt, decimals);
	});

	const isMaxAvailable = $derived.by(() => {
		return maxTokenBalance > 0 && selectedToken !== null;
	});

	const maxUsdBalance = $derived.by(() => {
		if (!canConvert || !tokenUsdPrice || maxTokenBalance === 0) {
			return 0;
		}

		const maxAmountResult = calculateMaxAmountForAsset(
			link.createLinkData.assets[0].address,
			1, // maxUse for tip link
			walletStore.query.data || [],
		);

		if (maxAmountResult.isErr()) {
			return 0;
		}

		const maxAmountBigInt = maxAmountResult.unwrap();
		const maxTokenAmount = parseBalanceUnits(maxAmountBigInt, decimals);
		return maxTokenAmount * tokenUsdPrice;
	});

	function isUsdAmountAvailable(usdAmount: number): boolean {
		return maxUsdBalance >= usdAmount;
	}

	function handleUsdPreset(usdAmount: number) {
		if (!selectedToken || !canConvert || !tokenUsdPrice) return;

		if (!isUsdAmountAvailable(usdAmount)) return;

		const tokenAmountNeeded = usdAmount / tokenUsdPrice;
		const formattedTokenAmount = formatNumber(tokenAmountNeeded, {
			tofixed: 8,
		});

		localTokenAmount = formattedTokenAmount;
		localUsdAmount = formatUsdAmount(usdAmount);
		setTokenAmount(formattedTokenAmount);
	}

	async function goNext() {
		try {
			handleAmountChange(isUsd ? localUsdAmount : localTokenAmount, isUsd);
			await link.goNext();
		} catch (e) {
			toast.error(String(e));
		}
	}
</script>

<div class="space-y-4 relative grow-1 flex flex-col mt-2 sm:mt-0">
	<!-- Shared Package Test Badge -->
	<div
		class="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-4 flex items-center gap-2"
	>
		<span class="text-2xl">🧪</span>
		<div>
			<p class="text-sm font-semibold text-purple-900">Shared Package Test</p>
			<p class="text-xs text-purple-700">
				Testing Action object and fee calculations
			</p>
		</div>
	</div>

	<!-- Action Debug Info -->
	{#if action}
		<div class="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 text-xs">
			<p class="font-semibold text-blue-900 mb-2">🧪 Shared Package - Action Object:</p>
			<div class="space-y-1 text-blue-700">
				<p><span class="font-medium">ID:</span> {action.id.substring(0, 8)}...</p>
				<p><span class="font-medium">Type:</span> {action.action_type}</p>
				<p><span class="font-medium">State:</span> {action.action_state}</p>
				<p><span class="font-medium">Intents:</span> {action.intents.length}</p>
			</div>
			{#if intents.length > 0}
				<div class="mt-2 pt-2 border-t border-blue-200">
					<p class="font-semibold text-blue-900 mb-1">Intents:</p>
					{#each intents as intent, i}
						<p class="text-blue-700">
							{i + 1}. {intent.source_address_type} → {intent.dest_address_type}
						</p>
					{/each}
				</div>
			{/if}
		</div>
		<div class="bg-green-50 border border-green-200 rounded-lg p-3 mb-4 text-xs">
			<p class="font-semibold text-green-900 mb-2">
				✓ Fee calculations using calculateIntentFees() from shared package
			</p>
			<p class="text-green-700">
				Preview page will show fees computed by the shared package instead of
				frontend logic
			</p>
		</div>
	{/if}

	<div class="input-label-field-container space-y-1">
		<div class="flex w-full items-center">
			<Label>{locale.t("links.linkForm.addAsset.asset")}</Label>
			{#if selectedToken}
				<button
					onclick={handleMaxClick}
					disabled={!isMaxAvailable}
					class="ml-auto text-[12px] font-medium transition-colors {isMaxAvailable
						? 'text-[#36A18B] cursor-pointer hover:text-[#2d8a75]'
						: 'text-gray-400 cursor-not-allowed'}"
				>
					{locale.t("links.linkForm.addAsset.max")}
				</button>
			{/if}
		</div>

		<div>
			<AssetButton
				text={locale.t("links.linkForm.addAsset.chooseAsset")}
				bind:tokenValue={localTokenAmount}
				bind:usdValue={localUsdAmount}
				onInputChange={handleAmountChange}
				{isUsd}
				onToggleUsd={handleToggleUsd}
				token={selectedToken}
				{canConvert}
				maxBalanceWithFee={maxTokenBalance}
			>
				{#if selectedToken}
					<SelectedAssetButtonInfo
						{selectedToken}
						onOpenDrawer={() => (showAssetDrawer = true)}
					/>
				{/if}
			</AssetButton>

			<TokenSelectorDrawer
				bind:open={showAssetDrawer}
				{selectedAddress}
				onSelectToken={handleSelectToken}
			/>
		</div>

		{#if selectedToken && canConvert && tokenUsdPrice}
			<div class="flex justify-between items-center gap-2 mt-6">
				{#each USD_AMOUNT_PRESETS as usdAmount, key (key)}
					{@const isDisabled = !isUsdAmountAvailable(usdAmount)}
					<button
						type="button"
						onclick={() => handleUsdPreset(usdAmount)}
						disabled={isDisabled}
						class="flex-1 px-3 py-6 text-sm font-medium rounded-md border transition-colors {isDisabled
							? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
							: 'border-gray-300 cursor-pointer hover:bg-gray-50 hover:border-[#36A18B] hover:text-[#36A18B]'}"
					>
						{usdAmount} USD
					</button>
				{/each}
			</div>
		{/if}
	</div>

	<div
		class="flex-none w-[95%] mx-auto px-2 sticky bottom-2 left-0 right-0 z-10 mt-auto"
	>
		<Button
			onclick={goNext}
			class="rounded-full inline-flex items-center justify-center cursor-pointer whitespace-nowrap font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none bg-green text-primary-foreground shadow hover:bg-green/90 h-[44px] px-4 w-full disabled:bg-disabledgreen"
			type="button"
		>
			{locale.t("links.linkForm.chooseType.continue")}
		</Button>
	</div>
</div>
