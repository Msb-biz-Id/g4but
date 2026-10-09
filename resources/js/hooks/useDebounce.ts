import { useEffect, useState } from 'react';

/**
 * Hook untuk debounce nilai — berguna untuk search input.
 * Mencegah terlalu banyak request saat user mengetik.
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => clearTimeout(timer);
    }, [value, delay]);

    return debouncedValue;
}
