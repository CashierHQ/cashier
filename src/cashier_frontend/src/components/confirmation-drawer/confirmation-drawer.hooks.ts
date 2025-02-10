import { INTENT_STATE, TASK } from "@/services/types/enum";
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

    const mapIntentStateToButtonText = () => {
        switch (intentState) {
            case INTENT_STATE.CREATED:
                return t("transaction.confirm_popup.confirm_button");
            case INTENT_STATE.PROCESSING:
            case INTENT_STATE.TIMEOUT:
                return t("transaction.confirm_popup.inprogress_button");
            case INTENT_STATE.FAIL:
                return t("retry");
            case INTENT_STATE.SUCCESS:
                return t("continue");
            default:
                return t("transaction.confirm_popup.confirm_button");
        }
    };

    const mapIntentStateToButtonDisabled = () => {
        switch (intentState) {
            case INTENT_STATE.CREATED:
            case INTENT_STATE.SUCCESS:
            case INTENT_STATE.FAIL:
                return false;
            case INTENT_STATE.PROCESSING:
            case INTENT_STATE.TIMEOUT:
                return true;
            default:
                return true;
        }
    };

    return {
        disabled: mapIntentStateToButtonDisabled(),
        text: mapIntentStateToButtonText(),
    };
};
