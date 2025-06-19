# Action Handling Methods Documentation

This document describes the key action handling methods used in the LinkPreview, ChooseWallet, and Details pages components.

## Common Props in ConfirmationDrawerV2

### `handleSuccessContinue: () => Promise<void>`

The callback function that is called after a successful transaction to continue the workflow. Each component implements this differently based on the next step in their workflow:

-   **LinkPreview**: Sets the link to active state
-   **ChooseWallet**: Updates link user state and navigates to complete page
-   **Details**: Sets the link to inactive state after withdrawal

### `handleConfirmTransaction: () => Promise<void>`

The main function that handles the transaction process. Each component implements this for their specific use case:

-   **LinkPreview**: Handles link creation transaction

    -   Validates the link
    -   Processes the action
    -   Executes ICRC-112 transactions
    -   Updates action state

-   **ChooseWallet**: Handles link usage/claiming transaction

    -   Processes the use action
    -   Executes ICRC-1 12transactions for authenticated/anonymous users
    -   Updates action state
    -   Refreshes link user state

-   **Details**: Handles withdrawal transaction
    -   Processes withdrawal action
    -   Executes ICRC-112 transactions
    -   Updates action state
    -   Sets processing state for polling

### `onActionResult: (action: ActionModel) => void`

Callback function to handle updates to the action state. Used to:

-   Update local action state
-   Trigger UI updates
-   Handle state changes in the parent component

## Component-Specific Implementations

### LinkPreview Component

```typescript
handleSuccessContinue: async () => {
    // Sets the link to ACTIVE state after successful creation
    // Redirects to details page if successful
    await handleSetLinkToActive();
};

handleConfirmTransaction: async () => {
    // Validates and processes link creation
    // Executes token transactions
    // Updates action state
    await handleConfirmTransaction();
};

onActionResult: (action: ActionModel) => {
    // Updates the local action state
    setAction(action);
};
```

### ChooseWallet Component

```typescript
handleSuccessContinue: async () => {
    // Updates link user state
    // Refreshes link details
    // Navigates to complete page if state is COMPLETE
    await handleUpdateLinkUserState();
};

handleConfirmTransaction: async () => {
    // Handles the entire claiming process
    // Manages processing state
    // Refreshes data after completion
    await startTransaction();
};

onActionResult: (action: ActionModel) => {
    // Passed through to parent for state management
    // Used to update UI based on action state
};
```

### Details Component

```typescript
handleSuccessContinue: async () => {
    // Sets link to inactive after successful withdrawal
    // Updates UI state
    await setInactiveEndedLink();
};

handleConfirmTransaction: async () => {
    // Processes withdrawal
    // Handles transaction execution
    // Manages polling for updates
    await handleWithdrawProcess();
};

onActionResult: (action: ActionModel) => {
    // Updates local action state
    // Used for UI updates during withdrawal process
    handleActionResult(action);
};
```

## Common Patterns

1. **Error Handling**

    - All methods include try-catch blocks
    - Use onCashierError for error notifications
    - Clean up states in finally blocks

2. **State Management**

    - Update loading/processing states
    - Refresh data after successful operations
    - Handle UI updates based on state changes

3. **Data Refresh**
    - Use enhancedRefresh for comprehensive updates
    - Multiple refetch calls to ensure data consistency
    - Polling for real-time updates during processing

## Best Practices

1. **Validation**

    - Always validate prerequisites before transactions
    - Check for required data (link, action, etc.)
    - Validate balances for send-type links

2. **State Updates**

    - Use setAction to keep local state in sync
    - Update UI states (loading, processing, etc.)
    - Handle both success and error cases

3. **Clean Up**

    - Clear intervals and timeouts
    - Reset UI states
    - Handle incomplete transactions

4. **Data Consistency**
    - Multiple refetch calls when needed
    - Use polling for real-time updates
    - Verify state changes after transactions
