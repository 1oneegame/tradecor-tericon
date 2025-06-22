'use client'
import { Grid, GridItem } from "@/components/grid";
import { Button } from "@/components/ui/button";
import { useGoszakupData } from "@/lib/hooks/useGoszakupData";
import { useEffect, useState } from "react";
import { AnalysisResult } from "@/lib/types";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function DataPage() {
    const router = useRouter();
    const [currentPage, setCurrentPage] = useState(1);
    const [recordsPerPage] = useState(10);
    const { loading, error, data, fetchData } = useGoszakupData();
    const [results, setResults] = useState<AnalysisResult[]>([]);
    const [selectedLots, setSelectedLots] = useState<string[]>(() => {
        const saved = localStorage.getItem('selectedLots');
        return saved ? JSON.parse(saved) : [];
    });
    const [selectedLotsData, setSelectedLotsData] = useState<AnalysisResult[]>(() => {
        const saved = localStorage.getItem('selectedLotsData');
        return saved ? JSON.parse(saved) : [];
    });

    useEffect(() => {
        loadData();
    }, [currentPage]);

    useEffect(() => {
        localStorage.setItem('selectedLots', JSON.stringify(selectedLots));
    }, [selectedLots]);

    useEffect(() => {
        localStorage.setItem('selectedLotsData', JSON.stringify(selectedLotsData));
    }, [selectedLotsData]);

    const loadData = async () => {
        try {
            const response = await fetchData({
                page: currentPage,
                count_record: recordsPerPage
            });
            if (response.data) {
                console.log('Response data:', response.data);
                setResults(response.data);
            }
        } catch (err) {
            console.error('Ошибка при загрузке данных:', err);
        }
    };

    const toggleLotSelection = (lotId: string) => {
        if (selectedLots.includes(lotId)) {
            setSelectedLots(selectedLots.filter(id => id !== lotId));
            setSelectedLotsData(selectedLotsData.filter(lot => lot.lot_id !== lotId));
        } else {
            const lotData = results.find(result => result.lot_id === lotId);
            if (lotData) {
                setSelectedLots([...selectedLots, lotId]);
                setSelectedLotsData([...selectedLotsData, lotData]);
            }
        }
    };

    const handleAnalyzeSelected = () => {
        if (selectedLotsData.length === 0) {
            alert('Пожалуйста, выберите хотя бы один лот для анализа');
            return;
        }
        
        localStorage.setItem('selectedLotsForAnalysis', JSON.stringify(selectedLotsData));
        setSelectedLots([]);
        setSelectedLotsData([]);
        router.push('/analysis');
    };

    return (
        <div className="min-h-screen bg-white text-black mt-[70px]">
            <section className="container mx-auto px-4 py-12">
                <Grid columns={1} decoratorPositions={["top-left", "top-right", 'bottom-left', 'bottom-right']}>
                    <GridItem>
                        <div className="flex justify-between items-center mb-8">
                            <h1 className="text-4xl font-bold text-blue-800">Данные закупок</h1>
                            {selectedLotsData.length > 0 && (
                                <div className="flex items-center gap-4">
                                    <span className="text-gray-600">
                                        Выбрано лотов: {selectedLotsData.length}
                                    </span>
                                    <Button
                                        onClick={handleAnalyzeSelected}
                                        className="bg-blue-800 hover:bg-blue-600 text-white rounded-full px-6"
                                    >
                                        Анализировать выбранные
                                    </Button>
                                </div>
                            )}
                        </div>

                        {error && (
                            <div className="text-red-500 mb-4 p-4 bg-red-50 rounded-lg">
                                <p className="font-bold mb-2">Ошибка:</p>
                                <pre className="whitespace-pre-wrap text-sm">{error}</pre>
                            </div>
                        )}

                        {loading ? (
                            <div className="text-center py-8">Загрузка данных...</div>
                        ) : (
                            <>
                                <div className="space-y-4">
                                    {results.map((result, index) => (
                                        <div 
                                            key={index} 
                                            className={`p-4 border rounded-lg transition-colors cursor-pointer ${
                                                selectedLots.includes(result.lot_id) 
                                                    ? 'bg-blue-50 border-blue-200' 
                                                    : 'hover:bg-gray-50'
                                            }`}
                                            onClick={() => toggleLotSelection(result.lot_id)}
                                        >
                                            <div className="flex items-start gap-4">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedLots.includes(result.lot_id)}
                                                    onChange={(e) => {
                                                        e.stopPropagation();
                                                        toggleLotSelection(result.lot_id);
                                                    }}
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="mt-1.5 h-4 w-4 rounded border-gray-300 text-blue-800 focus:ring-blue-800"
                                                />
                                                <div className="flex-1">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <p className="font-medium text-lg">
                                                            Лот №{result.lot_id}
                                                        </p>
                                                        <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                                                            {result.status}
                                                        </span>
                                                    </div>
                                                    <p className="text-gray-600 mb-2">
                                                        {result.announcement}
                                                    </p>
                                                    <p className="text-gray-700 mb-2">
                                                        <span className="font-medium">Заказчик:</span> {result.customer}
                                                    </p>
                                                    <div className="grid grid-cols-2 gap-4 mb-3">
                                                        <p>
                                                            <span className="text-gray-500">Тип закупки:</span>{' '}
                                                            {result.purchase_type}
                                                        </p>
                                                        <p>
                                                            <span className="text-gray-500">Количество:</span>{' '}
                                                            {result.quantity}
                                                        </p>
                                                    </div>
                                                    <div className="mb-3">
                                                        <p>
                                                            <span className="text-gray-500">Сумма:</span>{' '}
                                                            <span className="font-medium">{result.amount} тг</span>
                                                        </p>
                                                    </div>
                                                    <div onClick={(e) => e.stopPropagation()}>
                                                        <Link 
                                                            href={result.subject_link} 
                                                            target="_blank"
                                                            className="text-blue-600 hover:text-blue-800 underline"
                                                        >
                                                            Подробнее о закупке
                                                        </Link>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-8 flex justify-center gap-4">
                                    <Button
                                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                        disabled={currentPage === 1 || loading}
                                        className="bg-blue-800 hover:bg-blue-600 text-white rounded-full px-6"
                                    >
                                        Назад
                                    </Button>
                                    <span className="flex items-center">
                                        Страница {currentPage}
                                    </span>
                                    <Button
                                        onClick={() => setCurrentPage(prev => prev + 1)}
                                        disabled={loading}
                                        className="bg-blue-800 hover:bg-blue-600 text-white rounded-full px-6"
                                    >
                                        Вперед
                                    </Button>
                                </div>

                                <div className="mt-4 text-center text-sm text-gray-600">
                                    Всего записей на странице: {results.length}
                                </div>
                            </>
                        )}
                    </GridItem>
                </Grid>
            </section>
        </div>
    );
}
