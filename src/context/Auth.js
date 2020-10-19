import React, { createContext } from "react";
import { useLocalStorage } from "../hooks";
import { login } from '../utility/login';

const AuthContext = createContext(null);

function AuthProvider({ children }) {
    const [token, setToken] = useLocalStorage("token", null);
    const [expirationDate, setExpirationDate] = useLocalStorage("expiration_date", null);

    const contextValue = {
        isAuth: !!token,
        token,
        setToken,
        expirationDate,
        setExpirationDate,
        login
    }

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    )
}

export { AuthContext, AuthProvider }