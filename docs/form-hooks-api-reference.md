# Form Hooks API Reference

## ValidationService API

### Core Methods

#### `validateAssetsWithFees(assets, tokenMap, options)`

**Purpose**: Unified validation system for fee calculation and balance validation.

**Parameters**:

```typescript
assets: FormAsset[]           // Array of assets to validate
tokenMap: Record<string, FungibleToken>  // Token lookup map for O(1) performance
options: {
    useCase?: "create" | "claim" | "withdraw"  // Default: "create"
    linkType?: LINK_TYPE                       // Default: LINK_TYPE.SEND_TIP
    maxActionNumber?: number                   // Default: 1
    includeLinkCreationFee?: boolean          // Default: false
    skipBalanceCheck?: boolean                // Default: false
}
```

**Returns**:

```typescript
{
    isValid: boolean                          // Overall validation result
    errors: ValidationError[]                 // Array of validation errors
    totalFeesPerToken: Record<string, bigint> // Fee breakdown by token
    insufficientTokenSymbol: string | null   // Legacy compatibility
}
```

**Usage Examples**:

```typescript
// Form submission validation
const result = ValidationService.validateAssetsWithFees(formAssets, tokenMap, {
    useCase: "create",
    linkType: LINK_TYPE.SEND_TIP,
    maxActionNumber: 1,
    includeLinkCreationFee: false,
});

// Link creation validation
const result = ValidationService.validateAssetsWithFees(formAssets, tokenMap, {
    useCase: "create",
    linkType: LINK_TYPE.SEND_AIRDROP,
    maxActionNumber: 10,
    includeLinkCreationFee: true,
});
```

#### `validateLinkDetailsAssets(assets, allAvailableTokens, options)`

**Purpose**: Frontend-only validation for link details form assets.

**Parameters**:

```typescript
assets: FormAsset[]                    // Assets to validate
allAvailableTokens: FungibleToken[]   // Available tokens (can be undefined)
options: {
    isAirdrop?: boolean               // Default: false
    maxActionNumber?: number          // Default: 1
    skipCheckingBalance?: boolean     // Default: false
}
```

**Returns**:

```typescript
{
    isValid: boolean
    errors: ValidationError[]
}
```

#### `validateBalanceForUseCase(formAssets, useCase, linkType, tokenMap, options)`

**Purpose**: Enhanced balance validation for specific use cases.

**Parameters**:

```typescript
formAssets: FormAsset[]
useCase: "add_asset" | "create" | "claim" | "withdraw"
linkType: LINK_TYPE
tokenMap: Record<string, FungibleToken>
options: {
    maxActionNumber?: number
    currentClaims?: number
    linkBalance?: bigint
}
```

### Legacy Wrapper Methods

#### `calculateTotalFeesForAssets(assets, tokenMap, maxUses, includeLinkCreationFee)`

**Purpose**: Legacy wrapper that returns insufficient token symbol.

**Returns**: `string | null` - Symbol of token with insufficient balance, or null if valid.

## Form Submission Hooks API

### useSendTipFormHandler

```typescript
const { submitTipForm } = useSendTipFormHandler();

await submitTipForm(
    linkId: string,
    formAssets: FormAsset[],
    maxActionNumber: number,
    errorHandler?: (error: Error) => void
);
```

### useSendAirdropFormHandler

```typescript
const { submitAirdropForm } = useSendAirdropFormHandler();

await submitAirdropForm(
    linkId: string,
    formAssets: FormAsset[],
    maxActionNumber: number,
    errorHandler?: (error: Error) => void
);
```

### useSendTokenBasketFormHandler

```typescript
const { submitTokenBasketForm } = useSendTokenBasketFormHandler();

await submitTokenBasketForm(
    linkId: string,
    formAssets: FormAsset[],
    maxActionNumber: number,
    errorHandler?: (error: Error) => void
);
```

### useReceivePaymentFormHandler

```typescript
const { submitReceivePaymentForm } = useReceivePaymentFormHandler();

await submitReceivePaymentForm(
    linkId: string,
    formAssets: FormAsset[],
    maxActionNumber: number,
    errorHandler?: (error: Error) => void
);
```

