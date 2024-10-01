/* eslint-disable @typescript-eslint/no-unused-vars */
import { useIdentityKit } from "@nfid/identitykit/react";
import { useTranslation } from "react-i18next";

export default function ProtectedRoute({ children, ...rest }: { children: React.ReactNode }) {
    const { agent } = useIdentityKit();
    const { identity } = useIdentityKit();
    const { t } = useTranslation();
    return <div></div>;
}
