import { FC } from "react";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Link, Wifi } from "lucide-react";
import { IoIosClose } from "react-icons/io";
import { useTranslation } from "react-i18next";

export type FeeInfoDrawerProps = {
    open?: boolean;
    onClose?: () => void;
};

export const FeeInfoDrawer: FC<FeeInfoDrawerProps> = ({ open, onClose }) => {
    const { t } = useTranslation();

    return (
        <Drawer open={open}>
            <DrawerContent className="max-w-[400px] mx-auto p-3">
                <DrawerHeader>
                    <DrawerTitle className="flex justify-center items-center">
                        <div className="text-center w-[100%]">{t("feeInfo.title")}</div>
                        <IoIosClose
                            onClick={onClose}
                            className="ml-auto cursor-pointer"
                            size={32}
                        />
                    </DrawerTitle>
                </DrawerHeader>

                <div className="px-4 pb-4 mt-2">
                    <h4 className="font-bold mt-5 flex flex-row">
                        <Link className="text-green mr-1" to={""} />
                        {t("feeInfo.cashierFeeHeader")}
                    </h4>
                    <p className="mt-0.5">{t("feeInfo.cashierFeeText")}</p>

                    <h4 className="font-bold mt-5 flex flex-row">
                        <Wifi className="text-green mr-1" />
                        {t("feeInfo.networkFeeHeader")}
                    </h4>
                    <div className="flex flex-col gap-2 mt-0.5">
                        {(
                            t("feeInfo.networkFeeText", {
                                returnObjects: true,
                            }) as string[]
                        ).map((paragraph, index) => (
                            <p key={index}>{paragraph}</p>
                        ))}
                    </div>
                </div>

                <Button className="mt-6" onClick={onClose}>
                    {t("transaction.confirm_popup.info.button_text")}
                </Button>
            </DrawerContent>
        </Drawer>
    );
};
