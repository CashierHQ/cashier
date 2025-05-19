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

import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { FC } from "react";
import { X } from "lucide-react";

export interface ConfirmDialogProps {
    open: boolean;
    title?: string;
    description?: string | React.ReactNode;
    actionText?: string;
    onOpenChange: (open: boolean) => void;
    onSubmit?: () => void;
}

const ConfirmDialog: FC<ConfirmDialogProps> = ({
    open,
    title,
    description,
    actionText,
    onOpenChange,
    onSubmit,
}) => {
    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent className="rounded-3xl w-[95%] p-4">
                <AlertDialogHeader className="text-left">
                    <div className="flex items-center justify-between">
                        <AlertDialogTitle className="text-2xl">{title}</AlertDialogTitle>{" "}
                        <X
                            onClick={() => onOpenChange(false)}
                            className="cursor-pointer"
                            size={28}
                            strokeWidth={1.5}
                        />
                    </div>

                    <AlertDialogDescription className="text-md font-normal text-black break-words">
                        {description}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <div
                        onClick={onSubmit}
                        className="text-red-500 text-center w-full cursor-pointer underline underline-offset-4"
                    >
                        {actionText}
                    </div>{" "}
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};

export default ConfirmDialog;
