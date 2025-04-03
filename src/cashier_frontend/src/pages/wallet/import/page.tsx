import { useTranslation } from "react-i18next";
import { useState } from "react";
import { BackHeader } from "@/components/ui/back-header";
import { ImportTokenForm } from "@/components/import-token/form";
import { ImportTokenFormData } from "@/hooks/import-token.hooks";
import { ImportTokenReview } from "@/components/import-token/review";
import { useNavigate } from "react-router-dom";
import { useResponsive } from "@/hooks/responsive-hook";
import { TokenUtilService } from "@/services/tokenUtils.service";

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

    function goBack() {
        navigate(-1);
    }

    const onSubmitImportToken = async (data: ImportTokenFormData) => {
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
        } catch {
            throw new Error("Failed to fetch token metadata");
        }
    };

    // TODO: implement loading
    return (
        <div
            className={`flex flex-col ${responsive.isSmallDevice ? "px-2 py-4 h-full" : "max-w-[700px] mx-auto bg-white max-h-[80%] mt-12 rounded-xl shadow-sm p-4"}`}
        >
            {" "}
            <BackHeader onBack={goBack}>
                <h1 className="text-lg font-semibold">
                    {t(importData ? "review.header" : "import.header")}
                </h1>
            </BackHeader>
            {tokenMetadata ? (
                <ImportTokenReview token={tokenMetadata} />
            ) : (
                <ImportTokenForm onSubmit={onSubmitImportToken} />
            )}
        </div>
    );
}
