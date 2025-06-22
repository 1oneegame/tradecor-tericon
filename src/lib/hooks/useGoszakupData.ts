import { useState } from 'react';
import { GoszakupRequest, GoszakupResponse } from '../types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const useGoszakupData = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<GoszakupResponse | null>(null);

    const fetchData = async (request: GoszakupRequest) => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch(`${API_URL}/parse`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(request),
            });

            const result = await response.json();
            
            if (!response.ok) {
                const errorMessage = typeof result.detail === 'object' 
                    ? result.detail.error 
                    : (result.detail || 'Не удалось получить данные');
                    
                throw new Error(errorMessage);
            }

            setData(result);
            return result;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Произошла неизвестная ошибка';
            setError(errorMessage);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    return {
        loading,
        error,
        data,
        fetchData,
    };
}; 