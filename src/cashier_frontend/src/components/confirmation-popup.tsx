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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { IC_EXPLORER_IMAGES_PATH } from "@/services/icExplorer.service";
import { ArrowUpDown, Info } from "lucide-react";
import { convertDecimalBigIntToNumber } from "@/utils";
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
        console.log(groupFeesByAddress(networkFees));
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

    const processTotalFeesDisplayAmount = async (fees: AssetModel[]) => {
        const feesDecimals = await Promise.all(
            fees.map(async (fee) => {
                const metadata = await TokenUtilService.getTokenMetadata(fee.address);

                if (!metadata) {
                    return 0;
                }

                return convertDecimalBigIntToNumber(fee.amount, metadata.decimals);
            }),
        );

        return feesDecimals;
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

    const renderAssets = () => {
        const assets = data?.feeModel.send ?? [];
        const transactions = data?.transactions;

        return (
            <div className="flex flex-col gap-3 border-solid border-inherit border-2 rounded-lg p-4 overflow-y-auto max-h-[200px]">
                {assets.map((asset, index) => (
                    <TransactionItem
                        key={`asset-${index}`}
                        title={translate("transaction.confirm_popup.asset_label")}
                        asset={mapFeeModelToAssetModel(asset, transactions)}
                    />
                ))}
            </div>
        );
    };

    const renderFees = () => {
        const cashierFee = data?.feeModel.fee[0];
        const displayAmount = totalFeesDisplayAmount[0];

        if (!cashierFee || !displayAmount) {
            return null;
        }

        return (
            <div className="flex flex-col gap-3 rounded-lg p-4 bg-lightgreen">
                <TransactionItem
                    title={translate("transaction.confirm_popup.link_creation_fee_label")}
                    asset={mapFeeModelToAssetModel(cashierFee, undefined)}
                />

                <hr className="border border-white" />

                <div className="flex justify-between text-lg">
                    <h4>{translate("transaction.confirm_popup.total_cashier_fees_label")}</h4>

                    <div className="flex items-center">
                        {`${displayAmount} ICP`}
                        <Avatar className="w-7 h-7 ml-3">
                            <AvatarImage src={`${IC_EXPLORER_IMAGES_PATH}${cashierFee?.address}`} />
                            <AvatarFallback>ICP</AvatarFallback>
                        </Avatar>
                    </div>
                </div>
            </div>
        );
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
                    <section id="confirmation-popup-section-receive" className="my-3">
                        <h2 className="font-medium ml-2">
                            {translate("transaction.confirm_popup.receive_label")}
                        </h2>

                        <div className="flex justify-between border-solid border-inherit border-2 rounded-lg p-4">
                            <div className="flex">
                                <img
                                    src="./smallLogo.svg"
                                    alt="Cashier logo"
                                    className="max-w-[20px]"
                                />
                                <h3 className="ml-3">Cashier Link</h3>
                            </div>

                            <span>{data?.linkName}</span>
                        </div>
                    </section>

                    <section id="confirmation-popup-section-send" className="my-3">
                        <div className="flex justify-between">
                            <div className="flex items-center">
                                <h2 className="font-medium ml-2">
                                    {translate("transaction.confirm_popup.send_label")}
                                </h2>

                                <Info className="text-destructive ml-1.5" size={16} />
                            </div>

                            <div className="flex text-destructive">
                                USD
                                <button onClick={() => console.log("info click")}>
                                    <ArrowUpDown className="ml-1" size={16} />
                                </button>
                            </div>
                        </div>

                        {renderAssets()}
                    </section>

                    <section id="confirmation-popup-section-total" className="mb-3">
                        {renderFees()}
                    </section>

                    <section id="confirmation-popup-section-legal-text" className="mb-3">
                        <p>{translate("transaction.confirm_popup.legal_text")}</p>
                    </section>

                    <Button disabled={disabled} onClick={handleConfirm}>
                        {buttonText}
                    </Button>
                </>
            )}
        </DrawerContent>
    );
};

export default ConfirmationPopup;
