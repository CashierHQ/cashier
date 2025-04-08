import { useTranslation } from "react-i18next";
import { useState } from "react";
import { BackHeader } from "@/components/ui/back-header";
import { ImportTokenForm } from "@/components/import-token/form";
import { ImportTokenFormData } from "@/hooks/import-token.hooks";
import { ImportTokenReview } from "@/components/import-token/review";
import { useNavigate } from "react-router-dom";
import { useResponsive } from "@/hooks/responsive-hook";
import { TokenUtilService } from "@/services/tokenUtils.service";
import { Spinner } from "@/components/ui/spinner";
import { useTokens } from "@/hooks/useTokens";

export default function ImportTokenPage() {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const responsive = useResponsive();
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
        navigate(-1);
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
        <div
            className={`flex flex-col relative ${responsive.isSmallDevice ? "px-2 py-4 h-full" : "max-w-[700px] mx-auto bg-white max-h-[80%] mt-12 rounded-xl shadow-sm p-4"}`}ke all pages look standard in desktop mode)
        >
            <BackHeader onBack={goBack}>
                <h1 className="text-lg font-semibold">
                    {t(importData ? "review.header" : "import.header")}
                </h1>
            </BackHeader>

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
}
