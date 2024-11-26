import { TRANSACTION_STATUS } from "@/services/types/transaction.service.types";
import React, { FC } from "react";
import { FiXCircle, FiRefreshCw } from "react-icons/fi";
import { CiCircleCheck } from "react-icons/ci";
import { IoMdClose } from "react-icons/io";
import { IoMdCheckmark } from "react-icons/io";

interface TransactionItemProps {
    title: string;
    asset: string;
    status?: string;
}

const TransactionItem: FC<TransactionItemProps> = (props) => {
    const renderTransactionStatus = (transactionStatus?: string) => {
        switch (transactionStatus) {
            case TRANSACTION_STATUS.SUCCESS:
                return <IoMdCheckmark color="green" size={22} />;
            case TRANSACTION_STATUS.FAILED:
                return <IoMdClose color="red" size={22} />;
            case TRANSACTION_STATUS.PROCESSING:
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
                {renderTransactionStatus(props.status)}
            </div>
            <div>{props.asset}</div>
        </div>
    );
};

export default TransactionItem;
