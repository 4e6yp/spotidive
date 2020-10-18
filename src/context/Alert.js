import React, { useReducer, createContext } from "react"
import { messageReducer, messageActions } from '../reducers/MessageReducer'

const AlertContext = createContext(null)

const initialState = {
    isVisible: false,
    text: null,
    alertType: 'success'
}

function AlertProvider({ children }) {
    const [message, setMessage] = useReducer(messageReducer, initialState)

    function handleMessageClosed(reason) {
        if (reason === 'clickaway') {
            return;
        }

        setMessage({ type: messageActions.HIDE_MESSAGE })
    };


    function errorMessage(text = 'Error occured, please try again') {
        if (typeof text !== 'string' && text !== null) {
            text = 'Error occured, please try again';
        }

        setMessage({ type: messageActions.SHOW_ERROR_MESSAGE, text })
    }

    function successMessage(text) {
        setMessage({ type: messageActions.SHOW_SUCCESS_MESSAGE, text })
    }

    function hideMessage() {
        setMessage({ type: messageActions.HIDE_MESSAGE })
    }

    return (
        <AlertContext.Provider value={{ message, handleMessageClosed, errorMessage, successMessage, hideMessage }}>
            {children}
        </AlertContext.Provider>
    )
}

export { AlertContext, AlertProvider }