// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { FC } from "react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { X, Link, Wifi } from "lucide-react";
import { useTranslation } from "react-i18next";

type FeeInfoDrawerProps = {
  open?: boolean;
  onClose?: () => void;
};

export const FeeInfoDrawer: FC<FeeInfoDrawerProps> = ({ open, onClose }) => {
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
              {t("feeInfo.title")}
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
          <h4 className="font-medium text-[14px] gap-1 items-center mt-5 flex flex-row">
            <Link size={18} className="text-green mr-1" />
            {t("feeInfo.cashierFeeHeader")}
          </h4>
          <p className="mt-0.5 text-[14px] font-normal">
            {t("feeInfo.cashierFeeText")}
          </p>

          <h4 className="font-medium text-[14px] gap-1 items-center mt-5 flex flex-row">
            <Wifi size={18} className="text-green mr-1" />
            {t("feeInfo.networkFeeHeader")}
          </h4>
          <div className="flex flex-col gap-2 mt-0.5 text-[14px] font-normal">
            {(
              t("feeInfo.networkFeeText", {
                returnObjects: true,
              }) as string[]
            ).map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>
        </div>

        <Button className="mt-6 py-5" onClick={onClose}>
          {t("transaction.confirm_popup.info.button_text")}
        </Button>
      </DrawerContent>
    </Drawer>
  );
};
