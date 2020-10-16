import { useReducer, useCallback } from "react";
import { messageReducer, messageActions } from '../reducers/MessageReducer';

function useAlertMessage() {
    const [message, setMessage] = useReducer(messageReducer, {
        isVisible: false,
        text: null,
        alertType: 'success'
    })

    const handleMessageClosed = useCallback((reason) => {
        if (reason === 'clickaway') {
            return;
        }

        setMessage({ type: messageActions.HIDE_MESSAGE });
    }, [setMessage])

    const errorMessage = useCallback((text = 'Error occured, please try again') => {
        if (typeof text !== 'string' && text !== null) {
            text = 'Error occured, please try again';
        }

        setMessage({ type: messageActions.SHOW_ERROR_MESSAGE, text })
    }, [setMessage]);

    const successMessage = useCallback(text => setMessage({ type: messageActions.SHOW_SUCCESS_MESSAGE, text }), [setMessage]);

    const hideMessage = useCallback(() => setMessage({ type: messageActions.HIDE_MESSAGE }), [setMessage]);

    return { message, errorMessage, successMessage, hideMessage, handleMessageClosed }
}

export { useAlertMessage }