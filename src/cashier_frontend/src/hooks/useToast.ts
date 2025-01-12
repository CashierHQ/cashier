import { TransactionToastProps } from "@/components/transaction-toast";
import { useState, useCallback } from "react";

const useToast = () => {
    const [toastData, setToastData] = useState<TransactionToastProps>({
        open: false,
        title: "",
        description: "",
        variant: "default",
    });

    const showToast = useCallback(
        (title: string, description: string, variant: "default" | "error" | null | undefined) => {
            setToastData({
                open: true,
                title,
                description,
                variant,
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

export default useToast;
