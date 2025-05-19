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

import { STATUS } from "@/components/ui/status";
import { INTENT_STATE, TRANSACTION_STATE } from "@/services/types/enum";

export const mapIntentsStateToStatus = (state: INTENT_STATE | undefined): STATUS | undefined => {
    switch (state) {
        case INTENT_STATE.SUCCESS:
            return STATUS.SUCCESS;
        case INTENT_STATE.FAIL:
        case INTENT_STATE.TIMEOUT:
            return STATUS.FAIL;
        case INTENT_STATE.PROCESSING:
            return STATUS.IN_PROGRESS;
        default:
            return undefined;
    }
};

export const mapTransactionStateToStatus = (
    state: TRANSACTION_STATE | undefined,
): STATUS | undefined => {
    switch (state) {
        case TRANSACTION_STATE.SUCCESS:
            return STATUS.SUCCESS;
        case TRANSACTION_STATE.FAIL:
        case TRANSACTION_STATE.TIMEOUT:
            return STATUS.FAIL;
        case TRANSACTION_STATE.PROCESSING:
            return STATUS.IN_PROGRESS;
        default:
            return undefined;
    }
};
