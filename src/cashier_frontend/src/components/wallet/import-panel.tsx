// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { useTranslation } from "react-i18next";
import { useState } from "react";
import { ImportTokenForm } from "@/components/import-token/form";
import { ImportTokenFormData } from "@/hooks/import-token.hooks";
import { ImportTokenReview } from "@/components/import-token/review";
import { TokenUtilService } from "@/services/tokenUtils.service";
import { Spinner } from "@/components/ui/spinner";
import { ChevronLeft } from "lucide-react";
import { useTokensV2 } from "@/hooks/token/useTokensV2";

interface ImportPanelProps {
  onBack: () => void;
}

// eslint-disable-next-line react/prop-types
const ImportPanel: React.FC<ImportPanelProps> = ({ onBack }) => {
  const { t } = useTranslation();
  const { getToken } = useTokensV2();
  const [tokenMetadata, setTokenMetadata] = useState<{
    name: string;
    symbol: string;
    logo?: string;
    chain: string;
    address: string;
    decimals: number;
    index_id?: string;
  }>();
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  function goBack() {
    if (tokenMetadata) {
      setTokenMetadata(undefined);
    } else {
      onBack();
    }
  }

  const onSubmitImportToken = async (data: ImportTokenFormData) => {
    setIsImporting(true);
    setImportError(null);

    try {
      // Check if token already exists in the user's token list
      const existingToken = getToken(data.ledgerCanisterId);

      if (existingToken) {
        // Provide different messages based on whether the token is enabled or disabled
        const errorMessage = t("import.error.token_already_existed", {
          tokenName: existingToken.name,
          tokenSymbol: existingToken.symbol,
          defaultValue: `Token "${existingToken.name} (${existingToken.symbol})" is already in your wallet`,
        });

        throw new Error(errorMessage);
      }

      const metadata = await TokenUtilService.getTokenMetadata(
        data.ledgerCanisterId,
      );

      if (!metadata) {
        throw new Error(
          t("import.error.metadataNotFound", {
            defaultValue:
              "Token metadata not found. Please check the canister ID and try again.",
          }),
        );
      }

      // Transform the metadata into the format expected by your state
      const tokenMetadata = {
        name: metadata.name,
        symbol: metadata.symbol,
        logo: metadata.icon, // Assuming IcrcTokenMetadata has an 'icon' property
        chain: data.chain, // Use the chain from the form data
        address: data.ledgerCanisterId, // Use the canisterId as the address
        decimals: metadata.decimals,
        index_id: data.indexCanisterId,
      };

      setTokenMetadata(tokenMetadata);
    } catch (error) {
      console.error("Failed to process token import:", error);
      setImportError(
        error instanceof Error
          ? error.message
          : t("import.error.generic", {
              defaultValue: "Failed to process token import. Please try again.",
            }),
      );
    } finally {
      setIsImporting(false);
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
        <div className="mt-4 p-3 bg-red-100 text-red-800 rounded-md">
          {importError}
        </div>
      )}

      <div className="relative flex-grow">
        {/* Loading Overlay */}
        {isImporting && (
          <div className="absolute inset-0 bg-white bg-opacity-80 z-50 flex items-center justify-center rounded-md">
            <div className="flex flex-col items-center">
              <Spinner width={40} height={40} />
              <p className="mt-4 text-gray-700">
                {t("import.loading.fetchMetdata")}
              </p>
            </div>
          </div>
        )}

        {tokenMetadata ? (
          // where call to the backend
          <ImportTokenReview token={tokenMetadata} />
        ) : (
          <ImportTokenForm onSubmit={onSubmitImportToken} />
        )}
      </div>
    </div>
  );
};

export default ImportPanel;
