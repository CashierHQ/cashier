// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

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
