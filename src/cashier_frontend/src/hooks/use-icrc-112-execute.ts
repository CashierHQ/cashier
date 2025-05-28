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

import { useMutation } from "@tanstack/react-query";
import { useIdentity } from "@nfid/identitykit/react";
import CallSignerService from "@/services/signerService/callSigner.service";
import { Icrc112RequestModel } from "@/services/types/transaction.service.types";
import { SequenceRequest } from "@/services/signerService/icrc112.service";

export function useIcrc112Execute() {
    const identity = useIdentity();

    const mutation = useMutation({
        mutationFn: async ({
            transactions,
        }: {
            transactions: Icrc112RequestModel[][] | undefined;
        }) => {
            const identityProvided = !!identity;
            const transactionsProvided = transactions && transactions.length > 0;

            if (!identityProvided || !transactionsProvided) {
                return;
            }

            const signerService = new CallSignerService(identity);

            try {
                const res = await signerService.execute(transactions as unknown as SequenceRequest);
                return res;
            } catch (error) {
                console.error("Error executing ICRC112 transactions:", error);
                throw error;
            }
        },
    });

    return mutation;
}
