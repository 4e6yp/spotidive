import React, { useReducer, createContext, useCallback } from "react"
import { messageReducer, messageActions } from '../reducers/MessageReducer'

const AlertContext = createContext(null)

const initialState = {
    isVisible: false,
    text: null,
    alertType: 'success'
}

function AlertProvider({ children }) {
    const [message, setMessage] = useReducer(messageReducer, initialState)

    const handleMessageClosed = useCallback((reason) => {
        if (reason === 'clickaway') {
            return;
        }

        setMessage({ type: messageActions.HIDE_MESSAGE })
    }, []);

    const errorMessage = useCallback((text = 'Error occured, please try again') => {
        if (typeof text !== 'string' && text !== null) {
            text = 'Error occured, please try again';
        }
        setMessage({ type: messageActions.SHOW_ERROR_MESSAGE, text })
    }, [])

    const successMessage = useCallback((text) => {
        setMessage({ type: messageActions.SHOW_SUCCESS_MESSAGE, text })
    }, [])

    const hideMessage = useCallback(() => {
        setMessage({ type: messageActions.HIDE_MESSAGE })
    }, [])

    return (
        <AlertContext.Provider value={{ message, handleMessageClosed, errorMessage, successMessage, hideMessage }}>
            {children}
        </AlertContext.Provider>
    )
}

export { AlertContext, AlertProvider }