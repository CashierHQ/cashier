import { BackHeader } from "../ui/back-header";
import { Search } from "../ui/search";
import { ManageTokensList } from "./menage-tokens-list";

export function ManageTokensPage() {
    return (
        <div className="h-full px-4 py-2">
            <BackHeader>
                <h1 className="text-lg font-semibold">Manage tokens</h1>
            </BackHeader>

            <Search.Root className="mt-6">
                <Search.Icon />
                <Search.Input placeholder="Search a token" />
            </Search.Root>

            <ManageTokensList />
        </div>
    );
}
