/**
 * The connected X (Twitter) profile returned after a user authorizes via the gate SDK.
 */
export type XProfile = {
  id: string;
  username: string;
  name: string;
  profile_image_url: string;
};
