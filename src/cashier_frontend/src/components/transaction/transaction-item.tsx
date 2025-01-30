import useTokenMetadataQuery from "@/hooks/useTokenMetadataQuery";
import { convertDecimalBigIntToNumber } from "@/utils";
import { FC, useEffect, useState } from "react";
import { IoMdClose } from "react-icons/io";
import { IoMdCheckmark } from "react-icons/io";
import { INTENT_STATE } from "@/services/types/enum";
import { IntentModel } from "@/services/types/refractor.intent.service.types";
import { TransactionAsset } from "./transaction-asset";
import { TransactionNetworkFee } from "./transaction-network-fee";

interface TransactionItemProps {
    title: string;
    intent: IntentModel;
    isLoading?: boolean;
}

export const TransactionItem: FC<TransactionItemProps> = ({ title, intent, isLoading }) => {
    const [tokenSymbol, setTokenSymbol] = useState<string>();
    const [displayAmount, setDisplayAmount] = useState<number>();
    const [displayNetworkFee, setDisplayNetworkFee] = useState<number>();

    const {
        data: tokenData,
        isLoading: isLoadingMetadata,
        isSuccess: isSuccessLoadingMetadata,
    } = useTokenMetadataQuery(intent.asset.address);

    useEffect(() => {
        if (isSuccessLoadingMetadata) {
            const tokenSymbol = tokenData.metadata.symbol;
            setTokenSymbol(tokenSymbol);

            const decimals = tokenData.metadata.decimals;
            const amount = intent.amount;
            const fee = tokenData.metadata.fee;

            setDisplayAmount(convertDecimalBigIntToNumber(amount, decimals));
            setDisplayNetworkFee(convertDecimalBigIntToNumber(fee, decimals));
        }
    }, [isSuccessLoadingMetadata]);

    const renderTransactionState = () => {
        switch (intent.state) {
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

    return (
        <div id="confirmation-transaction" className="flex items-center">
            <div>{renderTransactionState()}</div>

            <div className="flex flex-col w-full">
                <TransactionAsset
                    title={title}
                    isLoading={isLoading || isLoadingMetadata}
                    displayAmount={displayAmount}
                    address={intent.asset.address}
                    symbol={tokenSymbol}
                />

                <TransactionNetworkFee
                    isLoading={isLoading || isLoadingMetadata}
                    displayAmount={displayNetworkFee}
                />
            </div>
        </div>
    );
};
