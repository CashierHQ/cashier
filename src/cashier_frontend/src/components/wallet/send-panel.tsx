import React, { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Clipboard, ChevronLeft } from "lucide-react";

// UI Components
import { FixedBottomButton } from "@/components/fix-bottom-button";
import { IconInput } from "@/components/icon-input";
import TransactionToast from "@/components/transaction/transaction-toast";
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
import useToast from "@/hooks/useToast";
import {
    useWalletSendAssetForm,
    useWalletSendAssetFormActions,
    WalletSendAssetFormSchema,
} from "@/components/wallet/send/send-asset-form.hooks";

// Store
import { useSendAssetStore } from "@/stores/sendAssetStore";

// Types & Constants
import { CHAIN } from "@/services/types/enum";
import { TransactionStatus } from "@/services/types/wallet.types";
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
    const { toastData, showToast, hideToast } = useToast();
    const [isDisabled, setIsDisabled] = useState(true);
    const [addressType, setAddressType] = useState<"principal" | "account">("principal");
    const [showAssetDrawer, setShowAssetDrawer] = useState(false);
    const { navigateToPanel } = useWalletContext();

    // Token data from global store
    const { getDisplayTokens } = useTokens();
    const userTokens = getDisplayTokens();

    // Transaction state from store
    const { transactionStatus, setSendAssetInfo, setTransactionStatus, openConfirmation } =
        useSendAssetStore();

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
     * Handle transaction status changes
     */
    useEffect(() => {
        switch (transactionStatus) {
            case TransactionStatus.FAILED:
                showToast(
                    t("transaction.confirm_popup.transaction_failed"),
                    t("transaction.confirm_popup.transaction_failed_message"),
                    "error",
                );
                break;

            case TransactionStatus.SUCCESS:
                showToast(
                    t("transaction.confirm_popup.transaction_success"),
                    t("transaction.confirm_popup.transaction_success_message"),
                    "default",
                );

                // Reset form after successful transaction
                form.reset({
                    address: selectedToken?.address ?? "",
                    amount: BigInt(0),
                    assetNumber: 0,
                    walletAddress: "",
                });
                break;
        }
    }, [transactionStatus, t, showToast, form, selectedToken]);

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
    const handleAmountInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = event.target.value;
        setTokenAmount(value);

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
     * Handle wallet address input changes
     */
    const handleSetWalletAddress = (event: React.ChangeEvent<HTMLInputElement>) => {
        setWalletAddress(event.target.value);
    };

    /**
     * Handle max amount button click
     */
    const handleMaxAmount = () => {
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

        console.log("Submitting form with data:", data);

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

        // Reset transaction status to IDLE and open confirmation
        setTransactionStatus(TransactionStatus.IDLE);
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
                                    <FormLabel>{t("wallet.send.sendToken")}</FormLabel>
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
                                            onInputChange={(value) => setTokenAmount(value)}
                                            isUsd={false}
                                            token={selectedToken}
                                            onToggleUsd={() => {}}
                                            canConvert={selectedToken?.usdEquivalent ? true : false}
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

                        <div className="mt-5 mb-6 h-px bg-gray-200 w-full max-w-[97%] mx-auto" />

                        <div className="flex flex-col w-full gap-5">
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
                            size="lg"
                            disabled={isDisabled}
                            className={`mx-auto mt-auto mb-2 ${isDisabled ? "bg-disabledgreen" : ""}`}
                        >
                            {t("wallet.send.button")}
                        </FixedBottomButton>
                    </form>
                </Form>
            </div>

            {/* Toast notifications */}
            <TransactionToast
                open={toastData?.open ?? false}
                onOpenChange={hideToast}
                title={toastData?.title ?? ""}
                description={toastData?.description ?? ""}
                variant={toastData?.variant ?? "default"}
            />

            {/* Confirmation drawer */}
            <SendAssetConfirmationDrawer />

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
            />
        </div>
    );
};

export default SendPanel;
