import React, { createContext } from "react"
import { useAuth } from "../hooks"

const AuthContext = createContext(null);

function AuthProvider({ children }) {
    const { isAuth, login } = useAuth()

    return (
        <AuthContext.Provider value={{ isAuth, login }}>
            {children}
        </AuthContext.Provider>
    )
}

export { AuthContext, AuthProvider }