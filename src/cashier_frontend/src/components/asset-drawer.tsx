import React from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "./ui/drawer";
import { IoIosClose } from "react-icons/io";
import { useTranslation } from "react-i18next";
import Menu from "./asset-menu";
import { AssetSelectItem } from "./asset-select";

interface AssetDrawerProps {
    open: boolean;
    title: string;
    handleClose: () => void;
    assetList: AssetSelectItem[];
}

const AssetDrawer: React.FC<AssetDrawerProps> = ({ open, title, handleClose, assetList }) => {
    const { t: translate } = useTranslation();

    return (
        <Drawer open={open} onClose={handleClose}>
            <DrawerContent className="max-w-[400px] mx-auto p-3">
                <DrawerHeader>
                    <DrawerTitle className="flex justify-center">
                        <div className="text-center w-[100%]">{title}</div>
                        <IoIosClose
                            onClick={handleClose}
                            className="ml-auto cursor-pointer"
                            size={32}
                        />
                    </DrawerTitle>
                </DrawerHeader>
                <div className="font-semibold mb-3">Your asset</div>
                <Menu assetList={assetList} />
            </DrawerContent>
        </Drawer>
    );
};

export default AssetDrawer;
