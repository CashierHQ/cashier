import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Clipboard } from "lucide-react";

// UI Components
import { SelectToken } from "@/components/receive/SelectToken";
import { FixedBottomButton } from "@/components/fix-bottom-button";
import { IconInput } from "@/components/icon-input";
import { BackHeader } from "@/components/ui/back-header";
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

// Hooks
import { useResponsive } from "@/hooks/responsive-hook";
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

export default function SendTokenPage() {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const responsive = useResponsive();
    const { tokenId } = useParams<{ tokenId?: string }>();
    const goBack = () => navigate("/wallet");

    // Hooks for UI state
    const { toastData, showToast, hideToast } = useToast();
    const [isDisabled, setIsDisabled] = useState(true);

    // Get tokens from useTokens hook
    const { filteredTokens, refreshBalances, isLoadingBalances } = useTokens();

    // Get transaction state from store
    const {
        transactionStatus,
        setSendAssetInfo,
        setTransactionStatus,
        openConfirmation,
        closeConfirmation,
        resetSendAsset,
    } = useSendAssetStore();

    // Refresh balances when component mounts
    useEffect(() => {
        refreshBalances();
    }, [refreshBalances]);

    // Find and map the selected token
    const selectedToken = useMemo(() => {
        if (!filteredTokens || filteredTokens.length === 0) {
            return tokenId
                ? {
                      name: "",
                      symbol: "",
                      address: tokenId,
                      amount: BigInt(0),
                      chain: "IC",
                      decimals: 8,
                      id: tokenId,
                      fee: undefined,
                  }
                : undefined;
        }

        if (tokenId) {
            const found = filteredTokens.find((token) => token.address === tokenId);
            if (found) return found;

            // If not found but tokenId exists, create placeholder
            return {
                name: "",
                symbol: "",
                address: tokenId,
                amount: BigInt(0),
                chain: "IC",
                decimals: 8,
                id: tokenId,
                fee: undefined,
            };
        }

        // Default to first token if no tokenId
        return filteredTokens[0];
    }, [filteredTokens, tokenId]);

    // Init form
    const form = useWalletSendAssetForm(filteredTokens, {
        address: tokenId ?? "",
        amount: BigInt(0),
        assetNumber: 0,
    });

    // Form action handlers
    const { setTokenAmount, setWalletAddress } = useWalletSendAssetFormActions(form);

    // Update form when token changes
    useEffect(() => {
        if (selectedToken && !tokenId) {
            form.setValue("address", selectedToken.address);
            form.setValue("assetNumber", 0);
            form.setValue("walletAddress", "");
        }
    }, [selectedToken, tokenId, form]);

    // Track form validation state
    useEffect(() => {
        const amount = form.getValues("assetNumber");
        const walletAddress = form.getValues("walletAddress");
        const hasAmountError = form.formState.errors.assetNumber !== undefined;

        setIsDisabled(!walletAddress || hasAmountError || !amount || amount <= 0);
    }, [form.watch("assetNumber"), form.watch("walletAddress"), form.formState.errors.assetNumber]);

    // Calculate max available amount (balance minus network fee)
    const getMaxAvailableAmount = useMemo(() => {
        if (
            selectedToken?.amount !== undefined &&
            selectedToken.fee !== undefined &&
            selectedToken.decimals !== undefined
        ) {
            const tokenAmount = Number(selectedToken.amount) / 10 ** selectedToken.decimals;
            const feeAmount = Number(selectedToken.fee) / 10 ** selectedToken.decimals;
            const maxAvailable = Math.max(0, tokenAmount - feeAmount);
            return maxAvailable;
        }

        // If no fee defined, just return the amount
        if (selectedToken?.amount !== undefined && selectedToken.decimals !== undefined) {
            return Number(selectedToken.amount) / 10 ** selectedToken.decimals;
        }

        return 0;
    }, [selectedToken]);

    // Handle input changes
    const handleAmountInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = event.target.value;
        setTokenAmount(value);

        // Validate amount against available balance
        const numericValue = parseFloat(value);
        if (!isNaN(numericValue)) {
            if (numericValue > getMaxAvailableAmount) {
                form.setError("assetNumber", {
                    type: "manual",
                    message: `Amount must be less than available balance (${getMaxAvailableAmount})`,
                });
            } else {
                form.clearErrors("assetNumber");
            }
        }
    };

    const handleSetWalletAddress = (event: React.ChangeEvent<HTMLInputElement>) => {
        setWalletAddress(event.target.value);
    };

    // Handle max amount button click
    const handleMaxAmount = () => {
        if (getMaxAvailableAmount > 0) {
            setTokenAmount(getMaxAvailableAmount.toString());
            form.clearErrors("assetNumber");
        } else {
            form.setError("assetNumber", {
                type: "manual",
                message: "Insufficient balance to cover amount plus network fee",
            });
        }
    };

    // Clear amount error when token changes
    useEffect(() => {
        form.clearErrors("assetNumber");
    }, [selectedToken]);

    // Handle token selection
    const handleTokenSelect = (token: FungibleToken) => {
        navigate(`/wallet/send/${token.address}`);
    };

    // Handle form submission
    const onSubmitSend = async (data: WalletSendAssetFormSchema) => {
        // Build send asset info for the store
        setSendAssetInfo({
            amountNumber: data.assetNumber ?? 0,
            asset: {
                address: selectedToken?.address ?? "",
                chain: CHAIN.IC,
                symbol: selectedToken?.symbol ?? "",
                decimals: selectedToken?.decimals ?? 8,
            },
            destinationAddress: data.walletAddress,
            feeAmount: selectedToken?.fee
                ? Number(selectedToken.fee) / 10 ** (selectedToken?.decimals ?? 8)
                : undefined,
            feeSymbol: selectedToken?.symbol,
        });

        // Reset transaction status to IDLE and open confirmation
        setTransactionStatus(TransactionStatus.IDLE);
        openConfirmation();
    };

    // Handle transaction status changes
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

                // Close the confirmation drawer after success
                setTimeout(() => {
                    closeConfirmation();
                    resetSendAsset();
                }, 1500);
                break;
        }
    }, [transactionStatus, t, closeConfirmation, resetSendAsset, showToast]);

    // Handle clipboard paste
    const handlePasteClick = async (field: { onChange: (value: string) => void }) => {
        try {
            const text = await navigator.clipboard.readText();
            field.onChange(text);
        } catch (err) {
            console.error("Failed to read clipboard contents: ", err);
        }
    };

    // Check if token is ICP
    const ICP_ADDRESS = "ryjl3-tyaaa-aaaaa-aaaba-cai";
    const isIcpToken = selectedToken?.address === ICP_ADDRESS;
    const [addressType, setAddressType] = useState<"principal" | "account">("principal");

    return (
        <div
            className={`flex flex-col ${responsive.isSmallDevice ? "px-2 py-4 h-full" : "max-w-[700px] mx-auto bg-white max-h-[80%] mt-12 rounded-xl shadow-sm p-4"}`}
        >
            <BackHeader onBack={goBack}>
                <h1 className="text-lg font-semibold">{t("wallet.send.header")}</h1>
            </BackHeader>

            <div id="content" className="my-5 h-full">
                <Form {...form}>
                    <form
                        onSubmit={form.handleSubmit(onSubmitSend)}
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
                                        <SelectToken
                                            selectedToken={selectedToken}
                                            onSelect={handleTokenSelect}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="mt-5 mb-6 h-px bg-gray-200 w-full max-w-[97%] mx-auto" />

                        <div className="flex flex-col w-full gap-5">
                            {/* Amount Input */}
                            <FormField
                                control={form.control}
                                name="assetNumber"
                                render={({ field }) => (
                                    <FormItem>
                                        <div className="flex gap-2 items-center mb-2">
                                            <FormLabel>{t("create.amount")}</FormLabel>
                                            {selectedToken?.fee !== undefined && (
                                                <div className="text-xs text-grey/60">
                                                    (includes network fee)
                                                </div>
                                            )}
                                        </div>
                                        <FormControl>
                                            <IconInput
                                                type="number"
                                                placeholder="Enter amount"
                                                step="any"
                                                isCurrencyInput={false}
                                                rightIcon={
                                                    <div className="font-semibold text-[#36A18B]">
                                                        {t("wallet.send.max")}
                                                    </div>
                                                }
                                                onRightIconClick={handleMaxAmount}
                                                {...field}
                                                value={form.getValues("assetNumber") ?? ""}
                                                onChange={handleAmountInputChange}
                                                className="pl-3 py-5 text-md rounded-lg appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none shadow-xs border border-input"
                                                disabled={isLoadingBalances}
                                            />
                                        </FormControl>
                                        <div className="flex justify-between items-center">
                                            <div className="text-xs text-grey/60">≈ $0.00</div>
                                            {selectedToken?.amount !== undefined && (
                                                <div className="text-xs text-grey/60">
                                                    Available: {getMaxAvailableAmount}
                                                </div>
                                            )}
                                        </div>
                                        <FormMessage className="text-[#36A18B]" />
                                    </FormItem>
                                )}
                            />

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
                                                    onClick={() => setAddressType("principal")}
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
                                                    onClick={() => setAddressType("account")}
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
                                                className="pl-3 py-5 font-light rounded-lg appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none shadow-xs border border-input"
                                            />
                                        </FormControl>

                                        <FormMessage />

                                        {/* Address examples */}
                                        <div className="text-xs text-grey/60">
                                            {isIcpToken && addressType === "principal"
                                                ? "Example: sahxn-t2vpk-p7m3p-hjg6j-juc2w-iyxh6-..."
                                                : isIcpToken && addressType === "account"
                                                  ? "Example: 6cff4a63eae8621c3dbc1040e6d25136e207b0b..."
                                                  : "Example: 6cff4a63eae8621c3dbc1040e6d25136e207b0b..."}
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
                            className={`mx-auto ${responsive.isSmallDevice ? "mt-auto" : "mt-12"}`}
                        >
                            {t("continue")}
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
        </div>
    );
}
