import { TRANSACTION_STATE } from "@/services/types/transaction.service.types";
import { FC } from "react";
import { FiRefreshCw } from "react-icons/fi";
import { IoMdClose } from "react-icons/io";
import { IoMdCheckmark } from "react-icons/io";

interface TransactionItemProps {
    title: string;
    asset: string;
    state?: string;
}

const TransactionItem: FC<TransactionItemProps> = (props) => {
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

    return (
        <div id="confirmation-transaction" className="flex justify-between">
            <div className="flex">
                <div id="transaction-title" className="mr-3">
                    {props.title}
                </div>
                {renderTransactionState(props.state)}
            </div>
            <div>{props.asset}</div>
        </div>
    );
};

export default TransactionItem;
