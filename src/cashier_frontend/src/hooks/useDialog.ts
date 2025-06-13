// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { useState, useCallback } from "react";

interface ConfirmDialogOptions {
    title: string;
    description: string | React.ReactNode;
}

export const useConfirmDialog = () => {
    const [open, setOpen] = useState(false);
    const [options, setOptions] = useState<ConfirmDialogOptions>({ title: "", description: "" });

    const showDialog = useCallback((options: ConfirmDialogOptions) => {
        setOptions(options);
        setOpen(true);
    }, []);

    const hideDialog = useCallback(() => {
        setOpen(false);
    }, []);

    return {
        open,
        options,
        showDialog,
        hideDialog,
    };
};
