import { AssetSelectItem } from "@/components/asset-select";
import { FixedBottomButton } from "@/components/fix-bottom-button";
import { IconInput } from "@/components/icon-input";
import { useUserAssets } from "@/components/link-details/tip-link-asset-form.hooks";
import TransactionToast from "@/components/transaction/transaction-toast";
import { BackHeader } from "@/components/ui/back-header";
import { Clipboard } from "lucide-react";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import {
    useWalletSendAssetForm,
    useWalletSendAssetFormActions,
    WalletSendAssetFormSchema,
} from "@/components/wallet/send/send-asset-form.hooks";
import { SendAssetConfirmationDrawer } from "@/components/wallet/send/confirm-send-asset-drawer";
import useTokenMetadata from "@/hooks/tokenUtilsHooks";
import useToast from "@/hooks/useToast";
import { CHAIN } from "@/services/types/enum";
import { useSendAssetStore } from "@/stores/sendAssetStore";
import { useIdentity } from "@nfid/identitykit/react";
import { ChangeEvent, useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { MdOutlineContentPaste } from "react-icons/md";
import { useNavigate, useParams } from "react-router-dom";
import { SelectToken } from "@/components/receive/SelectToken";
import { z } from "zod";
import { convertDecimalBigIntToNumber, convertTokenAmountToNumber } from "@/utils";
import {
    SendAssetConfirmationDrawer,
    SendAssetInfo,
} from "@/components/wallet/send/confirm-send-asset-drawer";
import { ActionModel } from "@/services/types/action.service.types";
import { useCreateLinkStore } from "@/stores/createLinkStore";
import { Separator } from "@/components/ui/separator";
import { TransactionStatus } from "@/services/types/transaction.service.types";

export default function SendTokenPage() {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const identity = useIdentity();
    const goBack = () => navigate("/wallet");
    const { tokenId } = useParams<{ tokenId?: string }>();
    const { metadata } = useTokenMetadata(tokenId);
    const { toastData, showToast, hideToast } = useToast();
    const { assets: tokenList } = useUserAssets();
    const [isDisabled, setIsDisabled] = useState(true);

    // Use the new sendAssetStore
    const {
        // sendAssetInfo,
        transactionStatus,
        // isConfirmationOpen,
        setSendAssetInfo,
        setTransactionStatus,
        openConfirmation,
        closeConfirmation,
        resetSendAsset,
        // resetError
    } = useSendAssetStore();

    const selectedToken = tokenList
        ? tokenId
            ? tokenList.find((token) => token.tokenAddress === tokenId) || {
                  name: metadata?.symbol || "",
                  tokenAddress: tokenId,
                  amount: 0,
              }
            : tokenList[0]
        : undefined;

    const form = useWalletSendAssetForm(tokenList ?? [], {
        tokenAddress: tokenId ?? "",
        amount: BigInt(0),
        assetNumber: 0,
    });

    // Add effect to update form when token changes
    useEffect(() => {
        if (selectedToken && !tokenId) {
            form.setValue("tokenAddress", selectedToken.tokenAddress);
            form.setValue("assetNumber", 0);
            form.setValue("walletAddress", "");
        }
    }, [selectedToken, tokenId, form]);

    // Add effect to control button disabled state
    useEffect(() => {
        const amount = form.getValues("assetNumber");
        const walletAddress = form.getValues("walletAddress");
        const hasAmountError = form.formState.errors.assetNumber !== undefined;

        setIsDisabled(!walletAddress || hasAmountError || !amount || amount <= 0);
    }, [form.watch("assetNumber"), form.watch("walletAddress"), form.formState.errors.assetNumber]);

    const handleTokenSelect = (token: AssetSelectItem) => {
        navigate(`/wallet/send/${token.tokenAddress}`);
    };

    const [addressType, setAddressType] = useState<"principal" | "account">("principal");

    const { setTokenAmount, setWalletAddress } = useWalletSendAssetFormActions(form);

    const handleAmountInputChange = (event: ChangeEvent<HTMLInputElement>) => {
        const value = event.target.value;
        setTokenAmount(value);

        // Validate amount against available balance (considering network fee)
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

    const handleSetWalletAddress = (event: ChangeEvent<HTMLInputElement>) => {
        const value = event.target.value;
        setWalletAddress(value);
    };

    const getMaxAvailableAmount = useMemo(() => {
        if (
            selectedToken?.amount !== undefined &&
            metadata?.fee !== undefined &&
            metadata.decimals !== undefined
        ) {
            const tokenAmount = Number(selectedToken.amount);
            // Convert fee using the token's decimals
            const feeAmount = Number(metadata.fee) / 10 ** metadata.decimals;
            const maxAvailable = Math.max(0, tokenAmount - feeAmount);
            return maxAvailable;
        }
        return Number(selectedToken?.amount ?? 0);
    }, [selectedToken?.amount, metadata?.fee, metadata?.decimals]);

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

    const onSubmitSend = async (data: WalletSendAssetFormSchema) => {
        // Build send asset info for the store
        setSendAssetInfo({
            amountNumber: data.assetNumber ?? 0,
            asset: {
                address: selectedToken?.tokenAddress ?? "",
                chain: CHAIN.IC,
                symbol: metadata?.symbol ?? "",
                decimals: metadata?.decimals ?? 8,
                // logo: selectedToken?.logo
            },
            destinationAddress: data.walletAddress,
            // Optionally add fee information if available
            feeAmount: metadata?.fee
                ? Number(metadata.fee) / 10 ** (metadata?.decimals ?? 8)
                : undefined,
            feeSymbol: metadata?.symbol,
        });

        // Reset transaction status to IDLE and open confirmation
        setTransactionStatus(TransactionStatus.IDLE);
        openConfirmation();
    };

    useEffect(() => {
        // Show toast messages based on transaction status
        if (transactionStatus === TransactionStatus.FAILED) {
            showToast(
                t("transaction.confirm_popup.transaction_failed"),
                t("transaction.confirm_popup.transaction_failed_message"),
                "error",
            );
        } else if (transactionStatus === TransactionStatus.SUCCESS) {
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
        }
    }, [transactionStatus]);

    const handlePasteClick = async (field: { onChange: (value: string) => void }) => {
        try {
            // Check principal format
            const text = await navigator.clipboard.readText();
            field.onChange(text);
        } catch (err) {
            console.error("Failed to read clipboard contents: ", err);
        }
    };

    const ICP_ADDRESS = "ryjl3-tyaaa-aaaaa-aaaba-cai";

    const isIcpToken = selectedToken?.tokenAddress === ICP_ADDRESS;

    return (
        <div className="h-full overflow-auto px-2 py-2">
            <BackHeader onBack={goBack}>
                <h1 className="text-lg font-semibold">{t("wallet.send.header")}</h1>
            </BackHeader>
            <div id="content" className="my-5">
                <>
                    <Form {...form}>
                        <form
                            onSubmit={form.handleSubmit((data) => {
                                onSubmitSend(data);
                            })}
                            className="mb-[100px]"
                        >
                            <FormField
                                name="tokenAddress"
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

                            <Separator className="mt-5 mb-6 max-w-[97%] mx-auto" />

                            <div className="flex flex-col w-full gap-5">
                                <FormField
                                    control={form.control}
                                    name={"assetNumber"}
                                    render={({ field }) => (
                                        <FormItem>
                                            <div className="flex gap-2 items-center mb-2">
                                                <FormLabel>{t("create.amount")}</FormLabel>
                                                {selectedToken?.amount !== undefined && (
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

                                <FormField
                                    control={form.control}
                                    name={"walletAddress"}
                                    render={({ field }) => (
                                        <FormItem>
                                            <div className="flex justify-between items-center mb-2">
                                                <FormLabel>
                                                    {t("wallet.send.destinationAddress")}
                                                </FormLabel>
                                            </div>
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
                                                    step="any"
                                                    placeholder={
                                                        isIcpToken
                                                            ? `Enter ${addressType === "principal" ? "Principal" : "Account"} ID`
                                                            : "Enter address"
                                                    }
                                                    isCurrencyInput={false}
                                                    rightIcon={
                                                        <Clipboard color="#36A18B" size={20} />
                                                    }
                                                    onRightIconClick={() => handlePasteClick(field)}
                                                    {...field}
                                                    value={form.getValues("walletAddress") ?? ""}
                                                    onChange={handleSetWalletAddress}
                                                    className="pl-3 py-5 font-light rounded-lg appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none shadow-xs border border-input"
                                                />
                                            </FormControl>
                                            <FormMessage />
                                            {isIcpToken ? (
                                                addressType === "principal" ? (
                                                    <div className="text-xs text-grey/60">
                                                        {" "}
                                                        Example:
                                                        sahxn-t2vpk-p7m3p-hjg6j-juc2w-iyxh6-...
                                                    </div>
                                                ) : (
                                                    <div className="text-xs text-grey/60">
                                                        {" "}
                                                        Example:
                                                        6cff4a63eae8621c3dbc1040e6d25136e207b0b...
                                                    </div>
                                                )
                                            ) : (
                                                <div className="text-xs text-grey/60">
                                                    Example:
                                                    6cff4a63eae8621c3dbc1040e6d25136e207b0b...
                                                </div>
                                            )}
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <FixedBottomButton
                                type="submit"
                                variant="default"
                                size="lg"
                                disabled={isDisabled}
                                className="fixed bottom-[30px] left-1/2 -translate-x-1/2"
                            >
                                {t("continue")}
                            </FixedBottomButton>
                        </form>
                    </Form>
                </>
            </div>

            <TransactionToast
                open={toastData?.open ?? false}
                onOpenChange={hideToast}
                title={toastData?.title ?? ""}
                description={toastData?.description ?? ""}
                variant={toastData?.variant ?? "default"}
            />

            {/* Use the updated SendAssetConfirmationDrawer with the new store */}
            <SendAssetConfirmationDrawer />
        </div>
    );
}
