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

import { ACTION_STATE, TASK } from "@/services/types/enum";
import { IntentModel } from "@/services/types/intent.service.types";
import { TFunction } from "i18next";
import { useEffect, useState } from "react";

/**
 * Sorts an array of intent models, prioritizing wallet-to-link transfer intents.
 *
 * This function ensures that TRANSFER_WALLET_TO_LINK intents appear first in the sorted array,
 * which is important for displaying transfer actions to users in the correct order.
 * Other intent types maintain their original relative order.
 *
 * @param intents - Array of intent models to sort, or undefined
 * @returns Sorted array of intent models with wallet-to-link transfers appearing first
 */
const sortIntents = (intents: IntentModel[] | undefined) => {
    return (intents ?? []).sort((a, b) => {
        if (a.task === TASK.TRANSFER_WALLET_TO_LINK && b.task !== TASK.TRANSFER_WALLET_TO_LINK) {
            return -1;
        }
        if (a.task !== TASK.TRANSFER_WALLET_TO_LINK && b.task === TASK.TRANSFER_WALLET_TO_LINK) {
            return 1;
        }
        return 0;
    });
};

export const usePrimaryIntents = (intents: IntentModel[] | undefined) => {
    return intents;
};

export const useConfirmButtonState = (
    actionState: string | undefined,
    t: TFunction,
    defaultText?: string,
) => {
    const [isDisabled, setIsDisabled] = useState(false);
    const [buttonText, setButtonText] = useState("");
    const mapActionStateToButtonText = () => {
        switch (actionState) {
            case ACTION_STATE.CREATED:
                return t("confirmation_drawer.confirm_button");
            case ACTION_STATE.PROCESSING:
                return t("confirmation_drawer.inprogress_button");
            case ACTION_STATE.FAIL:
                console.log("Return failed");
                return t("retry");
            case ACTION_STATE.SUCCESS:
                return t("continue");
            default:
                return defaultText ?? t("confirmation_drawer.confirm_button");
        }
    };

    const mapActionStateToButtonDisabled = () => {
        switch (actionState) {
            case ACTION_STATE.CREATED:
            case ACTION_STATE.SUCCESS:
            case ACTION_STATE.FAIL:
                return false;
            case ACTION_STATE.PROCESSING:
                return true;
            default:
                return true;
        }
    };

    useEffect(() => {
        console.log("action state changed to", actionState);
        setButtonText(mapActionStateToButtonText());
        setIsDisabled(mapActionStateToButtonDisabled());
    }, [actionState]);

    return {
        isDisabled,
        setIsDisabled,
        buttonText,
        setButtonText,
    };
};
