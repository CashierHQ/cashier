import React, { useEffect, useState } from "react";
import { DrawerContent, DrawerHeader, DrawerTitle } from "./ui/drawer";
import { Button } from "./ui/button";
import TransactionItem, { AssetModel } from "./transaction-item";
import { IoIosClose } from "react-icons/io";
import { useTranslation } from "react-i18next";
import { CreateIntentConsentModel, TransactionModel } from "@/services/types/intent.service.types";
import { mapFeeModelToAssetModel } from "@/services/types/mapper/intent.service.mapper";
import { LINK_ASSET_TYPE } from "@/services/types/enum";
import { TokenUtilService } from "@/services/tokenUtils.service";
import { Skeleton } from "./ui/skeleton";

export type ConfirmTransactionModel = {
    linkName: string;
    feeModel: CreateIntentConsentModel;
    transactions?: TransactionModel[];
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
    const [networkFees, setNetworkFees] = useState<AssetModel[]>([]);
    const [totalFees, setTotalFees] = useState<(AssetModel | undefined)[]>([]);
    const [isLoading, setLoading] = useState<boolean>(true);

    const processAllTheFees = async () => {
        // Network fee from sending assets
        const allFeesFromAssetSending = await processFeesFromAssetSending();
        // Network fee from Cashier fee
        const allFeesFromCashier = await processFeesFromCashierFee();

        //Merge all the fees and group by token
        const totalFees = allFeesFromAssetSending.concat(allFeesFromCashier);

        // Group by address and sum up the amounts
        const feeMap = new Map<string, AssetModel>();
        totalFees.forEach((fee) => {
            if (fee) {
                const existingFee = feeMap.get(fee.address);
                if (existingFee) {
                    existingFee.amount += fee.amount;
                } else {
                    feeMap.set(fee.address, { ...fee });
                }
            }
        });

        const groupedTotalFees = Array.from(feeMap.values());
        setTotalFees(groupedTotalFees);
    };

    // Get network fees from each asset sending and included them in total fees
    const processFeesFromAssetSending = async (): Promise<(AssetModel | undefined)[]> => {
        let totalFees: (AssetModel | undefined)[] = [];
        if (data?.feeModel?.send?.length) {
            for (let i = 0; i < data?.feeModel.send.length; i++) {
                const tokenMetadata = await TokenUtilService.getTokenMetadata(
                    data?.feeModel.send[i].address,
                );
                if (tokenMetadata) {
                    const networkFeeFromSendAsset: AssetModel = {
                        address: data?.feeModel.send[i].address,
                        amount: tokenMetadata.fee,
                        chain: data?.feeModel.send[i].chain,
                    };
                    totalFees = totalFees.concat([
                        mapFeeModelToAssetModel(data?.feeModel.send[i], undefined),
                        networkFeeFromSendAsset,
                    ]);
                    setNetworkFees((prevFees) => [...prevFees, networkFeeFromSendAsset]);
                }
            }
        }
        return totalFees;
    };

    // Get network fees from cashier fee and included them in total fees
    const processFeesFromCashierFee = async (): Promise<(AssetModel | undefined)[]> => {
        let totalFees: (AssetModel | undefined)[] = [];
        if (data?.feeModel.fee[0].address) {
            const cashierFeeTokenMetadata = await TokenUtilService.getTokenMetadata(
                data?.feeModel.fee[0].address,
            );
            if (cashierFeeTokenMetadata) {
                const networkFeeFromCashierFee: AssetModel = {
                    address: data?.feeModel.fee[0].address,
                    amount: cashierFeeTokenMetadata.fee,
                    chain: data?.feeModel.fee[0].chain,
                };
                totalFees = totalFees.concat([
                    mapFeeModelToAssetModel(data?.feeModel.fee[0], undefined),
                    networkFeeFromCashierFee,
                ]);
                setNetworkFees((prevFees) => [...prevFees, networkFeeFromCashierFee]);
            }
        }
        return totalFees;
    };

    useEffect(() => {
        const fetchNetworkFees = async () => {
            if (data && !networkFees.length && !totalFees.length) {
                await processAllTheFees();
            }
        };
        fetchNetworkFees();
    }, [data]);

    const renderNetworkFees = () => {
        if (networkFees.length > 0) {
            return networkFees?.map((fee, index) => (
                <TransactionItem
                    key={`networkfee-${index}`}
                    title={translate("transaction.confirm_popup.network_fee_label")}
                    assets={[fee]}
                    isNetWorkFee={true}
                />
            ));
        }
    };

    const renderTotalFees = () => {
        if (networkFees.length > 0) {
            return totalFees?.map((fee, index) => (
                <TransactionItem
                    key={`totalfee-${index}`}
                    title={translate("transaction.confirm_popup.total_fee_label")}
                    assets={[fee]}
                />
            ));
        }
    };

    useEffect(() => {
        if (networkFees.length > 0 && totalFees.length > 0) {
            setLoading(false);
        }
    }, [networkFees, totalFees]);

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
            {isLoading ? (
                Array.from({ length: 5 }).map((_, index) => (
                    <div className="flex items-center space-x-4 my-3" key={index}>
                        <Skeleton className="h-10 w-10 rounded-sm" />
                        <div className="space-y-2">
                            <Skeleton className="h-3 w-[75vw] max-w-[320px]" />
                            <Skeleton className="h-3 w-[200px]" />
                        </div>
                    </div>
                ))
            ) : (
                <>
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
                        <div
                            className="border-solid border-inherit border-2 rounded-lg p-2 divide-y divide-inherit"
                            style={{ maxHeight: "200px", overflowY: "auto" }}
                        >
                            {/* ---- LINK ASSET ---  */}
                            <TransactionItem
                                title="Asset to add to link"
                                assets={data?.feeModel.send.map((asset) =>
                                    mapFeeModelToAssetModel(asset, data?.transactions),
                                )}
                            />
                            <div className="mt-1">
                                {/* ---- CASHIER FEES ---  */}
                                <TransactionItem
                                    title={translate("transaction.confirm_popup.cashier_fee_label")}
                                    assets={[
                                        mapFeeModelToAssetModel(
                                            data?.feeModel.fee.find(
                                                (f) => f.type === LINK_ASSET_TYPE.CASHIER_FEE,
                                            ),
                                            data?.transactions,
                                        ),
                                    ]}
                                />
                                {/* ---- NETWORK FEES ---  */}
                                {renderNetworkFees()}
                            </div>
                        </div>
                    </div>
                    <div id="confirmation-popup-section-total" className="mb-3">
                        {/* ---- TOTAL FEES ---  */}
                        {renderTotalFees()}
                    </div>

                    <div id="confirmation-popup-section-legal-text" className="mb-3">
                        <div>{translate("transaction.confirm_popup.legal_text")}</div>
                    </div>
                    <Button disabled={disabled} onClick={handleConfirm}>
                        {buttonText}
                    </Button>
                </>
            )}
        </DrawerContent>
    );
};

export default ConfirmationPopup;
