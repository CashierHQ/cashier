import { useIdentityKit } from "@nfid/identitykit/react";
import { useTranslation } from "react-i18next";

export default function ProtectedRoute({ children, ...rest }: { children: React.ReactNode }) {
    const { agent } = useIdentityKit();
    const { identity } = useIdentityKit();
    const { t } = useTranslation();
    return (
        <></>
        // <Route
        //     {...rest}
        //     render={({ location }) =>
        //         agent && identity ? (
        //             children
        //         ) : (
        //             <Redirect
        //                 to={{
        //                     pathname: "/",
        //                     state: { from: location },
        //                 }}
        //             />
        //         )
        //     }
        // />
    );
}