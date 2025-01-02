import React from "react";
import { DrawerContent, DrawerHeader, DrawerTitle } from "./ui/drawer";
import { Button } from "./ui/button";
import TransactionItem from "./transaction-item";
import { IoIosClose } from "react-icons/io";
import { useTranslation } from "react-i18next";
import { CreateIntentConsentModel } from "@/services/types/intent.service.types";
import { mapFeeModelToAssetModel } from "@/services/types/mapper/intent.service.mapper";
import { LINK_ASSET_TYPE } from "@/services/types/enum";

export type ConfirmTransactionModel = {
    linkName: string;
    feeModel: CreateIntentConsentModel;
};

interface ConfirmationPopupProps {
    data: ConfirmTransactionModel | undefined;
    handleClose: () => void;
    handleConfirm: () => void;
    disabled: boolean;
    buttonText: string;
}

const ConfirmationPopup: React.FC<ConfirmationPopupProps> = ({
    data,
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
                    <div className="text-center w-[100%]">
                        {translate("transaction.confirm_popup.title")}
                    </div>
                    <IoIosClose
                        onClick={handleClose}
                        className="ml-auto cursor-pointer"
                        size={32}
                    />
                </DrawerTitle>
            </DrawerHeader>
            <div id="confirmation-popup-section-receive" className="my-3">
                <div className="font-medium ml-2">
                    {translate("transaction.confirm_popup.receive_label")}
                </div>
                <div className="flex justify-between border-solid border-inherit border-2 rounded-lg p-2">
                    <div>Cashier Link</div>
                    <div>{data?.linkName}</div>
                </div>
            </div>
            <div id="confirmation-popup-section-send" className="my-3">
                <div className="font-medium ml-2">
                    {translate("transaction.confirm_popup.send_label")}
                </div>
                <div className="border-solid border-inherit border-2 rounded-lg p-2 divide-y divide-inherit">
                    {/* ---- LINK ASSET ---  */}
                    <TransactionItem
                        title="Asset to add to link"
                        assets={data?.feeModel.send.map((asset) => mapFeeModelToAssetModel(asset))}
                    />
                    <div className="mt-1">
                        {/* ---- CASHIER FEE ---  */}
                        <TransactionItem
                            title={translate("transaction.confirm_popup.cashier_fee_label")}
                            assets={[
                                mapFeeModelToAssetModel(
                                    data?.feeModel.fee.find(
                                        (f) => f.type === LINK_ASSET_TYPE.CASHIER_FEE,
                                    ),
                                ),
                            ]}
                        />
                        {/* ---- NETWORK FEE ---  */}
                        <TransactionItem
                            title={translate("transaction.confirm_popup.network_fee_label")}
                            assets={[mapFeeModelToAssetModel(data?.feeModel.send[0])]}
                            isNetWorkFee={true}
                        />
                    </div>
                </div>
            </div>
            <div id="confirmation-popup-section-total" className="mb-3">
                <TransactionItem
                    title={translate("transaction.confirm_popup.total_fee_label")}
                    assets={[
                        mapFeeModelToAssetModel(
                            data?.feeModel.fee.find((f) => f.type === LINK_ASSET_TYPE.CASHIER_FEE),
                        ),
                    ]}
                />
            </div>

            <div id="confirmation-popup-section-legal-text" className="mb-3">
                <div>{translate("transaction.confirm_popup.legal_text")}</div>
            </div>
            <Button disabled={disabled} onClick={handleConfirm}>
                {buttonText}
            </Button>
        </DrawerContent>
    );
};

export default ConfirmationPopup;
