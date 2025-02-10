import { IntentHelperService } from "@/services/fee.service";
import { IntentModel } from "@/services/types/intent.service.types";
import { useEffect, useState } from "react";

export const useIntentsTotal = (intents: IntentModel[]) => {
    const [total, setTotal] = useState<number>();

    useEffect(() => {
        const initState = async () => {
            const totalCashierFee = await IntentHelperService.calculateTotal(intents);
            setTotal(totalCashierFee);
        };

        initState();
    }, [intents]);

    return total;
};
