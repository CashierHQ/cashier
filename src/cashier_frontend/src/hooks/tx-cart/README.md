# Transaction Confirmation Hooks

This folder contains custom hooks that encapsulate the confirmation logic for different types of transaction actions in the Cashier application.

## Hooks Overview

### `useUseConfirmation`

**File:** `useUseConfirmation.ts`  
**Purpose:** Handles confirmation logic for USE_LINK actions (claiming/using existing links)  
**Used in:** `pages/[id]/choose-wallet.tsx`

**Key Methods:**

- `handleSuccessContinue` - Updates link user state and navigates to completion
- `handleConfirmTransaction` - Validates and processes the use transaction
- `onActionResult` - Handles action success/failure notifications
- `onCashierError` - Handles error display with toast notifications

### `useWithdrawConfirmation`

**File:** `useWithdrawConfirmation.ts`  
**Purpose:** Handles confirmation logic for WITHDRAW_LINK actions (withdrawing assets from links)  
**Used in:** `pages/details/[id]/index.tsx`

**Key Methods:**

- `handleSuccessContinue` - Sets link to inactive ended state after withdrawal
- `handleConfirmTransaction` - Processes the withdrawal transaction
- `onActionResult` - Updates action state
- `onCashierError` - Handles errors and closes confirmation drawer

### `useCreateConfirmation`

**File:** `useCreateConfirmation.ts`  
**Purpose:** Handles confirmation logic for CREATE_LINK actions (creating new links)  
**Used in:** `pages/edit/[id]/LinkPreview.tsx`

**Key Methods:**

- `handleSuccessContinue` - Sets link to active state after creation
- `handleConfirmTransaction` - Processes the link creation transaction
- `onActionResult` - Updates internal action state
- `onCashierError` - Passes through error handling to parent component

## Benefits

1. **Separation of Concerns** - Business logic separated from UI components
2. **Reusability** - Confirmation logic can be reused across similar components
3. **Maintainability** - Related functionality grouped together
4. **Testability** - Business logic can be tested independently
5. **Cleaner Components** - UI components focus on presentation logic

## Usage Pattern

```typescript
// Import the appropriate hook
import { useUseConfirmation } from '@/hooks/tx-cart';

// Use in component
const {
    handleSuccessContinue,
    handleConfirmTransaction,
    onActionResult,
    onCashierError,
} = useUseConfirmation({
    linkId,
    link,
    internalAction,
    setInternalAction,
    // ... other required props
});

// Pass to ConfirmationDrawerV2
<ConfirmationDrawerV2
    open={showConfirmation}
    link={link}
    action={internalAction}
    onClose={() => setShowConfirmation(false)}
    onActionResult={onActionResult}
    onCashierError={onCashierError}
    handleSuccessContinue={handleSuccessContinue}
    handleConfirmTransaction={handleConfirmTransaction}
/>
```

## Architecture

Each hook follows the same pattern:

1. Accepts necessary dependencies as props
2. Uses appropriate mutation hooks for API calls
3. Implements validation logic specific to the action type
4. Returns standardized method signatures for ConfirmationDrawerV2
5. Handles error cases and success flows appropriately

## TypeScript

All hooks are fully typed with:

- Input prop interfaces (`Use*ConfirmationProps`)
- Return type interfaces (`Use*ConfirmationReturn`)
- Proper error handling with typed catch blocks
- Callback function signatures for consistency
