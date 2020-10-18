import React, { useState, createContext } from "react";
import { useLocalStorage } from "../hooks";
import { login } from '../utility/login';

const AuthContext = createContext(null);

function AuthProvider({ children }) {
    const [token, setToken] = useLocalStorage("token", null);
    const [expirationDate, setExpirationDate] = useLocalStorage("expiration_date", null);

    const [tokenChecked, setTokenChecked] = useState(false);

    const contextValue = {
        isAuth: token && tokenChecked,
        token,
        setToken,
        expirationDate,
        tokenChecked,
        setTokenChecked,
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