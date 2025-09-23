// DEMO: no need for complex state management tool
// This create a fully reactive global state object
const auth = $state ({
    user: ''
});

export const authState = {

  get user(): string {
    return auth.user;
  },
 
  // DEMO: reactive computed property
  get isAuthenticated(): boolean {
    return auth.user !== "";
  },

  login(user: string) {
    console.log("login: ", user);
    auth.user = user;
  },

  logout() {
    console.log("logout");
    auth.user = "";
  },
};
