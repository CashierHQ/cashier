import { TransactionStatus } from "@/services/types/wallet.types";
import { FaCheck } from "react-icons/fa";
import { FaClockRotateLeft } from "react-icons/fa6";

interface SendTransactionStatusProps {
    status: TransactionStatus;
}

export const SendTransactionStatus = ({ status }: SendTransactionStatusProps) => {
    return (
        <div className="flex flex-col items-center justify-center px-4 text-center">
            <div className="bg-[#E8F2EE] rounded-full p-6 mb-6">
                {status === TransactionStatus.PROCESSING && (
                    <FaClockRotateLeft className="w-12 h-12 text-[#36A18B]" />
                )}

                {status === TransactionStatus.SUCCESS && (
                    <FaCheck className="w-12 h-12 text-[#36A18B]" />
                )}
            </div>

            {status === TransactionStatus.PROCESSING && (
                <p className="mb-8">
                    Your transaction is in progress.It may take some time for the balance to appear
                    in the recipient's wallet.{" "}
                </p>
            )}

            {status === TransactionStatus.SUCCESS && (
                <p className="mb-8">Congratulations,your transactions was successful!</p>
            )}

            <div className="text-[#36A18B] hover:text-[#2C8571] text-lg font-light underline underline-offset-4">
                View transaction
            </div>
        </div>
    );
};
