// DEMO: no need for complex state management tool

import { localStorageState } from "../localStorage.svelte";

//DEMO: This create a fully reactive global state object
// const auth = $state({
//     user: ''
// });

// DEMO: This create a fully reactive state object that is automatically persisted with local storage
const auth = localStorageState('auth', {
    user: ''
});

export const authState = {

    get user(): string {
        return auth.value.user;
    },

    // DEMO: reactive computed property
    get isAuthenticated(): boolean {
        return auth.value.user !== "";
    },

    login(user: string) {
        console.log("login: ", user);
        auth.value = {
            user
        };
    },

    logout() {
        console.log("logout");
        auth.value = {
            user: ""
        };
    },
};
