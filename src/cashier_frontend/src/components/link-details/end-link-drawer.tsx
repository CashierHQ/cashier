import { FC, useState } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { IoIosClose } from "react-icons/io";
import { Button } from "@/components/ui/button";
import { Unlink } from "lucide-react";
import { Input } from "../ui/input";

interface EndLinkDrawerProps {
    open: boolean;
    isEnding: boolean;
    onClose?: () => void;
    onDelete: () => void;
}

export const EndLinkDrawer: FC<EndLinkDrawerProps> = ({
    open,
    isEnding,
    onClose = () => {},
    onDelete = () => {},
}) => {
    const [confirmText, setConfirmText] = useState("");

    const onClickConfirm = async () => {
        if (confirmText !== "End link") return;

        try {
            onDelete();
        } catch (error) {
            console.error("Error ending link:", error);
        }
    };

    return (
        <Drawer open={open}>
            <DrawerContent className="max-w-[400px] mx-auto p-1 rounded-t-[1.5rem]">
                <DrawerHeader>
                    <DrawerTitle className="relative flex items-center justify-start">
                        <div className="text-lg">End link</div>

                        <IoIosClose
                            onClick={onClose}
                            className="absolute right-0 cursor-pointer"
                            size={42}
                        />
                    </DrawerTitle>
                </DrawerHeader>

                <div className="flex flex-col px-4 pb-8">
                    <div className="flex p-3 bg-lightgreen rounded-full w-fit">
                        <Unlink className="text-green" />
                    </div>

                    <div className="flex flex-col gap-2 mt-4 text-[14px] text-primary/75">
                        <p>Are you sure you want to end the link?</p>
                        <p>
                            Ending the link will deactivate the link page and users will no longer
                            be able to claim the link. You will need to withdraw the remaining
                            assets to your wallet.
                        </p>
                    </div>

                    <div className="flex flex-col items-start justify-start gap-1 mt-4">
                        <p className="font-semibold text-sm">To confirm, please type "End link"</p>
                        <Input
                            className="pl-3 placeholder:text-grey/75 text-md rounded-lg appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none shadow-xs border border-input"
                            placeholder="End link"
                            value={confirmText}
                            onChange={(e) => setConfirmText(e.target.value)}
                        />
                    </div>

                    {isEnding ? (
                        <Button
                            size="default"
                            className="mt-4 mx-1 disabled:opacity-50"
                            onClick={onClickConfirm}
                            disabled={isEnding}
                        >
                            Processing...
                        </Button>
                    ) : (
                        <Button
                            size="default"
                            className="mt-4 mx-1 disabled:opacity-50"
                            onClick={onClickConfirm}
                            disabled={confirmText !== "End link"}
                        >
                            End link
                        </Button>
                    )}
                </div>
            </DrawerContent>
        </Drawer>
    );
};
