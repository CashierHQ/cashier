# Cashier Frontend Documentation

## Getting Started

### Prerequisites

-   Node.js (v16 or higher)
-   npm or yarn
-   [Internet Computer Development Environment (DFX)](https://internetcomputer.org/docs/building-apps/getting-started/install)

### Installation and Running the Project

1. Clone the repository

2. Install dependencies:

    ```bash
    npm install
    ```

3. Generate declarations folders:

    ```bash
    make g
    ```

    This step is crucial as it generates the necessary declaration files in the local environment before running the application.

4. Start the application:
    ```bash
    npm start
    ```

## Architecture

The application follows a modern React architecture with the following key elements:

1. **Component-Based Structure**: UI elements are organized into reusable components.
2. **Context API**: Used for state management across component trees.
3. **Custom Hooks**: Encapsulate common logic and state management.
4. **Services**: Handle API interactions with the backend canisters.
5. **Zustand Stores**: Provide global state management.
6. **React Router**: Manages navigation and routing.

## Core Technologies

-   **React**: UI library
-   **TypeScript**: Static typing
-   **Vite**: Build tool
-   **Tailwind CSS**: Utility-first CSS framework
-   **React Router**: Routing library
-   **Zustand**: State management
-   **i18next**: Internationalization
-   **Internet Computer SDK**: Interaction with the IC blockchain

## Important Directories and Files

### `/src/components`

Contains all reusable UI components organized by feature.

### `/src/contexts`

React context providers:

-   `multistep-form-context.tsx`: Manages multi-step forms
-   `signer-list-context.tsx`: Manages wallet connections

### `/src/hooks`

Custom React hooks:

-   `linkHooks.ts`: Hooks for link-related operations
-   `useConnectToWallet.ts`: Wallet connection hook
-   `use-toast.ts`: Notification system
-   And many more specialized hooks

### `/src/pages`

Page components organized by route:

-   `/[id]/index.tsx`: Claim page
-   `/details/[id]/index.tsx`: Link details page
-   `/edit/[id]/index.tsx`: Link editing page
-   `/wallet/`: Wallet-related pages

### `/src/services`

Backend service integrations:

-   `link.service.ts`: Link management
-   `tokenUtils.service.ts`: Token utilities
-   `usdConversionService/`: USD conversion services
-   `signerService/`: Wallet signing services

### `/src/stores`

Zustand stores:

-   `createLinkStore.ts`: Link creation state
-   `buttonStateStore.ts`: UI button states

## Common Tasks

### Adding a New Page

1. Create a new directory in `/src/pages`
2. Create the page component
3. Add the route to `/src/Router.tsx`

### Creating a New Component

1. Create a new directory in `/src/components`
2. Create component files following the established pattern
3. Export the component for use in other parts of the application

### Adding a New Service

1. Create a new file in `/src/services`
2. Define the service class with methods for backend interaction
3. Add type definitions for request and response data

### Adding a New Store

1. Create a new file in `/src/stores`
2. Define the store using Zustand
3. Add the store to the reset function in `/src/stores/index.ts`

## Resources

-   [Internet Computer Documentation](https://internetcomputer.org/docs/current/developer-docs/)
-   [React Documentation](https://reactjs.org/docs/getting-started.html)
-   [TypeScript Documentation](https://www.typescriptlang.org/docs/)
-   [Zustand Documentation](https://github.com/pmndrs/zustand)
-   [ICRC Token Standards](https://github.com/dfinity/ICRC-1)
