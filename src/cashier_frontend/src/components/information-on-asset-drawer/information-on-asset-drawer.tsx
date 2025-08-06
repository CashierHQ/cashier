// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { FC } from "react";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { ChevronLeft, Link, Wifi, X } from "lucide-react";
import { IoIosClose } from "react-icons/io";
import { useTranslation } from "react-i18next";

type InformationOnAssetDrawerProps = {
    open?: boolean;
    onClose?: () => void;
};

export const InformationOnAssetDrawer: FC<InformationOnAssetDrawerProps> = ({ open, onClose }) => {
    const { t } = useTranslation();

    return (
        <Drawer
            open={open}
            onOpenChange={(isOpen) => {
                if (!isOpen) {
                    onClose?.();
                }
            }}
        >
            <DrawerContent className="max-w-[400px] mx-auto p-3">
                <DrawerHeader>
                    <DrawerTitle className="flex relative justify-center items-center">
                        <div className="text-center w-[100%] text-[18px] font-semibold">
                            Info on asset transfer to link
                        </div>
                        <X
                            onClick={onClose}
                            strokeWidth={1.5}
                            className="ml-auto cursor-pointer absolute right-0"
                            size={28}
                        />
                    </DrawerTitle>
                </DrawerHeader>

                <div className="px-4 pb-4 mt-2">
                    <p className="mt-0.5 text-[14px] font-normal">
                        Cashier will hold the assets in a vault, until someone claims them from the
                        link you share.
                        <br />
                        <br />
                        You may end the link and withdraw the assets, if no-one claims the assets.
                    </p>
                </div>

                <Button className="mt-6 py-5" onClick={onClose}>
                    {t("transaction.confirm_popup.info.button_text")}
                </Button>
            </DrawerContent>
        </Drawer>
    );
};
