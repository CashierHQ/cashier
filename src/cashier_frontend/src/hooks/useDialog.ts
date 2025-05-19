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
