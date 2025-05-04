import { FC, useEffect, useState } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { useTranslation } from "react-i18next";
import { IoIosClose } from "react-icons/io";
import { Button } from "@/components/ui/button";
import { SendAssetConfirmationPopupAssetsSection } from "./send-asset-confirmation-drawer-assets-section";
import { SendTransactionStatus } from "./send-transaction-status";
import { ConfirmationPopupLegalSection } from "@/components/confirmation-drawer/confirmation-drawer-legal-section";
import { useIdentity } from "@nfid/identitykit/react";
import { useSendAssetStore } from "@/stores/sendAssetStore";
import { TransactionStatus } from "@/services/types/wallet.types";
import { TokenUtilService } from "@/services/tokenUtils.service";
import { useTokens } from "@/hooks/useTokens";
import { X } from "lucide-react";

export const SendAssetConfirmationDrawer: FC = () => {
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
    const { updateTokenBalance } = useTokens();

    // Update button text based on transaction status
    useEffect(() => {
        switch (transactionStatus) {
            case TransactionStatus.PROCESSING:
                setButtonText(t("transaction.confirm_popup.inprogress_button"));
                setIsDisabled(true);
                break;
            case TransactionStatus.SUCCESS:
                setButtonText(t("transaction.confirm_popup.info.close"));
                setIsDisabled(false);
                break;
            case TransactionStatus.FAILED:
                setButtonText(t("transaction.confirm_popup.retry_button"));
                setIsDisabled(false);
                break;
            default:
                setButtonText(t("transaction.confirm_popup.confirm_button"));
                setIsDisabled(false);
        }
    }, [transactionStatus, t]);

    const onClickSubmit = async () => {
        if (transactionStatus === TransactionStatus.SUCCESS) {
            closeConfirmation();
            return;
        }

        if (
            transactionStatus === TransactionStatus.IDLE ||
            transactionStatus === TransactionStatus.FAILED
        ) {
            setTransactionStatus(TransactionStatus.PROCESSING);

            try {
                if (!sendAssetInfo?.destinationAddress) {
                    throw new Error("Destination address is required");
                }

                console.log("Sending asset info:", sendAssetInfo);

                const canisterUtils = new TokenUtilService(identity);

                const block_id = await canisterUtils.transferTo(
                    sendAssetInfo.destinationAddress,
                    sendAssetInfo.asset.address,
                    sendAssetInfo.amountNumber,
                );

                // Generate a mock transaction hash - in a real app this would come from the blockchain
                console.log("Transaction Hash:", block_id);
                setTransactionHash(block_id.toString());
                setTransactionStatus(TransactionStatus.SUCCESS);

                updateTokenBalance();
            } catch (e) {
                console.error(e);
                setError(e as Error);
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
                    className="my-3 mx-auto py-6 w-[95%]"
                    disabled={isDisabled}
                    onClick={onClickSubmit}
                >
                    {buttonText}
                </Button>
            </DrawerContent>
        </Drawer>
    );
};
