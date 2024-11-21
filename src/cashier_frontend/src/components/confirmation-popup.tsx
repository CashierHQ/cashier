import React from "react";
import { DrawerContent, DrawerHeader, DrawerTitle } from "./ui/drawer";
import { Button } from "./ui/button";
import TransactionItem from "./transaction-item";
import { TRANSACTION_STATUS } from "@/services/types/transaction.service.types";
import { IoIosClose } from "react-icons/io";
import { useTranslation } from "react-i18next";

interface ConfirmationPopupProps {
    handleClose: () => void;
    handleConfirm: () => void;
    disabled: boolean;
    buttonText: string;
}

const ConfirmationPopup: React.FC<ConfirmationPopupProps> = ({
    handleClose,
    handleConfirm,
    disabled,
    buttonText,
}) => {
    const { t: translate } = useTranslation();

    return (
        <DrawerContent className="max-w-[400px] mx-auto p-3">
            <DrawerHeader>
                <DrawerTitle className="flex justify-center">
                    <div className="text-center">
                        {translate("transaction.confirm_popup.title")}
                    </div>
                    <IoIosClose
                        onClick={handleClose}
                        className="ml-auto cursor-pointer"
                        size={32}
                    />
                </DrawerTitle>
            </DrawerHeader>
            <div id="confirmation-popup-section" className="my-3">
                <div className="font-bold ml-2">
                    {translate("transaction.confirm_popup.receive_label")}
                </div>
                <div className="flex justify-between border-solid border-inherit border-2 rounded-lg p-2">
                    <div>Cashier Link</div>
                    <div>Mason's Tip link</div>
                </div>
            </div>
            <div id="confirmation-popup-section" className="my-3">
                <div className="font-bold ml-2">
                    {translate("transaction.confirm_popup.send_label")}
                </div>
                <div className="border-solid border-inherit border-2 rounded-lg p-2 divide-y divide-inherit">
                    <TransactionItem
                        title="Asset to add to link"
                        asset="1 ICP"
                        status={TRANSACTION_STATUS.PROCESSING}
                    />
                    <div className="mt-1">
                        <TransactionItem
                            title={translate("transaction.confirm_popup.cashier_fee_label")}
                            asset="1 ICP"
                            status={TRANSACTION_STATUS.FAILED}
                        />
                        <TransactionItem
                            title={translate("transaction.confirm_popup.network_fee_label")}
                            asset="1 ICP"
                            status={TRANSACTION_STATUS.SUCCESS}
                        />
                    </div>
                </div>
            </div>
            <Button disabled={disabled} onClick={handleConfirm}>
                {buttonText}
            </Button>
        </DrawerContent>
    );
};

export default ConfirmationPopup;
