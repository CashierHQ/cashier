import useTokenMetadataQuery from "@/hooks/useTokenMetadataQuery";
import { IC_EXPLORER_IMAGES_PATH } from "@/services/icExplorer.service";
import { TRANSACTION_STATE } from "@/services/types/transaction.service.types";
import { convertDecimalBigIntToNumber } from "@/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FC, useEffect, useState } from "react";
import { FiRefreshCw } from "react-icons/fi";
import { IoMdClose } from "react-icons/io";
import { IoMdCheckmark } from "react-icons/io";

export type AssetModel = {
    address: string;
    amount: bigint;
    chain: string;
};

interface TransactionItemProps {
    title: string;
    assets: (AssetModel | undefined)[] | undefined;
    state?: string;
    isNetWorkFee?: boolean;
}

const TransactionItem: FC<TransactionItemProps> = (props) => {
    const [tokenSymbol, setTokenSymbol] = useState<string>("");
    const [displayAmount, setDisplayAmount] = useState<number>(0);
    const { data: metadata, isLoading } = useTokenMetadataQuery(props?.assets?.[0]?.address);

    useEffect(() => {
        if (metadata && props.assets?.[0]) {
            const amount = props.assets?.[0]?.amount;
            setDisplayAmount(convertDecimalBigIntToNumber(amount ?? BigInt(0), metadata.decimals));
            setTokenSymbol(metadata?.symbol ?? "");
        }
    }, [metadata, props.assets, props.isNetWorkFee]);

    const renderTransactionState = (transactionState?: string) => {
        switch (transactionState) {
            case TRANSACTION_STATE.SUCCESS:
                return <IoMdCheckmark color="green" size={22} />;
            case TRANSACTION_STATE.FAILED:
                return <IoMdClose color="red" size={22} />;
            case TRANSACTION_STATE.PROCESSING:
                return <FiRefreshCw size={20} />;
            default:
                return null;
        }
    };

    const assetItem = () => (
        <div className="flex">
            {`${displayAmount} ${tokenSymbol}`}
            <Avatar className="w-7 h-7 ml-3">
                <AvatarImage src={`${IC_EXPLORER_IMAGES_PATH}${props?.assets?.[0]?.address}`} />
                <AvatarFallback>{metadata?.symbol}</AvatarFallback>
            </Avatar>
        </div>
    );

    return (
        <div id="confirmation-transaction" className="flex justify-between my-3">
            <div className="flex">
                <div id="transaction-title" className="mr-3">
                    {props.title}
                </div>
                {renderTransactionState(props.state)}
            </div>
            <div>{isLoading ? <FiRefreshCw size={20} /> : assetItem()}</div>
        </div>
    );
};

export default TransactionItem;
