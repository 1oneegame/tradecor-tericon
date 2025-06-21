'use client'
import { Grid, GridItem } from "@/components/grid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { usePythonScript } from '@/lib/hooks/usePythonScript';

interface AnalysisResult {
    id: string;
    subject: string;
    amount: number;
    quantity: number;
    suspicion_percentage: number;
    suspicion_level: 'High' | 'Medium' | 'Low';
}

type SortType = 'probability_asc' | 'probability_desc' | 'level';
type SuspicionLevel = 'all' | 'High' | 'Medium' | 'Low';

export default function Analysis() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [results, setResults] = useState<AnalysisResult[] | null>(null);
    const [executionTime, setExecutionTime] = useState<number | null>(null);
    const [logs, setLogs] = useState<string[]>([]);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [sortType, setSortType] = useState<SortType>('probability_desc');
    const [selectedLevel, setSelectedLevel] = useState<SuspicionLevel>('all');
    const { runScript } = usePythonScript();

    const addLog = (message: string) => {
        setLogs(prev => [...prev, `[${new Date().toISOString()}] ${message}`]);
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            if (file.type !== 'application/json') {
                setError('Пожалуйста, загрузите JSON файл');
                return;
            }
            setSelectedFile(file);
            setError(null);
            addLog(`Выбран файл: ${file.name}`);
        }
    };

    const formatAmount = (amount: number | null | undefined) => {
        if (amount === null || amount === undefined || isNaN(amount)) return 'Не указано';
        return new Intl.NumberFormat('ru-RU', {
            style: 'decimal',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount);
    };

    const formatQuantity = (quantity: number | null | undefined) => {
        if (quantity === null || quantity === undefined || isNaN(quantity)) return 'Не указано';
        return quantity.toString();
    };

    const formatProbability = (probability: number | null | undefined) => {
        if (probability === null || probability === undefined) return 'Не указано';
        return `${probability.toFixed(1)}%`;
    };

    const getSuspicionColor = (level: string) => {
        switch (level) {
            case 'High': return 'text-red-600';
            case 'Medium': return 'text-yellow-600';
            case 'Low': return 'text-green-600';
            default: return 'text-gray-600';
        }
    };

    const getLevelWeight = (level: string) => {
        switch (level) {
            case 'High': return 3;
            case 'Medium': return 2;
            case 'Low': return 1;
            default: return 0;
        }
    };

    const filterAndSortResults = (results: AnalysisResult[]) => {
        let filteredResults = results;
        
        // Фильтрация по уровню
        if (selectedLevel !== 'all') {
            filteredResults = results.filter(result => result.suspicion_level === selectedLevel);
        }

        // Сортировка
        return filteredResults.sort((a, b) => {
            const probA = a.suspicion_percentage ?? 0;
            const probB = b.suspicion_percentage ?? 0;

            switch (sortType) {
                case 'probability_asc':
                    return probA - probB;
                case 'probability_desc':
                    return probB - probA;
                case 'level':
                    const weightA = getLevelWeight(a.suspicion_level);
                    const weightB = getLevelWeight(b.suspicion_level);
                    return weightB - weightA;
                default:
                    return 0;
            }
        });
    };

    const handleAnalysis = async () => {
        if (!selectedFile) {
            setError('Пожалуйста, выберите файл для анализа');
            return;
        }

        setLoading(true);
        setError(null);
        setLogs([]);
        addLog('Начало анализа');

        try {
            addLog('Отправка файла на сервер');
            const result = await runScript(selectedFile);
            addLog('Получен ответ от сервера');

            if (!result.success) {
                throw new Error(result.error || 'Произошла ошибка при анализе');
            }

            setResults(result.predictions!);
            setExecutionTime(result.execution_time);
            addLog(`Анализ успешно завершен за ${result.execution_time} секунд`);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Произошла неизвестная ошибка';
            setError(errorMessage);
            addLog(`Ошибка: ${errorMessage}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-white text-black mt-[70px]">
            <section className="container mx-auto px-4 py-12">
                <Grid columns={3} decoratorPositions={["top-left", "top-right", 'bottom-left', 'bottom-right']}>
                    <GridItem className="col-span-3">
                        <h1 className="text-4xl font-bold text-center mb-8 text-blue-800">Анализ закупок</h1>
                        
                        <div className="mb-6">
                            <Label htmlFor="file" className="mb-2 block text-lg ">
                                Выберите JSON файл с данными
                            </Label>
                            <div className="flex gap-4 mt-4">
                                <Input
                                    id="file"
                                    type="file"
                                    accept=".json"
                                    onChange={handleFileChange}
                                    className="flex-1 rounded-full"
                                />
                        <Button 
                                    onClick={handleAnalysis}
                                    disabled={loading || !selectedFile}
                                    className="bg-blue-800 hover:bg-blue-600 text-white rounded-full px-4 py-2 transition-colors duration-300"
                                >
                                    {loading ? 'Выполняется анализ...' : 'Запустить анализ'}
                        </Button>
                            </div>
                            {selectedFile && (
                                <p className="text-sm text-gray-600 mt-2">
                                    Выбранный файл: {selectedFile.name}
                                </p>
                            )}
                        </div>
                    </GridItem>

                    <GridItem className="col-span-3">
                        {executionTime !== null && (
                            <div className="mb-4 text-gray-600">
                                Время выполнения: {executionTime} секунд
                            </div>
                        )}

                        {error && (
                            <div className="text-red-500 mb-4 p-4 bg-red-50 rounded-lg">
                            <p className="font-bold mb-2">Ошибка:</p>
                            <pre className="whitespace-pre-wrap text-sm">
                                    {error}
                                </pre>
                                </div>
                        )}

                        {logs.length > 0 && (
                            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                                <h3 className="font-bold mb-2">Логи:</h3>
                                <div className="max-h-[200px] overflow-auto">
                                    {logs.map((log, index) => (
                                        <div key={index} className="text-sm font-mono mb-1">
                                            {log}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}  
                    </GridItem>

                    {results && (
                        <>
                            <GridItem className="col-span-2">
                                <div className="bg-white p-4 rounded-lg shadow">
                                    <h2 className="text-2xl font-bold mb-4 text-blue-800">Результаты анализа</h2>
                                    <div className="space-y-4">
                                        {filterAndSortResults(results).map((result, index) => (
                                            <div 
                                                key={index} 
                                                className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                                            >
                                                <div className="flex justify-between items-start">
                                                    <div className="flex-1">
                                                        <p className="font-medium">
                                                            Лот №{result.id}
                                                        </p>
                                                        <p className="text-gray-600 mt-1">
                                                            {result.subject}
                                                        </p>
                                                        <div className="mt-2 grid grid-cols-2 gap-4">
                                                            <p>
                                                                <span className="text-gray-500">Количество:</span>{' '}
                                                                {formatQuantity(result.quantity)}
                                                            </p>
                                                            <p>
                                                                <span className="text-gray-500">Сумма:</span>{' '}
                                                                {formatAmount(result.amount)} тг
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="ml-4 text-right">
                                                        <p className="font-medium">
                                                            Подозрительность: {formatProbability(result.suspicion_percentage)}
                                                        </p>
                                                        <p className={`font-medium ${getSuspicionColor(result.suspicion_level)}`}>
                                                            {result.suspicion_level === 'High' ? 'Высокий' :
                                                             result.suspicion_level === 'Medium' ? 'Средний' :
                                                             result.suspicion_level === 'Low' ? 'Низкий' : 'Неизвестно'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="mt-4 text-sm text-gray-600">
                                        Всего результатов: {filterAndSortResults(results).length}
                                    </div>
                                </div>
                            </GridItem>

                            <GridItem className="col-span-1">
                                <div className="bg-white p-4 rounded-lg shadow sticky top-[90px]">
                                    <h3 className="font-bold mb-4 text-blue-800">Фильтры и сортировка</h3>
                                    <div className="flex flex-col gap-4">
                                        <div>
                                            <Label htmlFor="level-filter" className="mb-2 block">Уровень подозрительности:</Label>
                                            <select
                                                id="level-filter"
                                                value={selectedLevel}
                                                onChange={(e) => setSelectedLevel(e.target.value as SuspicionLevel)}
                                                className="w-full border rounded-md px-3 py-2"
                                            >
                                                <option value="all">Все</option>
                                                <option value="High">Высокий</option>
                                                <option value="Medium">Средний</option>
                                                <option value="Low">Низкий</option>
                                            </select>
                                        </div>

                                        <div>
                                            <Label className="mb-2 block">Сортировка:</Label>
                                            <div className="flex flex-col gap-2">
                                                <Button
                                                    onClick={() => setSortType('probability_desc')}
                                                    variant={sortType === 'probability_desc' ? 'default' : 'outline'}
                                                    className="w-full bg-blue-800 hover:bg-blue-600 text-white rounded-full px-4 py-2 transition-colors duration-300"
                                                >
                                                    По убыванию %
                                                </Button>
                                                <Button
                                                    onClick={() => setSortType('probability_asc')}
                                                    variant={sortType === 'probability_asc' ? 'default' : 'outline'}
                                                    className="w-full bg-white hover:bg-gray-100 text-blue-800 rounded-full px-4 py-2 transition-colors duration-300"
                                                >
                                                    По возрастанию %
                                                </Button>
                                            </div>
                                        </div>

                                        {selectedLevel !== 'all' && (
                                            <div className="text-sm text-gray-600 mt-2">
                                                Показаны результаты с уровнем: {selectedLevel}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </GridItem>
                        </>
                    )}
                </Grid>
            </section>
        </div>
    )
}