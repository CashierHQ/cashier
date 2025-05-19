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
