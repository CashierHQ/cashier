import { locale } from "$lib/i18n";
import { GateType, type GateDraft } from "$modules/gating/types/gate";

const TWEET_URL_PATTERN = /^https:\/\/x\.com\/.+\/status\/\d+$/;

export class GatingStore {
  #selectedGateTypes = $state<GateType[]>([]);
  #password = $state("");
  #confirmPassword = $state("");
  #configuredPassword = $state<string | null>(null);
  #xFollowingHandle = $state<string | null>(null);
  #xFollowingDraft = $state("");
  #xRewardAccountDraft = $state("");
  #xOwnedAccountHandle = $state<string | null>(null);
  #xOwnedAccountDraft = $state("");
  #xLikedPostUrl = $state<string | null>(null);
  #xLikedPostDraft = $state("");
  #xRetweetedPostUrl = $state<string | null>(null);
  #xRetweetedPostDraft = $state("");

  get selectedGateTypes(): GateType[] {
    return this.#selectedGateTypes;
  }

  get password(): string {
    return this.#password;
  }

  get confirmPassword(): string {
    return this.#confirmPassword;
  }

  get xFollowingDraft(): string {
    return this.#xFollowingDraft;
  }

  get xRewardAccountDraft(): string {
    return this.#xRewardAccountDraft;
  }

  get xOwnedAccountDraft(): string {
    return this.#xOwnedAccountDraft;
  }

  get xLikedPostDraft(): string {
    return this.#xLikedPostDraft;
  }

  get xRetweetedPostDraft(): string {
    return this.#xRetweetedPostDraft;
  }

  get hasConfiguredPassword(): boolean {
    return this.#configuredPassword !== null;
  }

  get hasConfiguredXFollowing(): boolean {
    return this.#xFollowingHandle !== null;
  }

  get hasConfiguredXOwnedAccount(): boolean {
    return this.#xOwnedAccountHandle !== null;
  }

  get hasConfiguredXLikedPost(): boolean {
    return this.#xLikedPostUrl !== null;
  }

  get hasConfiguredXRetweetedPost(): boolean {
    return this.#xRetweetedPostUrl !== null;
  }

  get xFollowingHandle(): string | null {
    return this.#xFollowingHandle;
  }

  get xOwnedAccountHandle(): string | null {
    return this.#xOwnedAccountHandle;
  }

  get xLikedPostUrl(): string | null {
    return this.#xLikedPostUrl;
  }

  get xRetweetedPostUrl(): string | null {
    return this.#xRetweetedPostUrl;
  }

  get hasLocks(): boolean {
    return (
      this.hasConfiguredPassword ||
      this.hasConfiguredXFollowing ||
      this.hasConfiguredXOwnedAccount ||
      this.hasConfiguredXLikedPost ||
      this.hasConfiguredXRetweetedPost
    );
  }

  get passwordSetupError(): string | null {
    if (this.#password.trim().length === 0) {
      return locale.t("links.linkForm.lock.errors.passwordRequired");
    }
    if (this.#confirmPassword.trim().length === 0) {
      return locale.t("links.linkForm.lock.errors.confirmPasswordRequired");
    }
    if (this.#password !== this.#confirmPassword) {
      return locale.t("links.linkForm.lock.errors.passwordsDifferent");
    }
    return null;
  }

  get xFollowingSetupError(): string | null {
    if (this.#xFollowingDraft.trim().length === 0) {
      return (
        locale.t("links.linkForm.lock.errors.xHandleRequired") ??
        "X handle is required"
      );
    }
    return null;
  }

  get xOwnedAccountSetupError(): string | null {
    if (this.#xOwnedAccountDraft.trim().length === 0) {
      return (
        locale.t("links.linkForm.lock.errors.xHandleRequired") ??
        "X handle is required"
      );
    }
    return null;
  }

  get xLikedPostSetupError(): string | null {
    const url = this.#xLikedPostDraft.trim();
    if (url.length === 0) {
      return (
        locale.t("links.linkForm.lock.errors.tweetUrlRequired") ??
        "Tweet URL is required"
      );
    }
    if (!TWEET_URL_PATTERN.test(url)) {
      return (
        locale.t("links.linkForm.lock.errors.tweetUrlInvalid") ??
        "Enter a valid X post URL"
      );
    }
    return null;
  }

  get xRetweetedPostSetupError(): string | null {
    const url = this.#xRetweetedPostDraft.trim();
    if (url.length === 0) {
      return (
        locale.t("links.linkForm.lock.errors.tweetUrlRequired") ??
        "Tweet URL is required"
      );
    }
    if (!TWEET_URL_PATTERN.test(url)) {
      return (
        locale.t("links.linkForm.lock.errors.tweetUrlInvalid") ??
        "Enter a valid X post URL"
      );
    }
    return null;
  }

