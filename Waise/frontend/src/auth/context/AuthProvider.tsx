

import { useReducer, ReactNode } from "react";

import {AuthReducer} from "./AuthReducer";
import { types } from "../types/types";
import { AuthContext } from "./AuthContext";

// Definimos el tipo del estado de autenticación
interface AuthState {
    logged: boolean;
    user?: {
        id: string;
        name: string;
    };
}



// Definimos los props del AuthProvider
interface AuthProviderProps {
    children: ReactNode;
}




const init = () =>{
    
    const user = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user') as string) : null;

    return {
        logged:!!user,
        user:user
    }

}

const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {

    

    const [authState, dispatch] = useReducer(AuthReducer, {}, init);

    const login = (name = '') => {
        const user = { id: "ABC", name }
        const action = {
            type: types.login,
            payload: user,
        } as const; 


        localStorage.setItem('user', JSON.stringify(user))
        dispatch(action);
    };


    const logout = () =>{

        localStorage.removeItem('user');
        const action = {type:types.logout}

        dispatch(action);

    }








    return (
        <AuthContext.Provider value={{ 
        ...authState, 

    //--------------------------------
        login: login,
        logout:logout
        
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthProvider