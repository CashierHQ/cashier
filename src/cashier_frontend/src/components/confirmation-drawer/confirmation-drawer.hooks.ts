import { ACTION_STATE, TASK } from "@/services/types/enum";
import { IntentModel } from "@/services/types/intent.service.types";
import { TFunction } from "i18next";
import { useEffect, useMemo, useState } from "react";

export const usePrimaryIntents = (intents: IntentModel[] | undefined) => {
    const primaryIntents = useMemo(() => {
        return intents?.filter((intent) => intent.task === TASK.TRANSFER_WALLET_TO_LINK) ?? [];
    }, [intents]);

    return primaryIntents;
};

export const useCashierFeeIntents = (intents: IntentModel[] | undefined) => {
    const cashierFeeIntents = useMemo(() => {
        return intents?.filter((intent) => intent.task === TASK.TRANSFER_WALLET_TO_TREASURY) ?? [];
    }, [intents]);

    return cashierFeeIntents;
};

export const useConfirmButtonState = (actionState: string | undefined, t: TFunction) => {
    const [isDisabled, setIsDisabled] = useState(false);
    const [buttonText, setButtonText] = useState("");

    const mapActionStateToButtonText = () => {
        switch (actionState) {
            case ACTION_STATE.CREATED:
                return t("transaction.confirm_popup.confirm_button");
            case ACTION_STATE.PROCESSING:
                return t("transaction.confirm_popup.inprogress_button");
            case ACTION_STATE.FAIL:
                return t("retry");
            case ACTION_STATE.SUCCESS:
                return t("continue");
            default:
                return t("transaction.confirm_popup.confirm_button");
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