  get gateDrafts(): GateDraft[] {
    const gates: GateDraft[] = [];

    if (this.hasConfiguredPassword) {
      gates.push({
        type: GateType.PASSWORD,
        password: this.#configuredPassword ?? "",
      });
    }

    if (this.hasConfiguredXFollowing) {
      gates.push({
        type: GateType.X_FOLLOWING,
        targetHandle: this.#xFollowingHandle ?? "",
        rewardAccount: this.#xRewardAccountDraft,
      });
    }

    if (this.hasConfiguredXOwnedAccount) {
      gates.push({
        type: GateType.X_OWNED_ACCOUNT,
        targetHandle: this.#xOwnedAccountHandle ?? "",
      });
    }

    if (this.hasConfiguredXLikedPost) {
      gates.push({
        type: GateType.X_LIKED_POST,
        tweetUrl: this.#xLikedPostUrl ?? "",
      });
    }

    if (this.hasConfiguredXRetweetedPost) {
      gates.push({
        type: GateType.X_RETWEETED_POST,
        tweetUrl: this.#xRetweetedPostUrl ?? "",
      });
    }

    return gates;
  }

  setPassword(password: string): void {
    this.#password = password;
  }

  setConfirmPassword(confirmPassword: string): void {
    this.#confirmPassword = confirmPassword;
  }

  setXFollowingDraft(handle: string): void {
    this.#xFollowingDraft = handle.startsWith("@") ? handle.slice(1) : handle;
  }

  setXRewardAccountDraft(handle: string): void {
    this.#xRewardAccountDraft = handle.startsWith("@")
      ? handle.slice(1)
      : handle;
  }

  setXOwnedAccountDraft(handle: string): void {
    this.#xOwnedAccountDraft = handle.startsWith("@")
      ? handle.slice(1)
      : handle;
  }

  setXLikedPostDraft(url: string): void {
    this.#xLikedPostDraft = url;
  }

  setXRetweetedPostDraft(url: string): void {
    this.#xRetweetedPostDraft = url;
  }

  savePasswordLock(): void {
    if (this.passwordSetupError) return;

    this.#configuredPassword = this.#password.trim();
    if (!this.#selectedGateTypes.includes(GateType.PASSWORD)) {
      this.#selectedGateTypes = [...this.#selectedGateTypes, GateType.PASSWORD];
    }
  }

  saveXFollowingLock(): void {
    if (this.xFollowingSetupError) return;

    this.#xFollowingHandle = this.#xFollowingDraft.trim();
    if (!this.#selectedGateTypes.includes(GateType.X_FOLLOWING)) {
      this.#selectedGateTypes = [
        ...this.#selectedGateTypes,
        GateType.X_FOLLOWING,
      ];
    }
  }

  saveXOwnedAccountLock(): void {
    if (this.xOwnedAccountSetupError) return;

    this.#xOwnedAccountHandle = this.#xOwnedAccountDraft.trim();
    if (!this.#selectedGateTypes.includes(GateType.X_OWNED_ACCOUNT)) {
      this.#selectedGateTypes = [
        ...this.#selectedGateTypes,
        GateType.X_OWNED_ACCOUNT,
      ];
    }
  }

  saveXLikedPostLock(): void {
    if (this.xLikedPostSetupError) return;

    this.#xLikedPostUrl = this.#xLikedPostDraft.trim();
    if (!this.#selectedGateTypes.includes(GateType.X_LIKED_POST)) {
      this.#selectedGateTypes = [
        ...this.#selectedGateTypes,
        GateType.X_LIKED_POST,
      ];
    }
  }

  saveXRetweetedPostLock(): void {
    if (this.xRetweetedPostSetupError) return;

    this.#xRetweetedPostUrl = this.#xRetweetedPostDraft.trim();
    if (!this.#selectedGateTypes.includes(GateType.X_RETWEETED_POST)) {
      this.#selectedGateTypes = [
        ...this.#selectedGateTypes,
        GateType.X_RETWEETED_POST,
      ];
    }
  }

  clearPasswordDraft(): void {
    this.#password = "";
    this.#confirmPassword = "";
  }

  clearXFollowingDraft(): void {
    this.#xFollowingDraft = "";
    this.#xRewardAccountDraft = "";
  }

  clearXOwnedAccountDraft(): void {
    this.#xOwnedAccountDraft = "";
  }

  clearXLikedPostDraft(): void {
    this.#xLikedPostDraft = "";
  }

  clearXRetweetedPostDraft(): void {
    this.#xRetweetedPostDraft = "";
  }

  resetAll(): void {
    this.#selectedGateTypes = [];
    this.#password = "";
    this.#confirmPassword = "";
    this.#configuredPassword = null;
    this.#xFollowingHandle = null;
    this.#xFollowingDraft = "";
    this.#xRewardAccountDraft = "";
    this.#xOwnedAccountHandle = null;
    this.#xOwnedAccountDraft = "";
    this.#xLikedPostUrl = null;
    this.#xLikedPostDraft = "";
    this.#xRetweetedPostUrl = null;
    this.#xRetweetedPostDraft = "";
  }
}
