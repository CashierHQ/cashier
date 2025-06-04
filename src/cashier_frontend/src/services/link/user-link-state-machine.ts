// filepath: /Users/longtran/Documents/cashier/src/cashier_frontend/src/services/link/user-state-machine.ts
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
import { LINK_USER_STATE } from "../types/enum";
import { ActionModel } from "../types/action.service.types";

/**
 * Singleton class that handles the state machine logic for user states in link interactions
 */
export class UserStateMachine {
    private static instance: UserStateMachine;

    private constructor() {
        // Private constructor to prevent direct construction calls with the `new` operator
    }

    /**
     * Get the singleton instance of UserStateMachine
     * @returns The singleton instance
     */
    public static getInstance(): UserStateMachine {
        if (!UserStateMachine.instance) {
            UserStateMachine.instance = new UserStateMachine();
        }
        return UserStateMachine.instance;
    }

    /**
     * Determines the next state based on current user state and transition direction
     * @param currentState The current user state
     * @param isContinue Whether this is a forward transition
     * @returns The next state or undefined if no transition is available
     */
    public getNextState(
        currentState: LINK_USER_STATE,
        isContinue: boolean,
    ): LINK_USER_STATE | undefined {
        const stateTransitions: Record<
            LINK_USER_STATE,
            { forward?: LINK_USER_STATE; backward?: LINK_USER_STATE }
        > = {
            [LINK_USER_STATE.NO_STATE]: {
                forward: LINK_USER_STATE.CHOOSE_WALLET,
            },
            [LINK_USER_STATE.CHOOSE_WALLET]: {
                forward: LINK_USER_STATE.COMPLETE,
            },
            [LINK_USER_STATE.COMPLETE]: {},
        };

        const transitions = stateTransitions[currentState];
        if (!transitions) {
            return undefined;
        }

        return isContinue ? transitions.forward : transitions.backward;
    }

    /**
     * Validates if the state transition is allowed based on current user state and action direction.
     * Each state has specific validation rules that must be met before allowing the transition.
     *
     * @param currentState The current user state
     * @param action The action direction ('Continue' or 'Back')
     * @param actionModel The action data associated with this user state
     * @returns Boolean indicating if the transition is valid
     * @throws Error with a descriptive message if validation fails
     */
    public validateStateTransition(
        currentState: LINK_USER_STATE,
        action: string,
        actionModel?: ActionModel,
    ): boolean {
        // NO_STATE -> CHOOSE_WALLET
        if (currentState === LINK_USER_STATE.NO_STATE) {
            if (action === "Continue") {
                // Can always move from NO_STATE to CHOOSE_WALLET
                return true;
            }

            throw new Error(`Cannot go back from ${currentState}`);
        }

        // CHOOSE_WALLET -> COMPLETE
        if (currentState === LINK_USER_STATE.CHOOSE_WALLET) {
            if (action === "Continue") {
                // Validate required fields for this transition
                if (!actionModel) {
                    throw new Error("Action is required for this transition");
                }

                // Only allow transition if action is successful
                if (actionModel.state !== "Action_state_success") {
                    throw new Error("Action must be successful to complete this transition");
                }

                return true;
            }

            throw new Error(`Invalid action ${action} for state ${currentState}`);
        }

        // COMPLETE - Final state
        if (currentState === LINK_USER_STATE.COMPLETE) {
            throw new Error(`${currentState} is a terminal state and cannot transition`);
        }

        // Default: transition not allowed
        throw new Error(`Invalid state transition from ${currentState}`);
    }

    /**
     * Validates if a user can perform an action in their current state
     * @param userState The current user state
     * @param actionType The type of action being performed
     * @returns Boolean indicating if the action is valid in the current state
     */
    public validateUserAction(userState: LINK_USER_STATE, actionType: string): boolean {
        // The actionType parameter can be used for specific action validation
        // Currently we're only checking based on state, but keeping the parameter
        // for future use cases where we might need more granular control
        switch (userState) {
            case LINK_USER_STATE.NO_STATE:
                // Can create a new action in initial state
                return true;

            case LINK_USER_STATE.CHOOSE_WALLET:
                // In CHOOSE_WALLET state, user can use their wallet for the action
                return true;

            case LINK_USER_STATE.COMPLETE:
                // In COMPLETE state, no further actions allowed
                return false;

            default:
                return false;
        }
    }

    /**
     * Maps the user state string to enum values
     * @param state The state string from the backend
     * @returns The corresponding USER_STATE enum value
     */
    public mapStringToUserState(state: string): LINK_USER_STATE {
        switch (state) {
            case "No_state":
                return LINK_USER_STATE.NO_STATE;
            case "User_state_choose_wallet":
                return LINK_USER_STATE.CHOOSE_WALLET;
            case "User_state_completed_link":
                return LINK_USER_STATE.COMPLETE;
            default:
                throw new Error(`Unknown user state: ${state}`);
        }
    }
}

// Export a singleton instance
export default UserStateMachine.getInstance();
