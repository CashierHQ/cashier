// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import usePnpStore from "@/stores/plugAndPlayStore";
import { JSX, useEffect } from "react";
import { useNavigate } from "react-router-dom";

interface RequireAuthProps {
  children: JSX.Element;
}

const RequireAuth: React.FC<RequireAuthProps> = ({ children }) => {
  const navigate = useNavigate();
  const { account } = usePnpStore();

  useEffect(() => {
    if (!account) {
      navigate("/");
    }
  }, [account, navigate]);

  return account ? children : null;
};

export default RequireAuth;
