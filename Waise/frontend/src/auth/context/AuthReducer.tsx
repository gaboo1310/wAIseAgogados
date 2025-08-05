

// import { types } from '../types/types';






// const AuthReducer = (state, action) => {


//     switch (action.type) {
//         case types.login:
//             return {
//                 ...state,
//                 logged:true,
//                 name:action.payload
//             }

//         case types.logout:
//             return state

    
//         default:
//             return state;
//     }

// }

// export default AuthReducer

import { types } from "../types/types";



// Definimos los tipos de acciones que puede manejar el reducer
interface AuthAction {
    type: string;
    payload?: {
        id: string;
        name: string;
    };
}


export const AuthReducer = (state={}, action:AuthAction) => {
    switch (action.type) {
        case types.login:
            return {
                    ...state,
                    logged: true,
                    user: {
                        id: action.payload?.id || "",
                        name: action.payload?.name || "",
                    },
                };

        case types.logout:
            return { logged: false };

        default:
            return state;
    }
};


