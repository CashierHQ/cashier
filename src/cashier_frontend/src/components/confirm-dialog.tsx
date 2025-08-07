// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

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

interface ConfirmDialogProps {
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
