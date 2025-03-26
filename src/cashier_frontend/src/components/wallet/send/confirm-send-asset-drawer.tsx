import { act, FC, useState } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { useTranslation } from "react-i18next";
import { IoIosClose } from "react-icons/io";
import { Button } from "@/components/ui/button";

import { useCreateLinkStore } from "@/stores/createLinkStore";
import { ACTION_STATE, ACTION_TYPE, INTENT_STATE } from "@/services/types/enum";
import {
    useIcrc112Execute,
    useProcessAction,
    useProcessActionAnonymous,
    useUpdateAction,
} from "@/hooks/linkHooks";
import { ActionModel } from "@/services/types/action.service.types";
import { isCashierError } from "@/services/errorProcess.service";
import { useIdentity } from "@nfid/identitykit/react";
import { ConfirmationPopupFeesSection } from "@/components/confirmation-drawer/confirmation-drawer-fees-section";
import { ConfirmationPopupLegalSection } from "@/components/confirmation-drawer/confirmation-drawer-legal-section";
import { ConfirmationPopupSkeleton } from "@/components/confirmation-drawer/confirmation-drawer-skeleton";
import {
    useCashierFeeIntents,
    useConfirmButtonState,
    usePrimaryIntents,
} from "@/components/confirmation-drawer/confirmation-drawer.hooks";
import { SendAssetConfirmationPopupAssetsSection } from "./send-asset-confirmation-drawer-assets-section";
import { SendTransactionStatus, WalletSendTransactionStatus } from "./send-transaction-status";
import CanisterUtilsService from "@/services/canisterUtils.service";

export interface SendAssetInfo {
    amountNumber: number;
    asset: {
        address: string;
        chain: string;
        decimals: number;
        symbol: string;
    };
    destinationAddress: string;
}

interface ConfirmationDrawerProps {
    open: boolean;
    sendAssetInfo?: SendAssetInfo;
    onClose?: () => void;
    onInfoClick?: () => void;
    onCashierError?: (error: Error) => void;
    onActionResult?: (action: ActionModel) => void;
    onSuccessContinue?: () => Promise<void>;
}

export const SendAssetConfirmationDrawer: FC<ConfirmationDrawerProps> = ({
    open,
    sendAssetInfo,
    onClose = () => {},
    onInfoClick = () => {},
    onActionResult = () => {},
    onCashierError = () => {},
    onSuccessContinue = async () => {},
}) => {
    const { t } = useTranslation();
    const { link, action, anonymousWalletAddress, setAction } = useCreateLinkStore();
    const identity = useIdentity();

    const [isUsd, setIsUsd] = useState(false);

    const { mutateAsync: processAction } = useProcessAction();
    const { mutateAsync: processActionAnonymous } = useProcessActionAnonymous(
        ACTION_TYPE.CLAIM_LINK,
    );

    const { mutateAsync: updateAction } = useUpdateAction();
    const { mutateAsync: icrc112Execute } = useIcrc112Execute();

    const primaryIntents = usePrimaryIntents(action?.intents);
    const cashierFeeIntents = useCashierFeeIntents(action?.intents);

    const { isDisabled, setIsDisabled, buttonText, setButtonText } = useConfirmButtonState(
        action?.state,
        t,
    );

    const onClickSubmit = async () => {
        console.log(action);
        setButtonText(t("transaction.confirm_popup.inprogress_button"));
        setIsDisabled(true);
        if (action?.state === ACTION_STATE.FAIL || action?.state === ACTION_STATE.CREATED) {
            action.state = ACTION_STATE.PROCESSING;
            setAction(action);
            try {
                const canisterUtils = new CanisterUtilsService(identity);
                if (!sendAssetInfo?.destinationAddress) {
                    throw new Error("Destination address is required");
                }
                await canisterUtils.transferTo(
                    sendAssetInfo.destinationAddress,
                    sendAssetInfo.asset.address,
                    Number(action?.intents[0].amount),
                );
                action.state = ACTION_STATE.SUCCESS;
                setAction(action);
                setButtonText(t("transaction.confirm_popup.info.close"));
            } catch (e) {
                console.log(e);
                action.state = ACTION_STATE.FAIL;
                setAction(action);
                setButtonText(t("transaction.confirm_popup.retry_button"));
                onCashierError(e as Error);
            } finally {
                setIsDisabled(false);
            }
        } else if (action?.state === ACTION_STATE.SUCCESS) {
            onSuccessContinue();
        }
    };

    return (
        <Drawer open={open}>
            <DrawerContent className="max-w-[400px] mx-auto p-3 rounded-t-[1.5rem]">
                <DrawerHeader>
                    <DrawerTitle className="relative flex items-center justify-center">
                        <div className="text-center text-xl">
                            {t("transaction.confirm_popup.title")}
                        </div>

                        <IoIosClose
                            onClick={onClose}
                            className="absolute right-0 cursor-pointer"
                            size={42}
                        />
                    </DrawerTitle>
                </DrawerHeader>

                {action ? (
                    <>
                        {action.state === ACTION_STATE.PROCESSING && (
                            <SendTransactionStatus status={action.state} />
                        )}

                        {action.state === ACTION_STATE.SUCCESS && (
                            <SendTransactionStatus status={action.state} />
                        )}

                        {action.state === ACTION_STATE.FAIL ||
                            (action.state === ACTION_STATE.CREATED && (
                                <>
                                    <div className="flex flex-col items-center justify-center mt-4 mb-6">
                                        <div>You will send</div>
                                        <div className="text-[2rem] font-semibold mt-2">
                                            {sendAssetInfo?.amountNumber}{" "}
                                            {sendAssetInfo?.asset.symbol}
                                        </div>
                                    </div>

                                    <SendAssetConfirmationPopupAssetsSection
                                        intents={primaryIntents}
                                        onInfoClick={onInfoClick}
                                        isUsd={isUsd}
                                        onUsdClick={() => setIsUsd((old) => !old)}
                                    />

                                    {cashierFeeIntents && cashierFeeIntents.length > 0 && (
                                        <ConfirmationPopupFeesSection
                                            intents={cashierFeeIntents}
                                            isUsd={isUsd}
                                        />
                                    )}

                                    <ConfirmationPopupLegalSection />
                                </>
                            ))}

                        <Button
                            className="my-3 mx-auto py-6 w-[95%]"
                            disabled={isDisabled}
                            onClick={onClickSubmit}
                        >
                            {buttonText}
                        </Button>
                    </>
                ) : (
                    <ConfirmationPopupSkeleton />
                )}
            </DrawerContent>
        </Drawer>
    );
};
