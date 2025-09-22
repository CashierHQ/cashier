// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import React from "react";
import { ChevronLeft, X } from "lucide-react";
import { Button } from "./ui/button";
import { SheetTrigger } from "./ui/sheet";
import { RiMenu2Line } from "react-icons/ri";
import { useLocation, useNavigate } from "react-router-dom";
import { useDeviceSize, useHeader } from "@/hooks/responsive-hook";
import usePnpStore from "@/stores/plugAndPlayStore";
import useWalletModalStore from "@/stores/walletModalStore";

const Header: React.FC = () => {
  const { account } = usePnpStore();
  const navigate = useNavigate();
  const location = useLocation();
  const { isSmallDevice } = useDeviceSize();
  const {
    showHeaderWithBackButtonAndWalletButton,
    showCompactHeader,
    hideHeader,
  } = useHeader();

  const { open: openWalletModal } = useWalletModalStore();

  const handleNavigate = (path: string) => {
    const backToHomePaths = ["/wallet"];
    if (backToHomePaths.includes(path)) {
      navigate("/");
    } else {
      navigate(-1);
    }
  };

  if (!account) {
    return (
      <div
        className={`w-full flex justify-between items-center ${isSmallDevice ? "px-4 pt-4" : `px-8 pb-3 mb-4 ${location.pathname === "/" ? "" : "bg-white"}`}`}
      >
        {showHeaderWithBackButtonAndWalletButton(
          location.pathname,
          location.search,
          !account,
        ) ? (
          <ChevronLeft
            size={24}
            className="cursor-pointer"
            onClick={() => navigate(-1)}
          />
        ) : (
          <img
            src={
              showCompactHeader(location.pathname)
                ? "./cLogo.svg"
                : "./logo.svg"
            }
            alt="Cashier logo"
            className="max-w-[130px]"
            onClick={() => navigate("/")}
          />
        )}

        <Button
          onClick={() => {
            openWalletModal();
          }}
          className="min-w-[75px] min-h-[45px] font-500 bg-transparent light-borders-green text-green hover:bg-green/90 hover:text-white transition-all duration-300"
        >
          Login
        </Button>
      </div>
    );
  } else if (
    !hideHeader(location.pathname) ||
    (hideHeader(location.pathname) && !isSmallDevice)
  ) {
    return (
      <>
        <div
          className={`w-full flex justify-between items-center ${isSmallDevice ? "px-4 pt-4" : "px-8 py-3 mb-4 bg-white"}`}
        >
          {showHeaderWithBackButtonAndWalletButton(
            location.pathname,
            location.search,
          ) ? (
            <ChevronLeft
              size={24}
              className="cursor-pointer"
              onClick={() => navigate(-1)}
            />
          ) : (
            <img
              src="./logo.svg"
              alt="Cashier logo"
              className="max-w-[130px] cursor-pointer"
              onClick={() => navigate("/")}
            />
          )}

          {hideHeader(location.pathname) && !isSmallDevice ? (
            <></> // Don't show X button on big device header when hideHeader is true
          ) : showCompactHeader(location.pathname) ? (
            <X
              size={24}
              className="cursor-pointer"
              onClick={() => handleNavigate(location.pathname)}
            />
          ) : (
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="light-borders">
                <RiMenu2Line />
              </Button>
            </SheetTrigger>
          )}
        </div>
      </>
    );
  }
};

export default Header;
