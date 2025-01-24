import React, { useEffect, useMemo, useState } from "react";
import { DrawerContent, DrawerHeader, DrawerTitle } from "./ui/drawer";
import { Button } from "./ui/button";
import TransactionItem, { AssetModel } from "./transaction-item";
import { IoIosClose } from "react-icons/io";
import { useTranslation } from "react-i18next";
import { TransactionModel } from "@/services/types/intent.service.types";
import { mapIntentModelToAssetModel } from "@/services/types/mapper/intent.service.mapper";
import { TASK } from "@/services/types/enum";
import { TokenUtilService } from "@/services/tokenUtils.service";
import { Skeleton } from "./ui/skeleton";
import { ActionModel } from "@/services/types/refractor.action.service.types";
import { LinkModel } from "@/services/types/link.service.types";

export type ConfirmTransactionModel = {
    linkName: string;
    linkData: LinkModel;
    action: ActionModel;
    transactions?: TransactionModel[][];
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

    const mainIntents = useMemo(() => {
        return data?.action.intents.filter(
            (intent) => intent.task === TASK.TRANSFER_WALLET_TO_LINK,
        );
    }, [data?.action.intents]);

    const cashierFeeIntents = useMemo(() => {
        return data?.action.intents.filter(
            (intent) => intent.task === TASK.TRANSFER_WALLET_TO_TREASURY,
        );
    }, [data?.action.intents]);

    const processAllTheFees = async () => {
        // Network fee from sending assets
        const allFeesFromAssetSending = await processFeesFromAssetSending();
        // Network fee from Cashier fee
        const allFeesFromCashier = await processFeesFromCashierFee();

        //Merge all the fees and group by token
        const totalFees = allFeesFromAssetSending.concat(allFeesFromCashier);
        // Group by address and sum up the amounts
        const groupedTotalFees = groupFeesByAddress(totalFees);
        setTotalFees(groupedTotalFees);
    };

    // Get network fees from each asset sending and included them in total fees
    const processFeesFromAssetSending = async (): Promise<(AssetModel | undefined)[]> => {
        if (!mainIntents) return [];

        const totalFees: AssetModel[] = [];

        for (const intent of mainIntents) {
            const tokenMetadata = await TokenUtilService.getTokenMetadata(intent.asset.address);

            if (!tokenMetadata) continue;

            const networkFeeFromSendAsset: AssetModel = {
                address: intent.asset.address,
                amount: tokenMetadata.fee,
                chain: intent.asset.chain,
            };

            setNetworkFees((prevFees) => [...prevFees, networkFeeFromSendAsset]);

            totalFees.concat([
                mapIntentModelToAssetModel(intent, undefined)!,
                networkFeeFromSendAsset,
            ]);
        }

        return totalFees;
    };

    // Get network fees from cashier fee and included them in total fees
    const processFeesFromCashierFee = async (): Promise<(AssetModel | undefined)[]> => {
        if (!cashierFeeIntents) return [];

        const totalFees: (AssetModel | undefined)[] = [];

        for (const intent of cashierFeeIntents) {
            const tokenMetadata = await TokenUtilService.getTokenMetadata(intent.asset.address);

            if (!tokenMetadata) continue;

            const networkFeeFromSendAsset: AssetModel = {
                address: intent.asset.address,
                amount: intent.amount,
                chain: intent.asset.chain,
            };

            setNetworkFees((prevFees) => [...prevFees, networkFeeFromSendAsset]);

            totalFees.concat([
                mapIntentModelToAssetModel(intent, undefined)!,
                networkFeeFromSendAsset,
            ]);
        }

        return totalFees;
    };

    const groupFeesByAddress = (feeList: (AssetModel | undefined)[]): AssetModel[] => {
        const feeMap = new Map<string, AssetModel>();

        feeList.forEach((fee) => {
            if (fee) {
                const existingFee = feeMap.get(fee.address);
                if (existingFee) {
                    existingFee.amount += fee.amount;
                } else {
                    feeMap.set(fee.address, { ...fee });
                }
            }
        });

        return Array.from(feeMap.values());
    };

    useEffect(() => {
        const processFees = async () => {
            if (data && !networkFees.length && !totalFees.length) {
                await processAllTheFees();
                setLoading(false);
            }
        };
        processFees();
    }, [data]);

    const renderMainAssets = () => {
        return (
            <TransactionItem
                title="Asset to add to link"
                assets={mainIntents?.map((intent) =>
                    mapIntentModelToAssetModel(intent, data?.transactions),
                )}
                state={mainIntents![0].state}
            />
        );
    };

    const renderCashierFees = () => {
        return (
            <TransactionItem
                title={translate("transaction.confirm_popup.cashier_fee_label")}
                assets={[mapIntentModelToAssetModel(cashierFeeIntents![0], data?.transactions)]}
                state={cashierFeeIntents![0].state}
            />
        );
    };

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
                            <div className="ml-3">Cashier Link</div>
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
                            {renderMainAssets()}
                            <div className="mt-1">
                                {/* ---- CASHIER FEES ---  */}
                                {renderCashierFees()}
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
