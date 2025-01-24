import useTokenMetadataQuery from "@/hooks/useTokenMetadataQuery";
import { IC_EXPLORER_IMAGES_PATH } from "@/services/icExplorer.service";
import { convertDecimalBigIntToNumber } from "@/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FC, useEffect, useState } from "react";
import { IoMdClose } from "react-icons/io";
import { IoMdCheckmark } from "react-icons/io";
import { TransactionModel } from "@/services/types/intent.service.types";
import { TRANSACTION_STATE } from "@/services/types/enum";

export type AssetModel = {
    address: string;
    amount: bigint;
    chain: string;
    transaction?: TransactionModel;
};

interface TransactionItemProps {
    title: string;
    assets: (AssetModel | undefined)[] | undefined;
    state?: string;
    isNetWorkFee?: boolean;
    isLoading?: boolean;
}

const TransactionItem: FC<TransactionItemProps> = ({
    title,
    assets,
    state,
    isNetWorkFee,
    isLoading,
}) => {
    const [tokenSymbol, setTokenSymbol] = useState<string>("");
    const [displayAmount, setDisplayAmount] = useState<number>(0);
    const { data: tokenData, isLoading: isLoadingMetadata } = useTokenMetadataQuery(
        assets?.[0]?.address,
    );

    useEffect(() => {
        if (tokenData && assets?.[0]) {
            const amount = assets?.[0]?.amount;

            setDisplayAmount(
                convertDecimalBigIntToNumber(amount ?? BigInt(0), tokenData.metadata.decimals),
            );
            setTokenSymbol(tokenData.metadata.symbol ?? "");
        }
    }, [tokenData, assets, isNetWorkFee]);

    const renderTransactionState = (transactionState?: string) => {
        switch (transactionState) {
            case TRANSACTION_STATE.SUCCESS:
                return <IoMdCheckmark color="green" size={22} />;
            case TRANSACTION_STATE.FAIL:
            case TRANSACTION_STATE.TIMEOUT:
                return <IoMdClose color="red" size={22} />;
            case TRANSACTION_STATE.PROCESSING:
                return <img src="/loading.gif" width={22} />;
            default:
                return <IoMdCheckmark color="green" size={22} className="opacity-0 hidden" />;
        }
    };

    const assetItem = () => {
        return (
            <div className="flex">
                {`${displayAmount} ${tokenSymbol}`}
                <Avatar className="w-7 h-7 ml-3">
                    <AvatarImage src={`${IC_EXPLORER_IMAGES_PATH}${assets?.[0]?.address}`} />
                    <AvatarFallback>{tokenData?.metadata?.symbol}</AvatarFallback>
                </Avatar>
            </div>
        );
    };

    return (
        <div id="confirmation-transaction" className="flex justify-between my-2">
            <div className="flex">
                {renderTransactionState(assets?.[0]?.transaction?.state)}
                <div id="transaction-title" className="ml-3 text-right">
                    {title}
                </div>
            </div>
            <div>
                {isLoading || isLoadingMetadata ? (
                    <img src="/loading.gif" width={22} />
                ) : (
                    assetItem()
                )}
            </div>
        </div>
    );
};

export default TransactionItem;
