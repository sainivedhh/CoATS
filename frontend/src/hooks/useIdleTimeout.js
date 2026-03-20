import { useState, useEffect, useCallback, useRef } from 'react';

const useIdleTimeout = ({ onIdle, idleTime = 15 * 60 * 1000 }) => {
    const [isIdle, setIsIdle] = useState(false);
    const timeoutRef = useRef(null);

    const handleIdle = useCallback(() => {
        setIsIdle(true);
        if (onIdle) {
            onIdle();
        }
    }, [onIdle]);

    const resetTimer = useCallback(() => {
        setIsIdle(false);
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(handleIdle, idleTime);
    }, [handleIdle, idleTime]);

    useEffect(() => {
        const events = [
            'mousemove',
            'keydown',
            'wheel',
            'DOMMouseScroll',
            'mouseWheel',
            'mousedown',
            'touchstart',
            'touchmove',
            'MSPointerDown',
            'MSPointerMove',
            'visibilitychange'
        ];

        const handleEvent = () => resetTimer();

        // Attach event listeners
        events.forEach(event => {
            window.addEventListener(event, handleEvent);
        });

        // Initialize the timer
        resetTimer();

        // Cleanup
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
            events.forEach(event => {
                window.removeEventListener(event, handleEvent);
            });
        };
    }, [resetTimer]);

    return { isIdle };
};

export default useIdleTimeout;
