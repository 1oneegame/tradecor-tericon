'use client'
import { Grid, GridItem } from "@/components/grid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEffect, useState } from "react";
import { usePythonScript } from '@/lib/hooks/usePythonScript';
import Link from "next/link";
import { 
    AnalysisResult, 
    PredictionResult, 
    PredictionResponse,
    SortType,
    SuspicionLevelFilter
} from "@/lib/types";

export default function Analysis() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [results, setResults] = useState<PredictionResult[] | null>(null);
    const [executionTime, setExecutionTime] = useState<number | null>(null);
    const [logs, setLogs] = useState<string[]>([]);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [sortType, setSortType] = useState<SortType>('probability_desc');
    const [selectedLevel, setSelectedLevel] = useState<SuspicionLevelFilter>('all');
    const [selectedLots, setSelectedLots] = useState<AnalysisResult[]>([]);
    const { runScript } = usePythonScript();

    useEffect(() => {
        const lotsFromStorage = localStorage.getItem('selectedLotsForAnalysis');
        if (lotsFromStorage) {
            try {
                const parsedLots = JSON.parse(lotsFromStorage);
                setSelectedLots(parsedLots);
                addLog(`Загружено ${parsedLots.length} лотов для анализа`);
            } catch (err) {
                setError('Ошибка при загрузке выбранных лотов');
            }
        }
    }, []);

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

    const formatLotId = (lotId: string | null | undefined) => {
        if (!lotId) return 'Не указан';
        return lotId.toString();
    };

    const formatCustomer = (customer: string | null | undefined) => {
        if (!customer) return 'Не указан';
        return customer;
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

    const filterAndSortResults = (results: PredictionResult[]) => {
        let filteredResults = results;
        
        if (selectedLevel !== 'all') {
            filteredResults = results.filter(result => result.suspicion_level === selectedLevel);
        }

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
        if (selectedLots.length === 0 && !selectedFile) {
            setError('Необходимо либо выбрать файл, либо иметь выбранные лоты для анализа');
            return;
        }

        setLoading(true);
        setError(null);
        setLogs([]);
        addLog('Начало анализа');

        try {
            let dataToAnalyze;
            
            if (selectedFile) {
                addLog('Используется загруженный файл для анализа');
                dataToAnalyze = selectedFile;
            } else {
                addLog('Используются выбранные лоты для анализа');
                const blob = new Blob([JSON.stringify(selectedLots)], { type: 'application/json' });
                dataToAnalyze = new File([blob], 'selected_lots.json', { type: 'application/json' });
            }

            addLog('Отправка данных на сервер');
            const result = await runScript(dataToAnalyze);
            addLog('Получен ответ от сервера');
            localStorage.removeItem('selectedLotsForAnalysis');
            localStorage.removeItem('selectedLotsData');
            localStorage.removeItem('selectedLots');
            console.log('Результаты анализа:', result.predictions);

            if (!result.success) {
                throw new Error(result.error || 'Произошла ошибка при анализе');
            }

            if (!result.predictions || !Array.isArray(result.predictions)) {
                throw new Error('Некорректный формат данных от сервера');
            }

            setResults(result.predictions);
            setExecutionTime(result.execution_time || 0);
            addLog(`Анализ успешно завершен за ${result.execution_time} секунд`);
            
            localStorage.removeItem('selectedLotsForAnalysis');
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
                        
                        {selectedLots.length > 0 ? (
                            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                                <h2 className="text-lg font-semibold mb-2">Выбранные лоты для анализа</h2>
                                <p className="text-gray-600">Количество лотов: {selectedLots.length}</p>
                                <Button 
                                    onClick={handleAnalysis}
                                    disabled={loading}
                                    className="mt-4 bg-blue-800 hover:bg-blue-600 text-white rounded-full px-4 py-2 transition-colors duration-300"
                                >
                                    {loading ? 'Выполняется анализ...' : 'Анализировать выбранные лоты'}
                                </Button>
                            </div>
                        ) : (
                            <div className="mb-6">
                                <Label htmlFor="file" className="mb-2 block text-lg">
                                    Загрузите JSON файл с данными
                                </Label>
                                <div className="flex gap-4 mt-4">
                                    <Input
                                        id="file"
                                        type="file"
                                        accept=".json"
                                        onChange={handleFileChange}
                                        className="flex-1 rounded-full"
                                    />
                                    {selectedFile && (
                                        <Button 
                                            onClick={handleAnalysis}
                                            disabled={loading}
                                            className="bg-blue-800 hover:bg-blue-600 text-white rounded-full px-4 py-2 transition-colors duration-300"
                                        >
                                            {loading ? 'Выполняется анализ...' : 'Анализировать файл'}
                                        </Button>
                                    )}
                                </div>
                                {selectedFile && (
                                    <p className="text-sm text-gray-600 mt-2">
                                        Выбранный файл: {selectedFile.name}
                                    </p>
                                )}
                            </div>
                        )}
                    </GridItem>
                    { /* логи
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
                    */}
                    {results && results.length > 0 && (
                        <>
                            <GridItem className="col-span-2">
                            
                                <div className="bg-white rounded-lg">
                                    <h2 className="text-2xl font-bold mb-4 text-blue-800">Результаты анализа</h2>
                                    <div className="space-y-4">
                                        {filterAndSortResults(results).map((result, index) => (
                                            <div 
                                                key={index} 
                                                className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                                            >
                                                <div className="flex justify-between items-start">
                                                    <div className="flex-1">
                                                        <div className="flex justify-between items-center mb-2">
                                                            <p className="font-medium text-blue-800">
                                                                Лот №{formatLotId(result.lot_id)}
                                                            </p>
                                                            
                                                            <span className={`${getSuspicionColor(result.suspicion_level)} font-medium`}>
                                                                {formatProbability(result.suspicion_percentage)}
                                                            </span>
                                                        </div>
                                                        <p className="text-gray-600 mb-2">
                                                            {result.subject}
                                                        </p>
                                                        <p className="text-gray-600 mb-2">
                                                            <span className="text-gray-500">Заказчик:</span>{' '}
                                                            {formatCustomer(result.customer)}
                                                        </p>
                                                        <div className="grid grid-cols-2 gap-4 mb-2">
                                                            <p>
                                                                <span className="text-gray-500">Количество:</span>{' '}
                                                                {formatQuantity(result.quantity)}
                                                            </p>
                                                            <p>
                                                                <span className="text-gray-500">Сумма:</span>{' '}
                                                                {formatAmount(result.amount)} тг
                                                            </p>
                                                        </div>
                                                        <div className="flex justify-between items-center mt-2">
                                                            <span className={`${getSuspicionColor(result.suspicion_level)} text-sm font-medium`}>
                                                                Уровень подозрительности: {result.suspicion_level}
                                                            </span>
                                                            <Link 
                                                                href={result.subject_link || '#'}
                                                                target="_blank"
                                                            >
                                                                <Button 
                                                                    className="bg-blue-800 hover:bg-blue-600 text-white rounded-full px-4 py-2 text-sm transition-colors duration-300"
                                                                >
                                                                    Подробнее
                                                                </Button>
                                                            </Link>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </GridItem>

                            <GridItem className="col-span-1">
                                <div className="sticky top-[90px] bg-white p-4 rounded-lg border">
                                    <h3 className="text-lg font-semibold mb-4 text-blue-800">Фильтры и сортировка</h3>
                                    <div className="space-y-4">
                                        <div>
                                            <Label className="mb-2 block">Сортировка по вероятности:</Label>
                                            <select
                                                value={sortType}
                                                onChange={(e) => setSortType(e.target.value as SortType)}
                                                className="w-full rounded-lg border border-gray-300 px-4 py-2"
                                            >
                                                <option value="probability_desc">По убыванию</option>
                                                <option value="probability_asc">По возрастанию</option>
                                                <option value="level">По уровню подозрительности</option>
                                            </select>
                                        </div>

                                        <div>
                                            <Label className="mb-2 block">Фильтр по уровню:</Label>
                                            <select
                                                value={selectedLevel}
                                                onChange={(e) => setSelectedLevel(e.target.value as SuspicionLevelFilter)}
                                                className="w-full rounded-lg border border-gray-300 px-4 py-2"
                                            >
                                                <option value="all">Все уровни</option>
                                                <option value="High">Высокий</option>
                                                <option value="Medium">Средний</option>
                                                <option value="Low">Низкий</option>
                                            </select>
                                        </div>

                                        <div className="pt-2 text-sm text-gray-600">
                                            Всего результатов: {filterAndSortResults(results).length}
                                        </div>
                                    </div>
                                </div>
                            </GridItem>
                        </>
                    )}
                </Grid>
            </section>
        </div>
    );
}