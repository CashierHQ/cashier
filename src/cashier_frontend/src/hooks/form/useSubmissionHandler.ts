// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  useLinkCreationFormStore,
  UserInputItem,
} from "@/stores/linkCreationFormStore";
import { useMultiStepFormContext } from "@/contexts/multistep-form-context";
import { stateToStepIndex } from "@/pages/edit/[id]";
import { formatAssetsForSubmission } from "@/components/link-details/form-handlers";
import { ValidationService } from "@/services/validation.service";
import { LINK_TYPE, getAssetLabelForLinkType } from "@/services/types/enum";
import { LOCAL_lINK_ID_PREFIX } from "@/services/link/link-local-storage.service.v2";
import {
  mapLinkDtoToUserInputItem,
  mapLinkStateToEnum,
} from "@/services/types/mapper/link.service.mapper";
import { LinkDetailModel } from "@/services/types/link.service.types";

// Import centralized validation types and error handling
import { ValidationResult, FormAsset } from "@/types/validation.types";
import { ErrorCode } from "@/types/error.enum";
import { useErrorHandler } from "@/services/error-handler.service";
import { useLinkMutations } from "../useLinkMutations";
import { useTokensV2 } from "../token/useTokensV2";

// Types for different submission contexts
interface BaseSubmissionContext {
  errorHandler?: (error: Error) => void;
}

export interface FormSubmissionContext extends BaseSubmissionContext {
  linkId: string;
  formAssets: FormAsset[];
  maxActionNumber: number;
  linkType: LINK_TYPE;
  skipBalanceCheck?: boolean;
  isAirdrop?: boolean;
}

interface LinkCreationContext extends BaseSubmissionContext {
  navigate: (path: string) => void;
  showConfirmation: () => void;
  createAction?: () => Promise<void>;
  hasAction: boolean;
}

export interface TemplateSubmissionContext extends BaseSubmissionContext {
  currentLink: Partial<UserInputItem>;
  carouselIndex: number;
  validateTemplate: (
    currentLink: Partial<UserInputItem> | undefined,
    carouselIndex: number,
  ) => ValidationResult;
  isLinkTypeSupported: (linkType: LINK_TYPE) => boolean;
  onUnsupportedType: () => void;
}

