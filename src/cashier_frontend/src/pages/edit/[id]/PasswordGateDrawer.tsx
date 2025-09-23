// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { FC, useState } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { X, Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface PasswordGateDrawerProps {
  open: boolean;
  onClose: () => void;
  onActivate: (password: string) => void;
}

export const PasswordGateDrawer: FC<PasswordGateDrawerProps> = ({
  open,
  onClose,
  onActivate,
}) => {
  const { t } = useTranslation();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<{
    password?: string;
    confirmPassword?: string;
  }>({});

  const handleActivate = () => {
    const newErrors: typeof errors = {};

    if (!password) {
      newErrors.password = t("password_gate_drawer.password_required");
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = t(
        "password_gate_drawer.confirm_password_required"
      );
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = t(
        "password_gate_drawer.passwords_dont_match"
      );
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onActivate(password);
    handleReset();
  };

  const handleReset = () => {
    setPassword("");
    setConfirmPassword("");
    setShowPassword(false);
    setShowConfirmPassword(false);
    setErrors({});
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  return (
    <Drawer
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          handleClose();
        }
      }}
    >
      <DrawerContent className="max-w-[400px] mx-auto p-6 rounded-t-[1.5rem]">
        <DrawerHeader className="p-0 mb-6">
          <DrawerTitle className="flex relative justify-center items-center">
            <div className="text-center w-[100%] text-[20px] font-semibold">
              {t("password_gate_drawer.title")}
            </div>
            <X
              onClick={handleClose}
              strokeWidth={1.5}
              className="ml-auto cursor-pointer absolute right-0"
              size={28}
            />
          </DrawerTitle>
        </DrawerHeader>

        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium">
              {t("password_gate_drawer.password_label")}
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder={t("password_gate_drawer.password_placeholder")}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password) {
                    setErrors({ ...errors, password: undefined });
                  }
                }}
                className={`pr-10 ${errors.password ? "border-red-500" : ""}`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {errors.password && (
              <p className="text-xs text-red-500">{errors.password}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password" className="text-sm font-medium">
              {t("password_gate_drawer.confirm_password_label")}
            </Label>
            <div className="relative">
              <Input
                id="confirm-password"
                type={showConfirmPassword ? "text" : "password"}
                placeholder={t(
                  "password_gate_drawer.confirm_password_placeholder"
                )}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (errors.confirmPassword) {
                    setErrors({ ...errors, confirmPassword: undefined });
                  }
                }}
                className={`pr-10 ${errors.confirmPassword ? "border-red-500" : ""}`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="text-xs text-red-500">{errors.confirmPassword}</p>
            )}
          </div>

          <Button onClick={handleActivate} className="w-full mt-8">
            {t("password_gate_drawer.activate_button")}
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
};
