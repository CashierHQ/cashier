// Cashier — No-code blockchain transaction builder
// Copyright (C) 2025 TheCashierApp LLC
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

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
