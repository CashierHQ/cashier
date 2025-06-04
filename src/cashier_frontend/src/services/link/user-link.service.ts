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

import { ActionModel } from "../types/action.service.types";
import { LINK_USER_STATE } from "../types/enum";
import userStateMachine from "./user-link-state-machine";

/**
 * Service for handling user link state transitions
 * This service uses the UserStateMachine to validate and perform state transitions
 * without storing the state itself
 */
export class UserLinkService {
    private static instance: UserLinkService;

    private constructor() {
        // Private constructor to prevent direct construction calls with the `new` operator
    }

    /**
     * Get the singleton instance of UserLinkService
     * @returns The singleton instance
     */
    public static getInstance(): UserLinkService {
        if (!UserLinkService.instance) {
            UserLinkService.instance = new UserLinkService();
        }
        return UserLinkService.instance;
    }

    /**
     * Triggers a state transition in the user state machine
     *
     * @param currentState The current user state
     * @param action The action to perform ('Continue' or 'Back')
     * @param actionModel Optional action data required for certain transitions
     * @returns The new state after the transition
     * @throws Error if the transition is invalid
     */
    public triggerStateTransition(
        currentState: LINK_USER_STATE,
        action: string,
        actionModel?: ActionModel,
    ): LINK_USER_STATE {
        // First validate if the transition is allowed
        const isValid = userStateMachine.validateStateTransition(currentState, action, actionModel);

        if (!isValid) {
            throw new Error(`Invalid state transition from ${currentState} with action ${action}`);
        }

        // Get the next state based on the current state and action direction
        const isContinue = action === "Continue";
        const nextState = userStateMachine.getNextState(currentState, isContinue);

        if (!nextState) {
            throw new Error(
                `No valid transition found from state ${currentState} with action ${action}`,
            );
        }

        return nextState;
    }

    /**
     * Checks if a specific action is valid in the current user state
     *
     * @param userState The current user state
     * @param actionType The type of action being performed
     * @returns Boolean indicating if the action is valid in the current state
     */
    public isActionValid(userState: LINK_USER_STATE, actionType: string): boolean {
        return userStateMachine.validateUserAction(userState, actionType);
    }

    /**
     * Convert string representation of user state to enum
     *
     * @param stateString The state string from backend
     * @returns The corresponding LINK_USER_STATE enum value
     */
    public stringToUserState(stateString: string): LINK_USER_STATE {
        return userStateMachine.mapStringToUserState(stateString);
    }
}

// Export a singleton instance
export default UserLinkService.getInstance();
