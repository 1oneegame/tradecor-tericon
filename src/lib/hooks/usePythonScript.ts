'use client'
import { useState } from 'react';
import { PredictionResult } from '@/lib/types';

interface AnalysisResponse {
    success: boolean;
    predictions?: PredictionResult[];
    error?: string;
    execution_time: number;
}

const API_URL = 'http://localhost:8000';

export function usePythonScript() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const runScript = async (file: File): Promise<AnalysisResponse> => {
        setLoading(true);
        setError(null);

        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch(`${API_URL}/analyze`, {
                method: 'POST',
                body: formData,
            });

            const result = await response.json();
            
            if (!response.ok) {
                const errorMessage = typeof result.detail === 'object' 
                    ? result.detail.error 
                    : (result.detail || 'Failed to execute analysis');
                    
                throw new Error(errorMessage);
            }

            setLoading(false);
            return {
                ...result,
                execution_time: typeof result.execution_time === 'number' ? result.execution_time : 0
            };
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error occurred');
            setLoading(false);
            throw err;
        }
    };

    return { runScript, loading, error };
} 