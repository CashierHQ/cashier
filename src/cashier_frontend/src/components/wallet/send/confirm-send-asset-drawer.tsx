// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { FC, useState } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { SendAssetConfirmationPopupAssetsSection } from "./send-asset-confirmation-drawer-assets-section";
import { SendTransactionStatus } from "./send-transaction-status";
import { ConfirmationPopupLegalSection } from "@/components/confirmation-drawer/confirmation-drawer-legal-section";
import { useIdentity } from "@nfid/identitykit/react";
import { useSendAssetStore } from "@/stores/sendAssetStore";
import { TransactionStatus } from "@/services/types/wallet.types";
import { TokenUtilService } from "@/services/tokenUtils.service";
import { X } from "lucide-react";
import { toast } from "sonner";
import { useTokensV2 } from "@/hooks/token/useTokensV2";

export interface SendAssetConfirmationDrawerProps {
    onSuccessfulTransaction?: () => void;
}

export const SendAssetConfirmationDrawer: FC<SendAssetConfirmationDrawerProps> = ({
    onSuccessfulTransaction,
}) => {
    const { t } = useTranslation();
    const identity = useIdentity();

    // Use the new sendAssetStore
    const {
        sendAssetInfo,
        transactionStatus,
        error,
        isConfirmationOpen,
        setTransactionStatus,
        setError,
        closeConfirmation,
        setTransactionHash,
    } = useSendAssetStore();

    const [isUsd, setIsUsd] = useState(false);
    const [buttonText, setButtonText] = useState(t("transaction.confirm_popup.confirm_button"));
    const [isDisabled, setIsDisabled] = useState(false);
    const { updateTokenBalance } = useTokensV2();

    const onClickSubmit = async () => {
        // If transaction was successful, close the drawer
        if (transactionStatus === TransactionStatus.SUCCESS) {
            closeConfirmation();
            return;
        }

        // If we're starting a new transaction or retrying
        if (
            transactionStatus === TransactionStatus.IDLE ||
            transactionStatus === TransactionStatus.FAILED
        ) {
            // Set status to processing first (this updates UI)
            setTransactionStatus(TransactionStatus.PROCESSING);
            setButtonText(t("transaction.confirm_popup.inprogress_button"));
            setIsDisabled(true);

            try {
                if (!sendAssetInfo?.destinationAddress) {
                    throw new Error("Destination address is required");
                }

                const canisterUtils = new TokenUtilService(identity);

                const block_id = await canisterUtils.transferTo(
                    sendAssetInfo.destinationAddress,
                    sendAssetInfo.asset.address,
                    sendAssetInfo.amountNumber,
                );

                console.log("Transaction Hash:", block_id);
                setTransactionHash(block_id.toString());

                // Transaction succeeded
                setTransactionStatus(TransactionStatus.SUCCESS);
                setButtonText(t("transaction.confirm_popup.info.close"));
                setIsDisabled(false);

                // Show success toast
                toast.success(t("send_panel.confirm_popup.transaction.success.title"), {
                    description: t("send_panel.confirm_popup.transaction.success.message"),
                });

                // Update token balance and call success callback
                updateTokenBalance();
                if (onSuccessfulTransaction) {
                    onSuccessfulTransaction();
                }
            } catch (e) {
                console.error(e);
                setError(e as Error);

                // Transaction failed
                setTransactionStatus(TransactionStatus.FAILED);
                setButtonText(t("transaction.confirm_popup.retry_button"));
                setIsDisabled(false);

                // Show error toast
                toast.error(t("send_panel.confirm_popup.transaction.failed.title"), {
                    description: t("send_panel.confirm_popup.transaction.failed.message"),
                });
            }
        }
    };

    if (!sendAssetInfo) {
        return null;
    }

    return (
        <Drawer open={isConfirmationOpen}>
            <DrawerContent className="max-w-[400px] mx-auto p-3 rounded-t-[1.5rem]">
                <DrawerHeader>
                    <DrawerTitle className="relative flex items-center justify-center">
                        <div className="text-center text-xl">
                            {t("transaction.confirm_popup.title")}
                        </div>

                        <X
                            onClick={closeConfirmation}
                            className="absolute right-0 cursor-pointer"
                            size={42}
                        />
                    </DrawerTitle>
                </DrawerHeader>

                {transactionStatus === TransactionStatus.PROCESSING && (
                    <SendTransactionStatus status={TransactionStatus.PROCESSING} />
                )}

                {transactionStatus === TransactionStatus.SUCCESS && (
                    <SendTransactionStatus status={TransactionStatus.SUCCESS} />
                )}

                {(transactionStatus === TransactionStatus.IDLE ||
                    transactionStatus === TransactionStatus.FAILED) && (
                    <>
                        <div className="flex flex-col items-center justify-center mt-4 mb-6">
                            <div>You will send</div>
                            <div className="text-[2rem] font-semibold mt-2">
                                {sendAssetInfo.amountNumber} {sendAssetInfo.asset.symbol}
                            </div>
                        </div>

                        <SendAssetConfirmationPopupAssetsSection
                            sendAssetInfo={sendAssetInfo}
                            isUsd={isUsd}
                            onUsdClick={() => setIsUsd((old) => !old)}
                        />

                        <ConfirmationPopupLegalSection />
                    </>
                )}

                {error && (
                    <div className="my-3 p-3 bg-red-50 text-red-500 rounded-lg">
                        {error.message || "Transaction failed. Please try again."}
                    </div>
                )}

                <Button
                    className="my-3 mx-auto py-6 w-[95%] disabled:bg-disabledgreen"
                    disabled={isDisabled}
                    onClick={onClickSubmit}
                >
                    {buttonText}
                </Button>
            </DrawerContent>
        </Drawer>
    );
};
