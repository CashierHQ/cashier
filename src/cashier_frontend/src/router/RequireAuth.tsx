// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { useEffect } from "react";
import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";
import { useIdentity } from "@nfid/identitykit/react";

interface RequireAuthProps {
  children: JSX.Element;
}

const RequireAuth: React.FC<RequireAuthProps> = ({ children }) => {
  const navigate = useNavigate();
  const identity = useIdentity();

  useEffect(() => {
    if (!identity) {
      navigate("/");
    }
  }, [identity, navigate]);

  return identity ? children : null;
};
RequireAuth.propTypes = {
  children: PropTypes.element.isRequired,
};

export default RequireAuth;
