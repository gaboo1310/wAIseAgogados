// export const types = {
//     login: '[Auth] Login',
//     logout:'[Auth] Logout',
// } as const;


export type AuthTypes = {
    login: '[Auth] Login';
    logout: '[Auth] Logout';
};

export const types: AuthTypes = {
    login: '[Auth] Login',
    logout: '[Auth] Logout',
};
