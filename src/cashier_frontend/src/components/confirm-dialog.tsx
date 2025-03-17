import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { FC } from "react";
import { IoIosClose } from "react-icons/io";

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
            <AlertDialogContent className="rounded-[24px] w-[90%]">
                <AlertDialogHeader className="text-left">
                    <div className="flex items-center justify-between mb-3">
                        <AlertDialogTitle className="text-2xl">{title}</AlertDialogTitle>{" "}
                        <IoIosClose
                            onClick={() => onOpenChange(false)}
                            className="cursor-pointer"
                            size={38}
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
