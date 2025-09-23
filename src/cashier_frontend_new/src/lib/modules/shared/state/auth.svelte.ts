// DEMO: no need for complex state management tool
// This create a fully reactive global state object
export const authState = $state({
  user: "",

  get isAuthenticated(): boolean {
    return authState.user !== "";
  },

  login(user: string) {
    console.log("login: ", user);
    this.user = user;
  },

  logout() {
    console.log("logout");
    this.user = "";
  },
});
