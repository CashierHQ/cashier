import { ACTION_STATE, INTENT_STATE, TASK } from "@/services/types/enum";
import { IntentModel } from "@/services/types/intent.service.types";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

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

export const useConfirmButtonState = (intentState: string | undefined) => {
    const { t } = useTranslation();

    const mapActionStateToButtonText = () => {
        switch (intentState) {
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
        switch (intentState) {
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

    return {
        disabled: mapActionStateToButtonDisabled(),
        text: mapActionStateToButtonText(),
    };
};
