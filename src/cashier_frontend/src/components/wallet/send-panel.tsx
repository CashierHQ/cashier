// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import React, { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Clipboard, ChevronLeft } from "lucide-react";

// UI Components
import { FixedBottomButton } from "@/components/fix-bottom-button";
import { IconInput } from "@/components/icon-input";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { SendAssetConfirmationDrawer } from "@/components/wallet/send/confirm-send-asset-drawer";
import AssetDrawer from "@/components/asset-drawer";
import AssetButton from "@/components/asset-button";
import { SelectedAssetButtonInfo } from "@/components/link-details/selected-asset-button-info";

// Hooks
import { useTokens } from "@/hooks/useTokens";
import {
    useWalletSendAssetForm,
    useWalletSendAssetFormActions,
    WalletSendAssetFormSchema,
} from "@/components/wallet/send/send-asset-form.hooks";

// Store
import { useSendAssetStore } from "@/stores/sendAssetStore";

// Types & Constants
import { CHAIN } from "@/services/types/enum";
import { FungibleToken } from "@/types/fungible-token.speculative";
import { useWalletContext } from "@/contexts/wallet-context";

const USD_AMOUNT_PRESETS = [1, 2, 5];
interface SendPanelProps {
    tokenId?: string;
    onBack: () => void;
}

