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

import { useTranslation } from "react-i18next";
import { useState } from "react";
import { ImportTokenForm } from "@/components/import-token/form";
import { ImportTokenFormData } from "@/hooks/import-token.hooks";
import { ImportTokenReview } from "@/components/import-token/review";
import { TokenUtilService } from "@/services/tokenUtils.service";
import { Spinner } from "@/components/ui/spinner";
import { useTokens } from "@/hooks/useTokens";
import { ChevronLeft } from "lucide-react";

interface ImportPanelProps {
    onBack: () => void;
}

const ImportPanel: React.FC<ImportPanelProps> = ({ onBack }) => {
    const { t } = useTranslation();
    const [importData, setImportData] = useState<ImportTokenFormData>();
    const [tokenMetadata, setTokenMetadata] = useState<{
        name: string;
        symbol: string;
        logo?: string;
        chain: string;
        address: string;
        decimals: number;
    }>();
    const [isImporting, setIsImporting] = useState(false);
    const [importError, setImportError] = useState<string | null>(null);

    const { updateToken } = useTokens();

    function goBack() {
        if (tokenMetadata) {
            setTokenMetadata(undefined);
            setImportData(undefined);
        } else {
            onBack();
        }
    }

    const onSubmitImportToken = async (data: ImportTokenFormData) => {
        setIsImporting(true);
        setImportError(null);

        try {
            const metadata = await TokenUtilService.getTokenMetadata(data.ledgerCanisterId);

            if (!metadata) {
                throw new Error("Token metadata not found");
            }

            // Transform the metadata into the format expected by your state
            const tokenMetadata = {
                name: metadata.name,
                symbol: metadata.symbol,
                logo: metadata.icon, // Assuming IcrcTokenMetadata has an 'icon' property
                chain: data.chain, // Use the chain from the form data
                address: data.ledgerCanisterId, // Use the canisterId as the address
                decimals: metadata.decimals,
            };

            setTokenMetadata(tokenMetadata);
            setImportData(data);
        } catch (error) {
            console.error("Failed to fetch token metadata:", error);
            setImportError(
                error instanceof Error ? error.message : "Failed to fetch token metadata",
            );
        } finally {
            setIsImporting(false);
            updateToken();
        }
    };

    return (
        <div className="w-full flex flex-col h-full">
            <div className="relative flex justify-center items-center mb-4">
                <button onClick={goBack} className="absolute left-0">
                    <ChevronLeft size={24} />
                </button>
                <h1 className="text-lg font-semibold">
                    {t(tokenMetadata ? "review.header" : "import.header")}
                </h1>
            </div>

            {importError && (
                <div className="mt-4 p-3 bg-red-100 text-red-800 rounded-md">{importError}</div>
            )}

            <div className="relative flex-grow">
                {/* Loading Overlay */}
                {isImporting && (
                    <div className="absolute inset-0 bg-white bg-opacity-80 z-50 flex items-center justify-center rounded-md">
                        <div className="flex flex-col items-center">
                            <Spinner width={40} height={40} />
                            <p className="mt-4 text-gray-700">{t("import.loading.fetchMetdata")}</p>
                        </div>
                    </div>
                )}

                {tokenMetadata ? (
                    <ImportTokenReview token={tokenMetadata} />
                ) : (
                    <ImportTokenForm onSubmit={onSubmitImportToken} />
                )}
            </div>
        </div>
    );
};

export default ImportPanel;