## Validation Hooks API

### useLinkPreviewValidation

```typescript
const {
    validateLinkPreview,
    validateActionCreation,
    validateBalanceWithCreationFee,
    validateLinkPreviewWithBalance,
    showValidationErrorToast,
} = useLinkPreviewValidation();
```

#### Methods:

**`validateLinkPreview(link)`**

-   Validates basic link existence and type
-   Returns: `ValidationResult`

**`validateBalanceWithCreationFee(link, maxActionNumber?, includeLinkCreationFee)`**

-   Validates balance with configurable creation fee
-   Returns: `ValidationResult`

**`validateLinkPreviewWithBalance(link, options)`**

-   Combined validation with balance checking
-   Options: `{ maxActionNumber?: bigint, includeLinkCreationFee?: boolean }`
-   Returns: `ValidationResult`

**`validateActionCreation(link)`**

-   Simplified action creation validation
-   Returns: `ValidationResult`

### useLinkTemplateValidation

```typescript
const {
    validationState,
    validateLinkTemplate,
    clearValidationErrors,
    clearValidationError,
    isLinkTypeSupported,
    showValidationErrorToast,
    getValidationMessage,
    hasValidationErrors,
} = useLinkTemplateValidation();
```

#### Methods:

**`validateLinkTemplate(currentLink, carouselIndex)`**

-   Validates template form submission
-   Returns: `ValidationResult`

**`isLinkTypeSupported(linkType)`**

-   Checks if link type is supported
-   Returns: `boolean`

**`clearValidationErrors()`**

-   Clears all validation state
-   Returns: `void`

**`showValidationError(errorType)`**

-   Shows specific validation error
-   Returns: `void`

## Core Submission Handler API

### useSubmissionHandler

```typescript
const { handleFormSubmission, handleLinkCreation, handleTemplateSubmission } =
    useSubmissionHandler();
```

#### Context Types:

**FormSubmissionContext**:

```typescript
{
    linkId: string
    formAssets: FormAsset[]
    maxActionNumber: number
    linkType: LINK_TYPE
    skipBalanceCheck?: boolean
    isAirdrop?: boolean
    errorHandler?: (error: Error) => void
}
```

**LinkCreationContext**:

```typescript
{
    navigate: (path: string) => void
    showConfirmation: () => void
    createAction?: () => Promise<void>
    hasAction: boolean
    errorHandler?: (error: Error) => void
}
```

**TemplateSubmissionContext**:

```typescript
{
    currentLink: Partial<UserInputItem>
    carouselIndex: number
    validateTemplate: (currentLink, carouselIndex) => ValidationResult
    isLinkTypeSupported: (linkType: LINK_TYPE) => boolean
    onUnsupportedType: () => void
    errorHandler?: (error: Error) => void
}
```

## Type Definitions

### FormAsset

```typescript
interface FormAsset {
    tokenAddress: string;
    amount: bigint;
    chain?: CHAIN;
    label?: string;
    usdEquivalent?: number;
    usdConversionRate?: number;
}
```

### ValidationResult

```typescript
interface ValidationResult {
    isValid: boolean;
    errors: ValidationError[];
}
```

### ValidationError

```typescript
interface ValidationError {
    field: string;
    code: ErrorCode;
    message: string;
    metadata?: Record<string, unknown>;
}
```

### ErrorCode Enum

```typescript
enum ErrorCode {
    INSUFFICIENT_BALANCE = "INSUFFICIENT_BALANCE",
    INSUFFICIENT_BALANCE_CREATE = "INSUFFICIENT_BALANCE_CREATE",
    TOKEN_NOT_FOUND = "TOKEN_NOT_FOUND",
    NO_ASSETS_FOUND = "NO_ASSETS_FOUND",
    LINK_NOT_FOUND = "LINK_NOT_FOUND",
    ACTION_NOT_FOUND = "ACTION_NOT_FOUND",
    FORM_VALIDATION_FAILED = "FORM_VALIDATION_FAILED",
    LINK_CREATION_FAILED = "LINK_CREATION_FAILED",
    TRANSACTION_FAILED = "TRANSACTION_FAILED",
    BALANCE_CHECK_FAILED = "BALANCE_CHECK_FAILED",
    LINK_ID_MISSING = "LINK_ID_MISSING",
    USER_INPUT_NOT_FOUND = "USER_INPUT_NOT_FOUND",
    NO_CLAIMS_AVAILABLE = "NO_CLAIMS_AVAILABLE",
}
```

