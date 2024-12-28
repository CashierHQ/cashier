import TokenUtilsService from "@/services/tokenUtils.service";
import { LINK_ASSET_TYPE } from "@/services/types/enum";
import { TRANSACTION_STATE } from "@/services/types/transaction.service.types";
import { IcrcTokenMetadata } from "@dfinity/ledger-icrc";
import { defaultAgent } from "@dfinity/utils";
import { FC, useEffect, useState } from "react";
import { FiRefreshCw } from "react-icons/fi";
import { IoMdClose } from "react-icons/io";
import { IoMdCheckmark } from "react-icons/io";

export type AssetModel = {
    address: string;
    amount: bigint;
    chain: string;
    type: LINK_ASSET_TYPE;
};

interface TransactionItemProps {
    title: string;
    assets: (AssetModel | undefined)[] | undefined;
    state?: string;
    isNetWorkFee?: boolean;
}

const TransactionItem: FC<TransactionItemProps> = (props) => {
    const [tokenSymbol, setTokenSymbol] = useState<string>("");
    const [networkFee, setNetWorkFee] = useState<bigint>(BigInt(0));

    useEffect(() => {
        const fetchTokenMetadata = async () => {
            if (props.assets && props.assets[0]?.address) {
                const metadata = await getTokenMetaData(props.assets[0].address);
                const symbol = metadata?.symbol ?? "";
                setTokenSymbol(symbol);
                setNetWorkFee(metadata?.fee ?? BigInt(0));
            }
        };
        fetchTokenMetadata();
    }, [props.assets]);
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

    const getTokenMetaData = async (
        tokenAddress: string,
    ): Promise<IcrcTokenMetadata | undefined> => {
        const anonymousAgent = defaultAgent();
        const tokenService = new TokenUtilsService(anonymousAgent);
        const metadata = await tokenService.getICRCTokenMetadata(tokenAddress);
        return metadata;
    };

    return (
        <div id="confirmation-transaction" className="flex justify-between">
            <div className="flex">
                <div id="transaction-title" className="mr-3">
                    {props.title}
                </div>
                {renderTransactionState(props.state)}
            </div>
            <div>
                {props.isNetWorkFee
                    ? `${networkFee} ${tokenSymbol}`
                    : `${Number(props.assets?.[0]?.amount)} ${tokenSymbol}`}
            </div>
        </div>
    );
};

export default TransactionItem;
