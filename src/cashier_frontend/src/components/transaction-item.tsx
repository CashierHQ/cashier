import useTokenMetadataQuery from "@/hooks/useTokenMetadataQuery";
import { IC_EXPLORER_IMAGES_PATH } from "@/services/icExplorer.service";
import { convertDecimalBigIntToNumber } from "@/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FC, useMemo } from "react";
import { IoMdClose } from "react-icons/io";
import { IoMdCheckmark } from "react-icons/io";
import { TransactionModel } from "@/services/types/intent.service.types";
import { INTENT_STATE, TRANSACTION_STATE } from "@/services/types/enum";
import { useTranslation } from "react-i18next";

export type AssetModel = {
    address: string;
    amount: bigint;
    chain: string;
    transaction?: TransactionModel;
};

interface TransactionItemProps {
    title: string;
    asset: AssetModel | undefined;
    isLoading?: boolean;
    withNetworkFee?: boolean;
}

const TransactionItem: FC<TransactionItemProps> = ({ title, asset, isLoading }) => {
    const { t } = useTranslation();

    const { data: tokenData, isLoading: isLoadingMetadata } = useTokenMetadataQuery(asset?.address);

    const tokenSymbol = tokenData?.metadata.symbol;

    const [displayAmount, displayNetworkFee] = useMemo(() => {
        if (asset && tokenData) {
            const decimals = tokenData.metadata.decimals;
            const amount = asset.amount;
            const fee = tokenData.metadata.fee;

            return [
                convertDecimalBigIntToNumber(amount, decimals),
                convertDecimalBigIntToNumber(fee, decimals),
            ];
        } else {
            return [0, 0];
        }
    }, [asset, tokenData]);

    const renderTransactionState = () => {
        const transactionState = asset?.transaction?.state;

        switch (transactionState) {
            case INTENT_STATE.SUCCESS:
                return <IoMdCheckmark color="green" size={22} />;
            case INTENT_STATE.FAIL:
            case INTENT_STATE.TIMEOUT:
                return <IoMdClose color="red" size={22} />;
            case INTENT_STATE.PROCESSING:
                return <img src="/loading.gif" width={22} />;
            default:
                return <IoMdCheckmark color="green" size={22} className="opacity-0" />;
        }
    };

    const renderAsset = () => {
        return (
            <div className="flex justify-between items-center text-md leading-tight">
                <h5 id="transaction-title" className="ml-1.5 text-right">
                    {title}
                </h5>

                <div>
                    {isLoading || isLoadingMetadata ? (
                        <img src="/loading.gif" width={22} />
                    ) : (
                        <div className="flex items-center">
                            {`${displayAmount} ${tokenSymbol}`}
                            <Avatar className="w-7 h-7 ml-3">
                                <AvatarImage src={`${IC_EXPLORER_IMAGES_PATH}${asset?.address}`} />
                                <AvatarFallback>{tokenSymbol}</AvatarFallback>
                            </Avatar>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const renderNetworkFee = () => {
        return (
            <div className="flex justify-between text-xs leading-tight">
                <h6 id="transaction-title" className="ml-1.5 text-right">
                    {t("transaction.confirm_popup.network_fee_label")}
                </h6>

                <div className="flex">
                    {isLoading || isLoadingMetadata ? (
                        <img src="/loading.gif" width={22} />
                    ) : (
                        <div className="flex">
                            + {displayNetworkFee} {tokenSymbol}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div id="confirmation-transaction" className="flex items-center">
            <div>{renderTransactionState()}</div>

            <div className="flex flex-col w-full">
                {renderAsset()}
                {renderNetworkFee()}
            </div>
        </div>
    );
};

export default TransactionItem;