## Hook Dependencies

### Required Imports

```typescript
// Core React hooks
import { useCallback, useState, useEffect } from "react";

// Translation
import { useTranslation } from "react-i18next";

// UI feedback
import { toast } from "sonner";

// Custom hooks
import { useTokens } from "@/hooks/useTokens";
import { useLinkAction } from "@/hooks/useLinkAction";
import { useLinkCreationFormStore } from "@/stores/linkCreationFormStore";

// Services and types
import { ValidationService } from "@/services/validation.service";
import { ErrorCode } from "@/types/error.enum";
import { LINK_TYPE } from "@/services/types/enum";
```

### Hook Composition Pattern

```typescript
// Base hook pattern
const useMyHook = () => {
    const { t } = useTranslation();
    const { createTokenMap } = useTokens();

    const myFunction = useCallback(
        (params) => {
            const tokenMap = createTokenMap();

            const result = ValidationService.validateAssetsWithFees(
                params.assets,
                tokenMap,
                params.options,
            );

            if (!result.isValid) {
                result.errors.forEach((error) => {
                    if (error.metadata && error.message.startsWith("error.")) {
                        const message = t(error.message, error.metadata);
                        toast.error(message);
                    }
                });
            }

            return result;
        },
        [createTokenMap, t],
    );

    return { myFunction };
};
```

## Error Handling Patterns

### Template Error Handling

```typescript
const handleTemplateErrors = (errors: ValidationError[], t: Function) => {
    errors.forEach((error) => {
        if (error.metadata && error.message.startsWith("error.")) {
            // Template-based error with variables
            const message = t(error.message, error.metadata);
            toast.error(message);
        } else {
            // Plain text error
            toast.error(error.message);
        }
    });
};
```

### Batch Error Handling

```typescript
const handleValidationErrors = (result: ValidationResult) => {
    if (!result.isValid && result.errors.length > 0) {
        // Group errors by type
        const balanceErrors = result.errors.filter(
            (e) =>
                e.code === ErrorCode.INSUFFICIENT_BALANCE ||
                e.code === ErrorCode.INSUFFICIENT_BALANCE_CREATE,
        );

        const otherErrors = result.errors.filter((e) => !balanceErrors.includes(e));

        // Handle balance errors specially
        if (balanceErrors.length > 0) {
            showBalanceErrorDialog(balanceErrors);
        }

        // Handle other errors as toast
        otherErrors.forEach((error) => {
            toast.error(error.message);
        });
    }
};
```

## Performance Guidelines

### Token Map Creation

```typescript
// ✅ Good: Create once, reuse
const { createTokenMap } = useTokens();
const tokenMap = useMemo(() => createTokenMap(), [createTokenMap]);

// ❌ Bad: Create on every validation
const validate = (assets) => {
    const tokenMap = createTokenMap(); // Creates new map each time
    return ValidationService.validateAssetsWithFees(assets, tokenMap, options);
};
```

### Validation Caching

```typescript
// ✅ Good: Cache validation results
const validationCache = useRef(new Map());

const validateWithCache = useCallback(
    (assets, options) => {
        const cacheKey = JSON.stringify({ assets, options });

        if (validationCache.current.has(cacheKey)) {
            return validationCache.current.get(cacheKey);
        }

        const result = ValidationService.validateAssetsWithFees(assets, tokenMap, options);
        validationCache.current.set(cacheKey, result);

        return result;
    },
    [tokenMap],
);
```

### Debounced Validation

```typescript
// ✅ Good: Debounce real-time validation
const debouncedValidate = useMemo(
    () =>
        debounce((assets) => {
            const result = ValidationService.validateLinkDetailsAssets(assets, undefined, {
                skipCheckingBalance: false,
            });

            if (!result.isValid) {
                setValidationErrors(result.errors);
            }
        }, 300),
    [],
);
```
