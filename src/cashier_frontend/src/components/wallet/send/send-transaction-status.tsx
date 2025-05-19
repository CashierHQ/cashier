// Cashier — No-code blockchain transaction builder
// Copyright (C) 2025 TheCashierApp LLC
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

import { ExternalLink } from "@/components/ui/link";
import { TransactionStatus } from "@/services/types/wallet.types";
import { useIdentity } from "@nfid/identitykit/react";
import { FaCheck } from "react-icons/fa";
import { FaClockRotateLeft } from "react-icons/fa6";

interface SendTransactionStatusProps {
    status: TransactionStatus;
}

export const SendTransactionStatus = ({ status }: SendTransactionStatusProps) => {
    const identity = useIdentity();

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

            <ExternalLink
                to={`https://www.icexplorer.io/address/details/${identity?.getPrincipal()}`}
            >
                View transaction
            </ExternalLink>
        </div>
    );
};
