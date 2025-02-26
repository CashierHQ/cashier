import { Link, useNavigate } from "react-router-dom";
import { BackHeader } from "../ui/back-header";
import { Search } from "../ui/search";
import { ManageTokensList } from "./menage-tokens-list";
import { ManageTokensMissingTokenMessage } from "./manage-tokens-missing-token-message";

export function ManageTokensPage() {
    const navigate = useNavigate();

    const goBack = () => navigate("/wallet");

    const isNoTokens = false;

    return (
        <div className="h-full px-4 py-2">
            <BackHeader onBack={goBack}>
                <h1 className="text-lg font-semibold">Manage tokens</h1>
            </BackHeader>

            <Search.Root className="mt-6">
                <Search.Icon />
                <Search.Input placeholder="Search a token" />
            </Search.Root>

            <div className="flex flex-col py-6">
                {isNoTokens ? <ManageTokensMissingTokenMessage /> : <ManageTokensList />}
                <Link to="/wallet/import" className="text-green font-medium mx-auto mt-4">
                    + Import token
                </Link>
            </div>
        </div>
    );
}