// Common submission patterns
export const useSubmissionHandler = (link: LinkDetailModel) => {
  const { t } = useTranslation();
  const { callLinkStateMachine, createNewLink } = useLinkMutations();

  const { updateUserInput, getUserInput, addUserInput } =
    useLinkCreationFormStore();
  const { getTokenPrice, createTokenMap } = useTokensV2();
  const { setStep } = useMultiStepFormContext();
  const errorHandler = useErrorHandler();

  // Form validation and submission logic
  const handleFormSubmission = useCallback(
    async (context: FormSubmissionContext) => {
      const {
        linkId,
        formAssets,
        maxActionNumber,
        linkType,
        skipBalanceCheck = false,
        isAirdrop = false,
      } = context;

      try {
        if (!linkId) {
          throw errorHandler.createError(
            ErrorCode.LINK_ID_MISSING,
            {},
            "Link ID not found",
          );
        }
        if (!formAssets || formAssets.length === 0) {
          throw errorHandler.createError(
            ErrorCode.NO_ASSETS_FOUND,
            {},
            "No assets found",
          );
        }

        const tokenMap = createTokenMap();

        // Check balance if not skipped
        if (!skipBalanceCheck) {
          // Use the unified validation system
          const validationResult = ValidationService.validateAssetsWithFees(
            formAssets,
            tokenMap,
            {
              useCase: "create",
              linkType,
              maxActionNumber: isAirdrop ? maxActionNumber : 1,
              includeLinkCreationFee: false,
              skipBalanceCheck: false,
            },
          );

          // Check for validation errors and insufficient balance
          if (
            !validationResult.isValid ||
            validationResult.insufficientTokenSymbol
          ) {
            const insufficientToken = validationResult.insufficientTokenSymbol;

            // Handle validation errors
            if (validationResult.errors.length > 0) {
              for (const error of validationResult.errors) {
                let message = error.message;
                if (error.metadata && error.message.startsWith("error.")) {
                  message = t(error.message, error.metadata);
                }
                console.error("Validation error:", message);
                toast.error(message);
              }
              return;
            }

            // Handle insufficient balance specifically
            if (insufficientToken) {
              console.warn(
                `Insufficient balance for token: ${insufficientToken}`,
              );
              throw errorHandler.createError(
                ErrorCode.INSUFFICIENT_BALANCE,
                {
                  tokenSymbol: insufficientToken,
                },
                `Insufficient balance for ${insufficientToken}`,
              );
            }
          }
        }

        // Check max action number
        if (maxActionNumber <= 0) {
          throw errorHandler.createError(
            ErrorCode.NO_USES_AVAILABLE,
            {},
            "No more uses available",
          );
        }

        // Additional basic validation using unified system (mainly for form structure)
        const basicValidationResult =
          ValidationService.validateLinkDetailsAssets(formAssets, tokenMap, {
            isAirdrop,
            maxActionNumber: isAirdrop ? maxActionNumber : 1,
            skipCheckingBalance: true, // We already checked balance above
          });

        if (!basicValidationResult.isValid) {
          for (const error of basicValidationResult.errors) {
            console.error("Basic validation error:", error.message);
            toast.error(error.message);
          }
          return;
        }

        // Create a minimal link object for formatAssetsForSubmission
        const linkForFormatting = { linkType, id: linkId };
        const formattedAssets = formatAssetsForSubmission(
          formAssets,
          linkForFormatting as LinkDetailModel,
        );

        // Update store with formatted assets
        const storeAssets = formattedAssets.map((asset) => ({
          address: asset.tokenAddress,
          linkUseAmount: asset.amount,
          chain: asset.chain!,
          label: asset.label!,
          usdEquivalent: 0,
          usdConversionRate: getTokenPrice(asset.tokenAddress) || 0,
        }));

        updateUserInput(linkId, {
          asset_info: storeAssets,
          maxActionNumber: BigInt(maxActionNumber),
        });

        const input = getUserInput(linkId);
        if (!input) {
          throw errorHandler.createError(
            ErrorCode.USER_INPUT_NOT_FOUND,
            {},
            "Input not found",
          );
        }

        // Call state machine
        const stateMachineResponse = await callLinkStateMachine({
          linkId,
          linkModel: input,
          isContinue: true,
        });

        const state = mapLinkStateToEnum(stateMachineResponse.state);
        const stepIndex = stateToStepIndex(state);
        setStep(stepIndex);
      } catch (error) {
        console.error("Form submission error:", error);

        // Use the context's error handler if provided, otherwise display the error
        if (context.errorHandler) {
          context.errorHandler(
            error instanceof Error ? error : new Error(String(error)),
          );
        } else {
          errorHandler.displayError(error);
        }
      }
    },
    [
      callLinkStateMachine,
      createTokenMap,
      getTokenPrice,
      getUserInput,
      setStep,
      t,
      updateUserInput,
      errorHandler,
    ],
  );

  // Link creation submission logic
  const handleLinkCreation = useCallback(
    async (context: LinkCreationContext) => {
      const { navigate, showConfirmation, createAction, hasAction } = context;

      if (!link) {
        toast.error(t("common.error"), {
          description: t("error.resource.link_not_found"),
        });
        return;
      }

      if (link.id.startsWith(LOCAL_lINK_ID_PREFIX)) {
        // Create new link in backend
        const res = await createNewLink(link.id);

        if (!res) {
          toast.error(t("common.error"), {
            description: t("error.link.link_creation_failed"),
          });
          return;
        }

        const input = mapLinkDtoToUserInputItem(res?.link);
        addUserInput(res.link.id, input);

        if (res) {
          navigate(`/edit/${res.link.id}?redirect=true&oldId=${res.oldId}`);
        }
      } else {
        // Existing link - create action if needed
        if (!hasAction && createAction) {
          await createAction();
        }
        showConfirmation();
      }
    },
    [link, createNewLink, addUserInput],
  );

  // Template submission logic
  const handleTemplateSubmission = useCallback(
    async (context: TemplateSubmissionContext) => {
      const {
        currentLink,
        carouselIndex,
        validateTemplate,
        isLinkTypeSupported,
        onUnsupportedType,
      } = context;

      // Validate template
      const validationResult = validateTemplate(currentLink, carouselIndex);
      if (!validationResult.isValid) {
        return; // Validation errors handled by validation system
      }

      if (isLinkTypeSupported(currentLink?.linkType as LINK_TYPE)) {
        if (!currentLink || !currentLink.linkId) {
          toast.error(t("common.error"), {
            description: t("error.resource.link_not_found"),
          });
          return;
        }

        // Handle multi-asset to single-asset transition
        const supportMultiAsset = [LINK_TYPE.SEND_TOKEN_BASKET];
        if (
          !supportMultiAsset.includes(currentLink?.linkType as LINK_TYPE) &&
          currentLink.asset_info &&
          currentLink.asset_info.length > 1
        ) {
          const forceNewAsset = currentLink.asset_info[0];
          forceNewAsset.label = getAssetLabelForLinkType(
            currentLink.linkType as LINK_TYPE,
            forceNewAsset.address,
          );
          currentLink.asset_info = [forceNewAsset];
        }

        // Call state machine
        const stateMachineRes = await callLinkStateMachine({
          linkId: currentLink.linkId,
          linkModel: currentLink,
          isContinue: true,
        });
        const state = mapLinkStateToEnum(stateMachineRes.state);
        const stepIndex = stateToStepIndex(state);
        setStep(stepIndex);
      } else {
        onUnsupportedType();
      }
    },
    [callLinkStateMachine, setStep],
  );

  return {
    handleFormSubmission,
    handleLinkCreation,
    handleTemplateSubmission,
  };
};
