'use client'
import { useState } from 'react';

export function usePythonScript() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runScript = async (data: any) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to execute Python script');
      }

      const result = await response.json();
      setLoading(false);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      setLoading(false);
      throw err;
    }
  };

  return { runScript, loading, error };
} 