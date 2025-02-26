import { Search } from "lucide-react";

export function ManageTokensMissingTokenMessage() {
    return (
        <div className="flex flex-col items-center mx-auto">
            <div className="flex justify-center items-center w-12 h-12 rounded-lg border border-lightgreen">
                <Search className="stroke-green" size={24} />
            </div>

            <h3 className="font-medium whitespace-nowrap mt-4">Missing a token?</h3>
        </div>
    );
}
