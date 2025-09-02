// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { useAuth } from "@nfid/identitykit/react";
import React, { useState } from "react";
import LoginButton from "./login-button";
import { ChevronLeft, Wallet, X } from "lucide-react";
import { Button } from "./ui/button";
import { SheetTrigger } from "./ui/sheet";
import { RiMenu2Line } from "react-icons/ri";
import { useLocation, useNavigate } from "react-router-dom";
import { useDeviceSize, useHeader } from "@/hooks/responsive-hook";
import { useWalletContext } from "@/contexts/wallet-context";
import { WalletSelectionModal } from "./wallet-connect/wallet-selection-modal";

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface HeaderProps {}

const Header: React.FC<HeaderProps> = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { isSmallDevice } = useDeviceSize();
  const {
    showHeaderWithBackButtonAndWalletButton,
    showCompactHeader,
    hideHeader,
  } = useHeader();

  const { openWallet } = useWalletContext();
  const [isWalletDialogOpen, setIsWalletDialogOpen] = useState(false);

  const handleNavigate = (path: string) => {
    const backToHomePaths = ["/wallet"];
    if (backToHomePaths.includes(path)) {
      navigate("/");
    } else {
      navigate(-1);
    }
  };

  if (!user) {
    return (
      <div
        className={`w-full flex justify-between items-center ${isSmallDevice ? "px-4 pt-4" : `px-8 pb-3 mb-4 ${location.pathname === "/" ? "" : "bg-white"}`}`}
      >
        {showHeaderWithBackButtonAndWalletButton(
          location.pathname,
          location.search,
          !user
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

        <LoginButton
          onClick={() => {
            setIsWalletDialogOpen(true);
          }}
        >
          Login
        </LoginButton>

        <WalletSelectionModal
          open={isWalletDialogOpen}
          onOpenChange={setIsWalletDialogOpen}
          isHeaderModal={true}
        />
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
            location.search
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

          {!location.pathname.includes("/wallet") && (
            <Button
              variant="outline"
              className="ml-auto light-borders p-0 w-9 h-9 mr-3 gap-2"
              onClick={() => openWallet()}
            >
              <Wallet size={16} color={"#35A18A"} />
            </Button>
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
