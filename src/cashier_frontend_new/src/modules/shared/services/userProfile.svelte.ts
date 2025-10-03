import { authState } from "$modules/auth/state/auth.svelte";

/**
 * Service for accessing the profile of the current user.
 * It contains data about:
 * - Whether the user is logged in
 * - The user id
 * - The user roles and permissions (not implemented yet)
 *
 * This service is used to customize the UI based on the user profile.
 *
 */
export const userProfile = {
  /**
   * Check if the user profile data is ready.
   * Currently, this is the same as `authState.isReady`, but it can be extended in the future
   * to include additional checks.
   * @returns True if the user profile is ready, false otherwise
   */
  isReady: (): boolean => {
    return authState.isReady;
  },

  /**
   * Check if the user is logged in.
   * Equivalent to `authState.isLoggedIn`
   * @returns True if the user is logged in, false otherwise
   */
  isLoggedIn: (): boolean => {
    return authState.isLoggedIn;
  },

  /**
   * Get the user id.
   * Equivalent to `authState.account.owner`
   * @returns The user id
   */
  getUserId: (): string | undefined => {
    return authState.account?.owner;
  },
};
