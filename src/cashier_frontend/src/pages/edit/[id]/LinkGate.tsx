// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { useTranslation } from "react-i18next";
import { Label } from "@/components/ui/label";
import { useLinkCreationFormStore } from "@/stores/linkCreationFormStore";

import {
  Dispatch,
  ReactElement,
  SetStateAction,
  useEffect,
  useState,
} from "react";

import { BsTwitterX, BsTelegram } from "react-icons/bs";
import {
  LuCalendarClock,
  LuImage,
  LuRectangleEllipsis,
  LuLockOpen,
} from "react-icons/lu";
import { Info } from "lucide-react";
import { PasswordGateDrawer } from "./PasswordGateDrawer";

type GateType = null | "password" | "x" | "tg" | "date" | "nft";

type GateConfig =
  | { type: "null" }
  | { type: "password"; password: string }
  | { type: "x"; handle: string }
  | { type: "tg"; group: string }
  | { type: "date"; unlockDate: Date }
  | { type: "nft"; collection: string };

type GateOption = {
  type: GateType;
  label: string;
  icon: ReactElement;
  disabled: boolean;
  action?: () => void;
};

function GateOptionComponent(
  option: GateOption,
  selectedOption: GateType,
  setSelectedOption: Dispatch<SetStateAction<GateType>>,
  setGateConfig: Dispatch<SetStateAction<GateConfig>>
) {
  const { t } = useTranslation();
  const isSelected = option.type === selectedOption;

  const handleClick = () => {
    if (!option.disabled) {
      setSelectedOption(option.type);
      if (option.type === null) {
        setGateConfig({ type: "null" });
      }
      if (option.action) {
        option.action();
      }
    }
  };

  return (
    <button
      onClick={handleClick}
      className={`w-full gap-3 flex items-center justify-start py-2 px-4 border rounded-xl ${option.disabled ? "bg-[#F2F2F2] text-[#BCBCBC] cursor-not-allowed" : ""} ${isSelected ? "border-green" : "border-[#D0D5DD]/50"}`}
    >
      <span className={`${!option.disabled && "text-green"} text-2xl`}>
        {option.icon}
      </span>
      <p className="text-[14px] font-[400]">{t(option.label)}</p>
      {option.disabled && (
        <p className="ml-auto text-[14px] font-[400] text-[#BCBCBC]">
          Coming Soon
        </p>
      )}
    </button>
  );
}

export default function LinkGate() {
  const { t } = useTranslation();

  const [selectedOption, setSelectedOption] = useState<GateType>(null);
  const [passwordDrawerOpen, setPasswordDrawerOpen] = useState(false);
  const [gateConfig, setGateConfig] = useState<GateConfig>({ type: "null" });

  const { setButtonState } = useLinkCreationFormStore();

  const handlePasswordActivate = (password: string) => {
    setGateConfig({ type: "password", password });
    setSelectedOption("password");
    setPasswordDrawerOpen(false);
  };

  useEffect(() => {
    setButtonState({
      label: t("continue"),
      isDisabled: false,
    });
  }, []);

  const gateOptions: GateOption[] = [
    {
      type: null,
      label: "create.gate.gateOptions.null",
      icon: <LuLockOpen />,
      disabled: false,
    },
    {
      type: "password",
      label: "create.gate.gateOptions.password",
      icon: <LuRectangleEllipsis />,
      disabled: false,
      action: () => setPasswordDrawerOpen(true),
    },
    {
      type: "x",
      label: "create.gate.gateOptions.x",
      icon: <BsTwitterX />,
      disabled: true,
    },
    {
      type: "tg",
      label: "create.gate.gateOptions.tg",
      icon: <BsTelegram />,
      disabled: true,
    },
    {
      type: "date",
      label: "create.gate.gateOptions.date",
      icon: <LuCalendarClock />,
      disabled: true,
    },
    {
      type: "nft",
      label: "create.gate.gateOptions.nft",
      icon: <LuImage />,
      disabled: true,
    },
  ];

  return (
    <>
      <div className="w-full h-full flex flex-col overflow-hidden mt-2">
        <div className="flex-shrink-0">
          <div className="input-label-field-container">
            <Label>{t("create.gate.options")}</Label>
          </div>
          <div className="flex flex-col gap-2 mt-2">
            {gateOptions.map((option) =>
              GateOptionComponent(
                option,
                selectedOption,
                setSelectedOption,
                setGateConfig
              )
            )}
          </div>
          {selectedOption !== null && (
            <div className="flex items-center gap-2 mt-2 text-xs text-green">
              <Info className="w-4 p-0 m-0" />
              <p>
                Only users with the correct key will be able to unlock and
                execute it.
              </p>
            </div>
          )}
        </div>
      </div>

      <PasswordGateDrawer
        open={passwordDrawerOpen}
        onClose={() => setPasswordDrawerOpen(false)}
        onActivate={handlePasswordActivate}
      />
    </>
  );
}