const SendPanel: React.FC<SendPanelProps> = ({ tokenId, onBack }) => {
    const EXAMPLE_PRINCIPAL_ADDRESS =
        "gaj2d-pzogj-lpg6c-aowj5-hb3t6-rgl3o-qo63w-2hogr-cjdmz-vobok-hqe";
    const EXAMPLE_ACCOUNT_ADDRESS =
        "cd619f6484bfdacea011dc4a53f098c2388cd15f940d19d569a0ecef7b857d86";

    // Locale
    const { t } = useTranslation();

    // UI state
    const [isDisabled, setIsDisabled] = useState(true);
    const [addressType, setAddressType] = useState<"principal" | "account">("principal");
    const [showAssetDrawer, setShowAssetDrawer] = useState(false);
    const [isUsd, setIsUsd] = useState(false);
    const [usdAmount, setUsdAmount] = useState<string>("");
    const { navigateToPanel } = useWalletContext();

    // Token data from global store
    const { getDisplayTokens } = useTokens();
    const userTokens = getDisplayTokens();

    // Transaction state from store
    const { setSendAssetInfo, openConfirmation, resetSendAsset } = useSendAssetStore();

    // Constants
    const ICP_ADDRESS = "ryjl3-tyaaa-aaaaa-aaaba-cai";

    /**
     * Find the selected token from token list based on tokenId param
     */
    const selectedToken = useMemo(() => {
        // Skip if no token list available
        if (!userTokens?.length) {
            return undefined;
        }

        // Find token by tokenId if provided
        if (tokenId) {
            return userTokens.find((token) => token.address === tokenId);
        }

        // If no tokenId provided, default to ICP
        return userTokens.find((token) => token.address === ICP_ADDRESS);
    }, [userTokens, tokenId]);

    // Init form with default values
    const form = useWalletSendAssetForm(userTokens, {
        address: selectedToken?.address ?? "",
        amount: BigInt(0),
        assetNumber: 0,
        walletAddress: "",
    });

    // Get form actions
    const { setTokenAddress, setTokenAmount, setWalletAddress } =
        useWalletSendAssetFormActions(form);

    // Reset transaction state when component mounts
    useEffect(() => {
        // Reset the send asset store to clear any previous transaction status
        resetSendAsset();
    }, []);

    // Set default token in form if no token is selected
    useEffect(() => {
        if (!tokenId && selectedToken) {
            setTokenAddress(selectedToken.address);
        }
    }, [tokenId, selectedToken, setTokenAddress]);

    // Check if selected token is ICP
    const isIcpToken = selectedToken?.address === ICP_ADDRESS;

    /**
     * Calculate the maximum available amount considering network fees
     */
    const maxAvailableAmount = useMemo(() => {
        if (!selectedToken) return 0;

        const { amount, fee, decimals } = selectedToken;

        if (amount === undefined || decimals === undefined) {
            return 0;
        }

        const tokenAmount = Number(amount) / 10 ** decimals;

        // If fee is defined, subtract it from the available amount
        if (fee !== undefined) {
            const feeAmount = Number(fee) / 10 ** decimals;
            return Math.max(0, tokenAmount - feeAmount);
        }

        return tokenAmount;
    }, [selectedToken]);

    /**
     * Update form validation status whenever relevant fields change
     */
    useEffect(() => {
        const amount = form.getValues("assetNumber");
        const walletAddress = form.getValues("walletAddress");
        const hasErrors = Object.keys(form.formState.errors).length > 0;

        setIsDisabled(!walletAddress || !amount || amount <= 0 || hasErrors);
    }, [form.watch("assetNumber"), form.watch("walletAddress"), form.formState.errors.assetNumber]);

    /**
     * Handle form reset after successful transaction (callback from drawer)
     */
    const handleTransactionSuccess = () => {
        // Reset form after successful transaction
        form.reset({
            address: selectedToken?.address ?? "",
            amount: BigInt(0),
            assetNumber: 0,
            walletAddress: "",
        });

        // Reset UI state
        setUsdAmount("");
        setIsDisabled(true);

        // Note: We don't call resetSendAsset() here because:
        // 1. It would close the confirmation drawer prematurely
        // 2. We want to keep the success state visible in the drawer
        // 3. The next transaction will call resetSendAsset() when submitted
    };

    /**
     * Clear amount errors when selected token changes
     */
    useEffect(() => {
        form.clearErrors("assetNumber");
    }, [selectedToken, form]);

    /**
     * Handle token selection
     */
    const handleTokenSelect = async (token: FungibleToken) => {
        navigateToPanel("send", { tokenId: token.address });
        setTokenAddress(token.address);
        setShowAssetDrawer(false);
    };

    /**
     * Handle amount input changes
     */
    const handleAmountInputChange = (value: string) => {
        if (isUsd && selectedToken?.usdConversionRate) {
            // If in USD mode, convert USD to token amount
            const usdValue = parseFloat(value);
            if (!isNaN(usdValue)) {
                const tokenValue = usdValue / selectedToken.usdConversionRate;
                setTokenAmount(tokenValue.toString());
                setUsdAmount(value);
            }
        } else {
            // If in token mode, convert token to USD amount
            setTokenAmount(value);
            if (selectedToken?.usdConversionRate && !isNaN(parseFloat(value))) {
                const usdValue = parseFloat(value) * selectedToken.usdConversionRate;
                setUsdAmount(usdValue.toString());
            }
        }

        // Validate amount against available balance
        const numericValue = parseFloat(value);
        if (!isNaN(numericValue)) {
            if (numericValue > maxAvailableAmount) {
                form.setError("assetNumber", {
                    type: "manual",
                    message: `Amount must be less than available balance (${maxAvailableAmount})`,
                });
            } else {
                form.clearErrors("assetNumber");
            }
        }
    };

    /**
     * Handle USD toggle
     */
    const handleToggleUsd = (value: boolean) => {
        setIsUsd(value);
        const currentAmount = form.getValues("assetNumber")?.toString();

        if (value && selectedToken?.usdConversionRate && currentAmount) {
            // Convert token amount to USD
            const usdValue = parseFloat(currentAmount) * selectedToken.usdConversionRate;
            setUsdAmount(usdValue.toString());
        } else if (!value && usdAmount && selectedToken?.usdConversionRate) {
            // Convert USD amount to token
            const tokenValue = parseFloat(usdAmount) / selectedToken.usdConversionRate;
            setTokenAmount(tokenValue.toString());
        }
    };

    /**
     * Handle wallet address input changes
     */
    const handleSetWalletAddress = (event: React.ChangeEvent<HTMLInputElement>) => {
        setWalletAddress(event.target.value);
    };

    /**
     * Handle max amount button click
     */
    const handleMaxAmount = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        if (!selectedToken) return;

        if (maxAvailableAmount > 0) {
            setTokenAmount(maxAvailableAmount.toString());
            form.clearErrors("assetNumber");
        } else {
            form.setError("assetNumber", {
                type: "manual",
                message: "Insufficient balance to cover amount plus network fee",
            });
        }
    };

    /**
     * Handle clipboard paste
     */
    const handlePasteClick = async (field: { onChange: (value: string) => void }) => {
        try {
            const text = await navigator.clipboard.readText();
            field.onChange(text);
        } catch (err) {
            console.error("Failed to read clipboard contents:", err);
        }
    };

    /**
     * Handle form submission
     */
    const handleSubmit = async (data: WalletSendAssetFormSchema) => {
        if (!selectedToken) return;

        // Reset any previous transaction state first
        // This ensures we're starting fresh with each new transaction
        resetSendAsset();

        // Build send asset info for the store
        setSendAssetInfo({
            amountNumber: data.assetNumber ?? 0,
            asset: {
                address: selectedToken.address,
                chain: CHAIN.IC,
                symbol: selectedToken.symbol,
                decimals: selectedToken.decimals ?? 8,
            },
            destinationAddress: data.walletAddress,
            feeAmount: selectedToken.fee
                ? Number(selectedToken.fee) / 10 ** (selectedToken.decimals ?? 8)
                : undefined,
            feeSymbol: selectedToken.symbol,
        });

        // Open confirmation drawer
        openConfirmation();
    };

    /**
     * Handle address type toggle (for ICP tokens)
     */
    const handleAddressTypeChange = (type: "principal" | "account") => {
        setAddressType(type);
        form.setValue("walletAddress", "");
    };

    return (
        <div className="w-full flex flex-col h-full">
            <div className="relative flex justify-center items-center mb-4">
                <button onClick={onBack} className="absolute left-0">
                    <ChevronLeft size={24} />
                </button>
                <h1 className="text-lg font-semibold">{t("wallet.send.header")}</h1>
            </div>

            <div id="content" className="h-full">
                <Form {...form}>
                    <form
                        onSubmit={form.handleSubmit(handleSubmit)}
                        className="h-full flex flex-col"
                    >
                        {/* Token Selection */}
                        <FormField
                            name="address"
                            control={form.control}
                            render={() => (
                                <FormItem>
                                    <div className="flex w-full items-center">
                                        <FormLabel>{t("wallet.send.sendToken")}</FormLabel>
                                        <button
                                            onClick={handleMaxAmount}
                                            className="ml-auto text-[#36A18B] text-[12px] font-medium"
                                        >
                                            Max
                                        </button>
                                    </div>
                                    <FormControl>
                                        <AssetButton
                                            handleClick={() => setShowAssetDrawer(true)}
                                            text="Select Token"
                                            childrenNode={
                                                selectedToken && (
                                                    <SelectedAssetButtonInfo
                                                        selectedToken={selectedToken}
                                                    />
                                                )
                                            }
                                            tokenValue={form.getValues("assetNumber")?.toString()}
                                            usdValue={usdAmount}
                                            onInputChange={handleAmountInputChange}
                                            isUsd={isUsd}
                                            token={selectedToken}
                                            onToggleUsd={handleToggleUsd}
                                            canConvert={
                                                selectedToken?.usdConversionRate ? true : false
                                            }
                                            tokenDecimals={selectedToken?.decimals ?? 8}
                                            showPresetButtons={true}
                                            presetButtons={USD_AMOUNT_PRESETS.map(
                                                (amount: number) => ({
                                                    content: `${amount} USD`,
                                                    action: () => {
                                                        const value = amount.toString();
                                                        setTokenAmount(value);

                                                        const tokenValue =
                                                            parseFloat(value) /
                                                            (selectedToken?.usdConversionRate ?? 1);
                                                        setTokenAmount(tokenValue.toString());
                                                    },
                                                }),
                                            )}
                                            showMaxButton={true}
                                            onMaxClick={() => {
                                                setTokenAmount(maxAvailableAmount.toString());
                                            }}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="flex flex-col w-full gap-5 mt-5">
                            {/* Wallet Address Input */}
                            <FormField
                                control={form.control}
                                name="walletAddress"
                                render={({ field }) => (
                                    <FormItem>
                                        <div className="flex justify-between items-center mb-2">
                                            <FormLabel>
                                                {t("wallet.send.destinationAddress")}
                                            </FormLabel>
                                        </div>

                                        {/* ICP address type selector */}
                                        {isIcpToken && (
                                            <div className="flex gap-2 mb-2">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        handleAddressTypeChange("principal")
                                                    }
                                                    className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                                                        addressType === "principal"
                                                            ? "border-2 border-[#36A18B] text-[#36A18B] bg-white"
                                                            : "border border-gray-200 text-gray-600 bg-white"
                                                    }`}
                                                >
                                                    Principal ID
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        handleAddressTypeChange("account")
                                                    }
                                                    className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                                                        addressType === "account"
                                                            ? "border-2 border-[#36A18B] text-[#36A18B] bg-white"
                                                            : "border border-gray-200 text-gray-600 bg-white"
                                                    }`}
                                                >
                                                    Account ID
                                                </button>
                                            </div>
                                        )}

                                        <FormControl>
                                            <IconInput
                                                type="text"
                                                placeholder={
                                                    isIcpToken
                                                        ? `Enter ${addressType === "principal" ? "Principal" : "Account"} ID`
                                                        : "Enter address"
                                                }
                                                isCurrencyInput={false}
                                                rightIcon={<Clipboard color="#36A18B" size={20} />}
                                                onRightIconClick={() => handlePasteClick(field)}
                                                {...field}
                                                value={form.getValues("walletAddress") ?? ""}
                                                onChange={handleSetWalletAddress}
                                                className="pl-3 py-5 font-light rounded-lg appearance-none shadow-xs border border-input"
                                                disabled={!selectedToken}
                                            />
                                        </FormControl>

                                        <FormMessage />

                                        {/* Address examples */}
                                        <div className="text-xs text-gray-400 px-0.5 pt-1">
                                            {isIcpToken && addressType === "principal"
                                                ? `Example: ${EXAMPLE_PRINCIPAL_ADDRESS.slice(
                                                      0,
                                                      12,
                                                  )} . . . ${EXAMPLE_PRINCIPAL_ADDRESS.slice(-8)}`
                                                : isIcpToken && addressType === "account"
                                                  ? `Example: ${EXAMPLE_ACCOUNT_ADDRESS.slice(
                                                        0,
                                                        12,
                                                    )} . . . ${EXAMPLE_ACCOUNT_ADDRESS.slice(-8)}`
                                                  : `Example: ${EXAMPLE_ACCOUNT_ADDRESS.slice(
                                                        0,
                                                        12,
                                                    )}...${EXAMPLE_ACCOUNT_ADDRESS.slice(-8)}`}
                                        </div>
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FixedBottomButton
                            type="submit"
                            variant="default"
                            disabled={isDisabled}
                            className={`mx-auto mt-auto mb-2 ${isDisabled ? "bg-disabledgreen" : ""}`}
                        >
                            {t("wallet.send.button")}
                        </FixedBottomButton>
                    </form>
                </Form>
            </div>

            {/* Confirmation drawer */}
            <SendAssetConfirmationDrawer onSuccessfulTransaction={handleTransactionSuccess} />

            {/* Asset Selection Drawer */}
            <AssetDrawer
                title="Select Token"
                open={showAssetDrawer}
                handleClose={() => setShowAssetDrawer(false)}
                handleChange={(address) => {
                    const token = userTokens?.find((t) => t.address === address);
                    if (token) {
                        handleTokenSelect(token);
                    }
                }}
                assetList={userTokens || []}
                showSearch={true}
            />
        </div>
    );
};

export default SendPanel;
