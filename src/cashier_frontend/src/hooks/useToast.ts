import { TransactionToastProps } from "@/components/transaction/transaction-toast";
import { useState, useCallback } from "react";

const useToast = () => {
    const [toastData, setToastData] = useState<TransactionToastProps>({
        open: false,
        title: "",
        description: "",
        variant: "default",
        onOpenChange: () => {},
    });

    const showToast = useCallback(
        (
            title: string,
            description: string,
            variant: "default" | "error" | null | undefined,
            icon?: React.ReactNode,
            boldText?: boolean,
        ) => {
            setToastData({
                open: true,
                title,
                description,
                variant,
                icon,
                boldText,
                onOpenChange: () => {},
            });
        },
        [],
    );

    const hideToast = useCallback(() => {
        setToastData((prevState) => ({
            ...prevState,
            open: false,
        }));
    }, []);

    return { toastData, showToast, hideToast };
};

export type UseToastReturn = ReturnType<typeof useToast>;
export type ShowToastFn = UseToastReturn["showToast"];

export default useToast;
