'use client'
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import React, { useState, useEffect } from "react";
import { usePythonScript } from '@/lib/hooks/usePythonScript';
import { Upload, BarChart3, AlertTriangle, CheckCircle, Clock, Plus, Edit, Download, Database, Table, Globe, Bot } from "lucide-react";
import Link from "next/link";
import * as cheerio from 'cheerio';

interface AnalysisResult {
    id: string;
    subject: string;
    amount: number;
    quantity: number;
    suspicion_percentage: number;
    suspicion_level: 'High' | 'Medium' | 'Low';
    subject_link: string;
}

interface ProcurementData {
    lot_id: string;
    announcement: string;
    customer: string;
    subject: string;
    subject_link: string;
    quantity: string;
    amount: string;
    purchase_type: string;
    status: string;
}

type SortType = 'probability_asc' | 'probability_desc' | 'level';
type SuspicionLevel = 'all' | 'Высокий' | 'Средний' | 'Низкий';

export default function Analysis() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [results, setResults] = useState<AnalysisResult[] | null>(null);
    const [executionTime, setExecutionTime] = useState<number | null>(null);
    const [logs, setLogs] = useState<string[]>([]);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [sortType, setSortType] = useState<SortType>('probability_desc');
    const [selectedLevel, setSelectedLevel] = useState<SuspicionLevel>('all');
    const [activeTab, setActiveTab] = useState<'upload' | 'editor' | 'sample' | 'goszakup' | 'agent'>('upload');
    const [tableData, setTableData] = useState<ProcurementData[]>([]);
    const [goszakupUrl, setGoszakupUrl] = useState('');
    const [goszakupLoading, setGoszakupLoading] = useState(false);
    const [agentLoading, setAgentLoading] = useState(false);
    const [agentUrl, setAgentUrl] = useState('https://goszakup.gov.kz/ru/search/lots');
    const [agentActive, setAgentActive] = useState(false);
    const [agentInterval, setAgentInterval] = useState(60); // seconds
    const [agentIntervalId, setAgentIntervalId] = useState<NodeJS.Timeout | null>(null);
    const [agentStats, setAgentStats] = useState({
        totalFetches: 0,
        successfulFetches: 0,
        lastFetch: null as Date | null,
        newRecords: 0,
        totalRecords: 0
    });

    const { runScript } = usePythonScript();

    const addLog = (message: string) => {
        setLogs(prev => [...prev, `[${new Date().toISOString()}] ${message}`]);
    };

    const loadSampleData = async () => {
        try {
            const response = await fetch('/new_data.json');
            const sampleData = await response.json();
            setTableData(sampleData);
            addLog(`Загружены образцы данных: ${sampleData.length} записей`);
        } catch (error) {
            setError('Ошибка загрузки образцов данных');
            addLog('Ошибка загрузки образцов данных');
        }
    };

    const addNewRow = () => {
        const newRow: ProcurementData = {
            lot_id: '',
            announcement: '',
            customer: '',
            subject: '',
            subject_link: '',
            quantity: '',
            amount: '',
            purchase_type: '',
            status: ''
        };
        setTableData([...tableData, newRow]);
    };

    const updateRow = (index: number, field: keyof ProcurementData, value: string) => {
        const updatedData = [...tableData];
        updatedData[index][field] = value;
        setTableData(updatedData);
    };

    const removeRow = (index: number) => {
        const updatedData = tableData.filter((_, i) => i !== index);
        setTableData(updatedData);
    };

    const downloadTableData = () => {
        // Clean data before downloading
        const cleanedData = tableData.map(row => ({
            ...row,
            quantity: cleanNumericValue(row.quantity),
            amount: cleanNumericValue(row.amount)
        }));
        
        const dataStr = JSON.stringify(cleanedData, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        const exportFileDefaultName = 'procurement_data.json';
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
    };

    const cleanNumericValue = (value: string): number => {
        // Remove spaces, commas, and other non-numeric characters except dots
        const cleaned = value.replace(/[^\d.]/g, '');
        const parsed = parseFloat(cleaned);
        return isNaN(parsed) ? 0 : parsed;
    };

    const parseGoszakupData = (html: string): ProcurementData[] => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        // Look for different table types and structures
        const tableSelectors = [
            'table.table-bordered',
            'table.table-hover', 
            'table.table-striped',
            'table[class*="table"]',
            '.panel table',
            '.panel-body table'
        ];
        
        const procurementData: ProcurementData[] = [];
        const extractedData: any = {};
        
        // Extract data from all possible tables
        tableSelectors.forEach(selector => {
            const tables = doc.querySelectorAll(selector);
            tables.forEach(table => {
                const rows = table.querySelectorAll('tr');
                rows.forEach(row => {
                    const th = row.querySelector('th');
                    const td = row.querySelector('td');
                    
                    if (th && td) {
                        const key = th.textContent?.trim().toLowerCase() || '';
                        const value = td.textContent?.trim() || '';
                        
                        // Flexible mapping based on keywords
                        if (key.includes('лот') && key.includes('№')) {
                            extractedData.lot_id = value.split(' ')[0];
                        }
                        else if (key.includes('заказчик') || key.includes('организатор')) {
                            extractedData.customer = value;
                        }
                        else if (key.includes('наименование') && (key.includes('тру') || key.includes('товар') || key.includes('услуг'))) {
                            extractedData.subject = value;
                        }
                        else if (key.includes('предмет') && key.includes('закуп')) {
                            extractedData.subject_type = value;
                        }
                        else if (key.includes('количество')) {
                            extractedData.quantity = value;
                        }
                        else if (key.includes('сумма') && (key.includes('закуп') || key.includes('планир') || key.includes('общ'))) {
                            extractedData.amount = value;
                        }
                        else if (key.includes('цена') && key.includes('един')) {
                            extractedData.unit_price = value;
                        }
                        else if (key.includes('статус')) {
                            extractedData.status = value;
                        }
                        else if (key.includes('способ') && key.includes('закуп')) {
                            extractedData.purchase_type = value;
                        }
                        else if (key.includes('характеристик') || key.includes('описание')) {
                            extractedData.description = value;
                        }
                        else if (key.includes('объявлени')) {
                            extractedData.announcement_info = value;
                        }
                        else if (key.includes('единица') && key.includes('измерени')) {
                            extractedData.unit = value;
                        }
                    }
                });
            });
        });
        
        // Also try to extract from links and other elements
        const links = doc.querySelectorAll('a[href*="subpriceoffer"], a[href*="announce"]');
        links.forEach(link => {
            const href = link.getAttribute('href');
            const text = link.textContent?.trim();
            
            if (href && text && !extractedData.subject) {
                extractedData.subject = text;
                extractedData.subject_link = href.startsWith('http') ? href : `https://goszakup.gov.kz${href}`;
            }
        });
        
        // Look for lot IDs in various places
        if (!extractedData.lot_id) {
            const url = goszakupUrl;
            const lotMatch = url.match(/\/(\d+[-]\w+)(?:\/|$)/);
            if (lotMatch) {
                extractedData.lot_id = lotMatch[1];
            }
        }
        
        // Create procurement record if we have minimum required data
        if (extractedData.lot_id || extractedData.subject || extractedData.customer || extractedData.amount) {
            const record: ProcurementData = {
                lot_id: extractedData.lot_id || `PARSED-${Date.now()}`,
                announcement: extractedData.announcement_info || extractedData.description || `Закупка: ${extractedData.subject || 'Не указано'}`,
                customer: extractedData.customer ? `Заказчик: ${extractedData.customer}` : 'Заказчик не указан',
                subject: extractedData.subject || extractedData.subject_type || 'Предмет не указан',
                subject_link: extractedData.subject_link || goszakupUrl,
                quantity: extractedData.quantity || '1',
                amount: extractedData.amount || extractedData.unit_price || '0',
                purchase_type: extractedData.purchase_type || 'Запрос ценовых предложений',
                status: extractedData.status || 'Опубликован'
            };
            
            procurementData.push(record);
        }
        
        // If we found multiple similar records, try to extract from table rows (lot lists)
        if (procurementData.length === 0) {
            const listTables = doc.querySelectorAll('table');
            listTables.forEach(table => {
                const rows = table.querySelectorAll('tbody tr');
                rows.forEach((row, index) => {
                    const cells = row.querySelectorAll('td');
                    if (cells.length >= 3) {
                        // Try to parse table rows as lot listings
                        const rowData: any = {};
                        
                        cells.forEach((cell, cellIndex) => {
                            const text = cell.textContent?.trim() || '';
                            const links = cell.querySelectorAll('a');
                            
                            // Look for lot ID patterns
                            if (text.match(/^\d+[-]\w+\d*$/)) {
                                rowData.lot_id = text;
                            }
                            // Look for money amounts
                            else if (text.match(/^[\d\s,]+\.\d{2}$/)) {
                                rowData.amount = text;
                            }
                            // Look for subjects in links
                            else if (links.length > 0 && !rowData.subject) {
                                rowData.subject = text;
                                const href = links[0].getAttribute('href');
                                if (href) {
                                    rowData.subject_link = href.startsWith('http') ? href : `https://goszakup.gov.kz${href}`;
                                }
                            }
                            // Look for customer info
                            else if (text.includes('Заказчик:') || text.length > 50) {
                                rowData.customer = text;
                            }
                            // Shorter text might be status or type
                            else if (text.length < 50 && text.length > 3) {
                                if (!rowData.status && (text.includes('Опубликован') || text.includes('состоялась'))) {
                                    rowData.status = text;
                                } else if (!rowData.purchase_type && text.includes('предложени')) {
                                    rowData.purchase_type = text;
                                }
                            }
                        });
                        
                        if (rowData.lot_id && (rowData.subject || rowData.amount)) {
                            procurementData.push({
                                lot_id: rowData.lot_id,
                                announcement: `Закупка: ${rowData.subject || 'Не указано'}`,
                                customer: rowData.customer || 'Заказчик не указан',
                                subject: rowData.subject || 'Предмет не указан',
                                subject_link: rowData.subject_link || goszakupUrl,
                                quantity: '1',
                                amount: rowData.amount || '0',
                                purchase_type: rowData.purchase_type || 'Запрос ценовых предложений',
                                status: rowData.status || 'Опубликован'
                            });
                        }
                    }
                });
            });
        }
        
        return procurementData;
    };

    const fetchGoszakupData = async () => {
        if (!goszakupUrl) {
            setError('Пожалуйста, введите URL объявления');
            return;
        }

        if (!goszakupUrl.includes('goszakup.gov.kz')) {
            setError('URL должен быть с сайта goszakup.gov.kz');
            return;
        }

        setGoszakupLoading(true);
        setError(null);
        addLog('Начало загрузки данных с Goszakup.gov.kz');

        try {
            // Try different approaches to bypass CORS
            let response;
            let html;

            // Method 1: Try with CORS proxy
            try {
                addLog('Попытка через CORS прокси...');
                const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(goszakupUrl)}`;
                response = await fetch(proxyUrl);
                if (response.ok) {
                    html = await response.text();
                    addLog('Данные получены через CORS прокси');
                }
            } catch (proxyError) {
                addLog('CORS прокси недоступен, пробуем прямой запрос...');
            }

            // Method 2: Try direct request with no-cors mode if proxy failed
            if (!html) {
                try {
                    addLog('Попытка прямого запроса...');
                    response = await fetch(goszakupUrl, {
                        mode: 'no-cors',
                        headers: {
                            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                            'Accept-Language': 'ru-RU,ru;q=0.9,en;q=0.8',
                            'Accept-Encoding': 'gzip, deflate, br',
                            'Cache-Control': 'no-cache',
                            'Pragma': 'no-cache',
                            'Sec-Fetch-Dest': 'document',
                            'Sec-Fetch-Mode': 'navigate',
                            'Sec-Fetch-Site': 'none',
                            'Upgrade-Insecure-Requests': '1'
                        }
                    });
                    html = await response.text();
                    addLog('Прямой запрос успешен');
                } catch (directError) {
                    addLog('Прямой запрос заблокирован');
                }
            }

            // Method 3: Try alternative CORS proxy
            if (!html) {
                try {
                    addLog('Попытка через альтернативный прокси...');
                    const altProxyUrl = `https://corsproxy.io/?${encodeURIComponent(goszakupUrl)}`;
                    response = await fetch(altProxyUrl);
                    if (response.ok) {
                        html = await response.text();
                        addLog('Данные получены через альтернативный прокси');
                    }
                } catch (altProxyError) {
                    addLog('Альтернативный прокси недоступен');
                }
            }

            if (!html) {
                throw new Error('Не удалось получить данные через доступные методы');
            }

            addLog('HTML получен, начинаем парсинг');
            const parsed = parseGoszakupData(html);
            
            if (parsed.length === 0) {
                throw new Error('Не удалось найти данные о закупках на указанной странице');
            }

            setTableData(parsed);
            addLog(`Успешно загружено ${parsed.length} записей с Goszakup.gov.kz`);
            
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Произошла неизвестная ошибка';
            
            if (errorMessage.includes('CORS') || errorMessage.includes('blocked') || errorMessage.includes('Failed to fetch')) {
                setError(
                    'Не удалось загрузить данные из-за ограничений браузера. ' +
                    'Попробуйте: 1) Отключить блокировщик рекламы, 2) Использовать другой браузер, ' +
                    '3) Установить расширение для отключения CORS (только для разработки)'
                );
            } else {
                setError(`Ошибка загрузки данных: ${errorMessage}`);
            }
            
            addLog(`Ошибка: ${errorMessage}`);
        } finally {
            setGoszakupLoading(false);
        }
    };

    const analyzeTableData = async () => {
        if (tableData.length === 0) {
            setError('Нет данных для анализа');
            return;
        }

        setLoading(true);
        setError(null);
        setLogs([]);
        addLog('Начало анализа данных таблицы');

        try {
            // Clean and convert table data to proper format for backend
            const cleanedData = tableData.map(row => ({
                ...row,
                quantity: cleanNumericValue(row.quantity),
                amount: cleanNumericValue(row.amount)
            }));

            addLog('Очистка и конвертация данных');
            const jsonData = JSON.stringify(cleanedData, null, 2);
            const blob = new Blob([jsonData], { type: 'application/json' });
            const file = new File([blob], 'table_data.json', { type: 'application/json' });

            addLog('Отправка данных на сервер');
            const result = await runScript(file);
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
            case 'Высокий': 
            case 'High': return 'text-red-600 bg-red-50 border-red-200';
            case 'Средний': 
            case 'Medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
            case 'Низкий': 
            case 'Low': return 'text-lime-600 bg-lime-50 border-lime-200';
            default: return 'text-gray-600 bg-gray-50 border-gray-200';
        }
    };

    const getLevelWeight = (level: string) => {
        switch (level) {
            case 'Высокий':
            case 'High': return 3;
            case 'Средний':
            case 'Medium': return 2;
            case 'Низкий':
            case 'Low': return 1;
            default: return 0;
        }
    };

    const translateSuspicionLevel = (level: string) => {
        switch (level) {
            case 'High': return 'Высокий';
            case 'Medium': return 'Средний';
            case 'Low': return 'Низкий';
            default: return level;
        }
    };

    const filterAndSortResults = (results: AnalysisResult[]) => {
        let filteredResults = results;
        
        // Фильтрация по уровню
        if (selectedLevel !== 'all') {
            filteredResults = results.filter(result => 
                translateSuspicionLevel(result.suspicion_level) === selectedLevel
            );
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

    const parseAgentSearchResults = (html: string): ProcurementData[] => {
        try {
            addLog('Инициализация Cheerio парсера...');
            const $ = cheerio.load(html);
            const procurementData: ProcurementData[] = [];
            
            // Look for the search results table with multiple selectors
            const tableSelectors = [
                '#search-result',
                'table.table-bordered.table-striped.dataTable',
                'table.dataTable',
                'table[id*="search"]',
                'table.table-bordered'
            ];
            
            let $table = $();
            for (const selector of tableSelectors) {
                $table = $(selector);
                if ($table.length > 0) {
                    addLog(`Найдена таблица с селектором: ${selector}`);
                    break;
                }
            }
            
            if ($table.length === 0) {
                addLog('⚠️ Таблица с результатами поиска не найдена');
                // Try to find any table with procurement data
                $('table').each((i, table) => {
                    const $t = $(table);
                    if ($t.find('td:contains("лот"), td:contains("ЗЦП"), td:contains("закуп")').length > 0) {
                        $table = $t;
                        addLog(`Найдена потенциальная таблица данных: table[${i}]`);
                        return false; // break
                    }
                });
            }
            
            if ($table.length === 0) {
                addLog('❌ Не удалось найти таблицу с данными о закупках');
                return [];
            }
            
            // Find all data rows
            const $rows = $table.find('tbody tr, tr').filter((i, row) => {
                const $row = $(row);
                return $row.find('td').length > 2; // Must have at least 3 columns
            });
            
            addLog(`Найдено строк для обработки: ${$rows.length}`);
            
            $rows.each((index, row) => {
                try {
                    const $row = $(row);
                    const $cells = $row.find('td');
                    
                    if ($cells.length === 0) return;
                    
                    // Extract lot ID - look for patterns like "12345-ЗЦП1"
                    let lotId = '';
                    $cells.each((i, cell) => {
                        const $cell = $(cell);
                        const text = $cell.text().trim();
                        const strongText = $cell.find('strong').text().trim();
                        
                        // Look for lot ID pattern
                        const lotPattern = /\d+(-ЗЦП\d+)?/;
                        if (lotPattern.test(strongText)) {
                            lotId = strongText;
                            return false; // break
                        } else if (lotPattern.test(text) && !lotId) {
                            lotId = text.match(lotPattern)?.[0] || '';
                        }
                    });
                    
                    // Extract announcement and link
                    let announcement = '';
                    let announcementLink = '';
                    $cells.find('a[href*="/announce/index/"]').each((i, link) => {
                        const $link = $(link);
                        announcement = $link.text().trim();
                        const href = $link.attr('href');
                        announcementLink = href?.startsWith('http') ? href : `https://goszakup.gov.kz${href}`;
                        return false; // break - take first one
                    });
                    
                    // Extract customer - look for "Заказчик:" text
                    let customer = '';
                    $cells.find('small, .small, span').each((i, elem) => {
                        const text = $(elem).text();
                        if (text.includes('Заказчик:')) {
                            const customerMatch = text.match(/Заказчик:\s*(.+?)(?:\n|<|$)/);
                            if (customerMatch) {
                                customer = customerMatch[1].trim();
                                return false; // break
                            }
                        }
                    });
                    
                    // Extract subject and subject link
                    let subject = '';
                    let subjectLink = '';
                    $cells.find('a[href*="/subpriceoffer/index/"]').each((i, link) => {
                        const $link = $(link);
                        subject = $link.text().trim();
                        const href = $link.attr('href');
                        subjectLink = href?.startsWith('http') ? href : `https://goszakup.gov.kz${href}`;
                        return false; // break - take first one
                    });
                    
                    // Extract quantity - look for numeric values in center-aligned cells
                    let quantity = '';
                    $cells.filter('.text-center, [align="center"]').each((i, cell) => {
                        const text = $(cell).text().trim();
                        if (/^\d+$/.test(text) && parseInt(text) < 1000000) { // reasonable quantity limit
                            quantity = text;
                            return false; // break
                        }
                    });
                    
                    // Extract amount - look for money format
                    let amount = '';
                    $cells.find('strong').each((i, elem) => {
                        const text = $(elem).text().trim();
                        // Match money format: "123 456.78" or "123456.78"
                        if (/[\d\s]+\.\d{2}$/.test(text)) {
                            amount = text.replace(/\s/g, '');
                            return false; // break
                        }
                    });
                    
                    // If no amount in strong tags, check all cells
                    if (!amount) {
                        $cells.each((i, cell) => {
                            const text = $(cell).text().trim();
                            if (/^\d[\d\s]*\.\d{2}$/.test(text)) {
                                amount = text.replace(/\s/g, '');
                                return false; // break
                            }
                        });
                    }
                    
                    // Extract purchase type and status
                    let purchaseType = '';
                    let status = '';
                    $cells.each((i, cell) => {
                        const text = $(cell).text().trim();
                        if (text.includes('Запрос ценовых предложений') && !purchaseType) {
                            purchaseType = text;
                        }
                        if (text === 'Опубликован' && !status) {
                            status = text;
                        }
                    });
                    
                    // Only add if we have essential data
                    if (lotId && (announcement || subject)) {
                        const procurement: ProcurementData = {
                            lot_id: lotId,
                            announcement: announcement || subject,
                            customer: customer || 'Не указано',
                            subject: subject || announcement || 'Не указано',
                            subject_link: subjectLink || announcementLink || '',
                            quantity: quantity || '1',
                            amount: amount || '0',
                            purchase_type: purchaseType || 'Неизвестно',
                            status: status || 'Неизвестно'
                        };
                        
                        procurementData.push(procurement);
                        addLog(`✅ Обработана запись ${index + 1}: ${lotId} - ${(announcement || subject).substring(0, 50)}...`);
                    } else {
                        addLog(`⚠️ Пропущена строка ${index + 1}: недостаточно данных (lotId: ${lotId}, announcement: ${!!announcement}, subject: ${!!subject})`);
                    }
                } catch (err) {
                    addLog(`❌ Ошибка обработки строки ${index + 1}: ${err}`);
                }
            });
            
            addLog(`🎉 Успешно извлечено записей: ${procurementData.length}`);
            return procurementData;
            
        } catch (err) {
            addLog(`💥 Критическая ошибка парсинга: ${err}`);
            return [];
        }
    };

    const fetchAgentData = async (isBackground = false) => {
        // Skip if not active and this is a background request
        if (isBackground && !agentActive) {
            return;
        }
        if (!agentUrl) {
            if (!isBackground) setError('Пожалуйста, введите URL страницы');
            return;
        }

        if (!agentUrl.includes('goszakup.gov.kz')) {
            if (!isBackground) setError('URL должен быть с сайта goszakup.gov.kz');
            return;
        }

        if (!isBackground) {
            setAgentLoading(true);
            setError(null);
            setLogs([]);
        }
        
        // Update stats
        setAgentStats(prev => ({
            ...prev,
            totalFetches: prev.totalFetches + 1,
            lastFetch: new Date()
        }));

        const logPrefix = isBackground ? '🤖 Agent:' : '📥 Manual:';
        addLog(`${logPrefix} Начало загрузки данных с Goszakup.gov.kz`);

        try {
            // Try different approaches to bypass CORS - same as goszakup tab
            let response;
            let html;

            // Method 1: Try with CORS proxy
            try {
                addLog(`${logPrefix} Попытка через CORS прокси...`);
                const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(agentUrl)}`;
                response = await fetch(proxyUrl);
                if (response.ok) {
                    html = await response.text();
                    addLog(`${logPrefix} Данные получены через CORS прокси`);
                }
            } catch (proxyError) {
                addLog(`${logPrefix} CORS прокси недоступен, пробуем прямой запрос...`);
            }

            // Method 2: Try direct request with no-cors mode if proxy failed
            if (!html) {
                try {
                    addLog(`${logPrefix} Попытка прямого запроса...`);
                    response = await fetch(agentUrl, {
                        mode: 'no-cors',
                        headers: {
                            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                            'Accept-Language': 'ru-RU,ru;q=0.9,en;q=0.8',
                            'Accept-Encoding': 'gzip, deflate, br',
                            'Cache-Control': 'no-cache',
                            'Pragma': 'no-cache',
                            'Sec-Fetch-Dest': 'document',
                            'Sec-Fetch-Mode': 'navigate',
                            'Sec-Fetch-Site': 'none',
                            'Upgrade-Insecure-Requests': '1'
                        }
                    });
                    html = await response.text();
                    addLog(`${logPrefix} Прямой запрос успешен`);
                } catch (directError) {
                    addLog(`${logPrefix} Прямой запрос заблокирован`);
                }
            }

            // Method 3: Try alternative CORS proxy
            if (!html) {
                try {
                    addLog(`${logPrefix} Попытка через альтернативный прокси...`);
                    const altProxyUrl = `https://corsproxy.io/?${encodeURIComponent(agentUrl)}`;
                    response = await fetch(altProxyUrl);
                    if (response.ok) {
                        html = await response.text();
                        addLog(`${logPrefix} Данные получены через альтернативный прокси`);
                    }
                } catch (altProxyError) {
                    addLog(`${logPrefix} Альтернативный прокси недоступен`);
                }
            }

            if (!html) {
                throw new Error('Не удалось получить данные через доступные методы');
            }

            addLog(`${logPrefix} HTML получен, начинаем парсинг`);
            const parsed = parseAgentSearchResults(html);
            
            if (parsed.length === 0) {
                throw new Error('Не удалось найти данные о закупках на указанной странице');
            }

            // Check for new records if running in background
            const existingLotIds = new Set(tableData.map(item => item.lot_id));
            const newRecords = isBackground ? parsed.filter(item => !existingLotIds.has(item.lot_id)) : parsed;
            
            if (isBackground && newRecords.length > 0) {
                // Append new records to existing data
                setTableData(prev => [...prev, ...newRecords]);
                addLog(`${logPrefix} 🆕 Найдено ${newRecords.length} новых записей`);
                
                setAgentStats(prev => ({
                    ...prev,
                    successfulFetches: prev.successfulFetches + 1,
                    newRecords: prev.newRecords + newRecords.length,
                    totalRecords: prev.totalRecords + newRecords.length
                }));
            } else if (!isBackground) {
                // Replace data for manual fetch
                setTableData(parsed);
                setAgentStats(prev => ({
                    ...prev,
                    successfulFetches: prev.successfulFetches + 1,
                    totalRecords: parsed.length
                }));
            } else {
                addLog(`${logPrefix} ℹ️ Новых записей не найдено`);
                setAgentStats(prev => ({
                    ...prev,
                    successfulFetches: prev.successfulFetches + 1
                }));
            }

            addLog(`${logPrefix} ✅ Успешно загружено ${parsed.length} записей с Goszakup.gov.kz`);
            
            // Auto-analyze if agent is active and we have data to analyze
            const hasDataToAnalyze = isBackground ? newRecords.length > 0 : parsed.length > 0;
            const shouldAnalyze = agentActive && hasDataToAnalyze;
            addLog(`${logPrefix} 🔍 Проверка автоанализа: agentActive=${agentActive}, isBackground=${isBackground}, hasData=${hasDataToAnalyze}, newRecords=${newRecords?.length || 0}, parsed=${parsed.length}`);
            
            if (shouldAnalyze) {
                addLog(`${logPrefix} 🔄 Запуск автоматического анализа...`);
                try {
                    await analyzeTableData();
                    addLog(`${logPrefix} ✅ Автоматический анализ завершен`);
                } catch (analyzeErr) {
                    addLog(`${logPrefix} ❌ Ошибка автоматического анализа: ${analyzeErr instanceof Error ? analyzeErr.message : 'Неизвестная ошибка'}`);
                }
            } else {
                addLog(`${logPrefix} ⏸️ Автоанализ пропущен (не выполнены условия)`);
            }
            
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Произошла неизвестная ошибка';
            
            if (!isBackground) {
                if (errorMessage.includes('CORS') || errorMessage.includes('blocked') || errorMessage.includes('Failed to fetch')) {
                    setError(
                        'Не удалось загрузить данные из-за ограничений браузера. ' +
                        'Попробуйте: 1) Отключить блокировщик рекламы, 2) Использовать другой браузер, ' +
                        '3) Установить расширение для отключения CORS (только для разработки)'
                    );
                } else {
                    setError(`Ошибка загрузки данных: ${errorMessage}`);
                }
            }
            
            addLog(`${logPrefix} ❌ Ошибка: ${errorMessage}`);
        } finally {
            if (!isBackground) {
                setAgentLoading(false);
            }
        }
    };

    const startAgent = () => {
        if (agentIntervalId) {
            clearInterval(agentIntervalId);
        }

        setAgentActive(true);
        addLog('🚀 Agent Mode активирован');
        addLog(`⏰ Интервал мониторинга: ${agentInterval} секунд`);

        // Initial fetch (not background to trigger analysis)
        fetchAgentData(false);

        // Set up interval for background fetching
        const intervalId = setInterval(() => {
            fetchAgentData(true);
        }, agentInterval * 1000);

        setAgentIntervalId(intervalId);
    };

    const stopAgent = () => {
        if (agentIntervalId) {
            clearInterval(agentIntervalId);
            setAgentIntervalId(null);
        }
        
        setAgentActive(false);
        addLog('🛑 Agent Mode деактивирован');
    };

    // Cleanup interval on component unmount
    useEffect(() => {
        return () => {
            if (agentIntervalId) {
                clearInterval(agentIntervalId);
            }
        };
    }, [agentIntervalId]);

    // Wrapper functions for button handlers
    const handleFetchAgentData = () => fetchAgentData(false);
    const handleStartAgent = () => startAgent();
    const handleStopAgent = () => stopAgent();



    return (
        <div className="min-h-screen bg-gray-50/50 text-gray-900 pt-24">
            <div className="container mx-auto px-6 py-16">
                <div className="max-w-6xl mx-auto">
                    {/* Header */}
                    <div className="text-center mb-12">
                        <div className="inline-flex items-center rounded-full border border-lime-200 bg-lime-50 px-3 py-1 text-sm text-lime-700 mb-6">
                            <BarChart3 className="w-4 h-4 mr-2" />
                            Анализ закупок
                        </div>
                        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                            Анализ закупок
                        </h1>
                        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                            Загрузите данные о закупках для выявления потенциальных коррупционных рисков
                        </p>
                    </div>

                    {/* Data Source Tabs */}
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm mb-8">
                        <div className="flex border-b border-gray-100">
                            <button
                                onClick={() => setActiveTab('upload')}
                                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors ${
                                    activeTab === 'upload'
                                        ? 'border-b-2 border-lime-500 text-lime-600'
                                        : 'text-gray-600 hover:text-gray-900'
                                }`}
                            >
                                <Upload className="w-4 h-4" />
                                Загрузка файла
                            </button>
                            <button
                                onClick={() => setActiveTab('editor')}
                                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors ${
                                    activeTab === 'editor'
                                        ? 'border-b-2 border-lime-500 text-lime-600'
                                        : 'text-gray-600 hover:text-gray-900'
                                }`}
                            >
                                <Table className="w-4 h-4" />
                                Редактор таблицы
                            </button>
                            <button
                                onClick={() => setActiveTab('sample')}
                                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors ${
                                    activeTab === 'sample'
                                        ? 'border-b-2 border-lime-500 text-lime-600'
                                        : 'text-gray-600 hover:text-gray-900'
                                }`}
                            >
                                <Database className="w-4 h-4" />
                                Образцы данных
                            </button>
                            <button
                                onClick={() => setActiveTab('goszakup')}
                                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors ${
                                    activeTab === 'goszakup'
                                        ? 'border-b-2 border-lime-500 text-lime-600'
                                        : 'text-gray-600 hover:text-gray-900'
                                }`}
                            >
                                <Globe className="w-4 h-4" />
                                Goszakup.gov.kz
                            </button>
                            <button
                                onClick={() => setActiveTab('agent')}
                                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors ${
                                    activeTab === 'agent'
                                        ? 'border-b-2 border-lime-500 text-lime-600'
                                        : 'text-gray-600 hover:text-gray-900'
                                }`}
                            >
                                <Bot className="w-4 h-4" />
                                Agent Mode
                            </button>
                        </div>

                        <div className="p-8">
                            {/* File Upload Tab */}
                            {activeTab === 'upload' && (
                                <div>
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="w-12 h-12 bg-lime-100 rounded-lg flex items-center justify-center">
                                            <Upload className="w-6 h-6 text-lime-600" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-semibold text-gray-900">Загрузка данных</h3>
                                            <p className="text-gray-600">Выберите JSON файл с данными о закупках</p>
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-4">
                                        <div>
                                            <Label htmlFor="file" className="text-sm font-medium text-gray-700 mb-2 block">
                                                Файл данных (JSON)
                                            </Label>
                                            <div className="flex gap-3">
                                                <Input
                                                    id="file"
                                                    type="file"
                                                    accept=".json"
                                                    onChange={handleFileChange}
                                                    className="flex-1 border-gray-200 focus:border-lime-500 focus:ring-lime-500/20"
                                                />
                                                <Button 
                                                    onClick={handleAnalysis}
                                                    disabled={loading || !selectedFile}
                                                    className="bg-lime-500 hover:bg-lime-600 text-white px-6 py-2 font-medium transition-colors duration-200"
                                                >
                                                    {loading ? (
                                                        <>
                                                            <Clock className="w-4 h-4 mr-2 animate-spin" />
                                                            Анализ...
                                                        </>
                                                    ) : (
                                                        'Запустить анализ'
                                                    )}
                                                </Button>
                                            </div>
                                            {selectedFile && (
                                                <p className="text-sm text-gray-600 mt-2 flex items-center gap-2">
                                                    <CheckCircle className="w-4 h-4 text-lime-500" />
                                                    Выбранный файл: {selectedFile.name}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Table Editor Tab */}
                            {activeTab === 'editor' && (
                                <div>
                                    <div className="flex items-center justify-between mb-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                                                <Edit className="w-6 h-6 text-blue-600" />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-semibold text-gray-900">Редактор таблицы</h3>
                                                <p className="text-gray-600">Создайте или отредактируйте данные напрямую</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button 
                                                onClick={addNewRow}
                                                variant="outline"
                                                className="flex items-center gap-2"
                                            >
                                                <Plus className="w-4 h-4" />
                                                Добавить строку
                                            </Button>
                                            <Button 
                                                onClick={downloadTableData}
                                                variant="outline"
                                                disabled={tableData.length === 0}
                                                className="flex items-center gap-2"
                                            >
                                                <Download className="w-4 h-4" />
                                                Скачать JSON
                                            </Button>
                                            <Button 
                                                onClick={analyzeTableData}
                                                disabled={loading || tableData.length === 0}
                                                className="bg-lime-500 hover:bg-lime-600 text-white"
                                            >
                                                {loading ? (
                                                    <>
                                                        <Clock className="w-4 h-4 mr-2 animate-spin" />
                                                        Анализ...
                                                    </>
                                                ) : (
                                                    'Анализировать'
                                                )}
                                            </Button>
                                        </div>
                                    </div>

                                    {tableData.length === 0 ? (
                                        <div className="text-center py-12 bg-gray-50 rounded-lg">
                                            <Table className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                            <p className="text-gray-600 mb-4">Нет данных для редактирования</p>
                                            <Button onClick={addNewRow} className="bg-lime-500 hover:bg-lime-600 text-white">
                                                Добавить первую строку
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="overflow-x-auto">
                                            <table className="w-full border border-gray-200 rounded-lg">
                                                <thead className="bg-gray-50">
                                                    <tr>
                                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID лота</th>
                                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Объявление</th>
                                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Заказчик</th>
                                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Предмет</th>
                                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Количество</th>
                                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Сумма</th>
                                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Действия</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-200">
                                                    {tableData.map((row, index) => (
                                                        <tr key={index}>
                                                            <td className="px-4 py-3">
                                                                <Input
                                                                    value={row.lot_id}
                                                                    onChange={(e) => updateRow(index, 'lot_id', e.target.value)}
                                                                    className="w-full"
                                                                    placeholder="ID лота"
                                                                />
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <Input
                                                                    value={row.announcement}
                                                                    onChange={(e) => updateRow(index, 'announcement', e.target.value)}
                                                                    className="w-full"
                                                                    placeholder="Объявление"
                                                                />
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <Input
                                                                    value={row.customer}
                                                                    onChange={(e) => updateRow(index, 'customer', e.target.value)}
                                                                    className="w-full"
                                                                    placeholder="Заказчик"
                                                                />
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <Input
                                                                    value={row.subject}
                                                                    onChange={(e) => updateRow(index, 'subject', e.target.value)}
                                                                    className="w-full"
                                                                    placeholder="Предмет"
                                                                />
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <Input
                                                                    value={row.quantity}
                                                                    onChange={(e) => updateRow(index, 'quantity', e.target.value)}
                                                                    className="w-full"
                                                                    placeholder="Количество"
                                                                />
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <Input
                                                                    value={row.amount}
                                                                    onChange={(e) => updateRow(index, 'amount', e.target.value)}
                                                                    className="w-full"
                                                                    placeholder="Сумма"
                                                                />
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <Button
                                                                    onClick={() => removeRow(index)}
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className="text-red-600 hover:text-red-700"
                                                                >
                                                                    Удалить
                                                                </Button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Sample Data Tab */}
                            {activeTab === 'sample' && (
                                <div>
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                                            <Database className="w-6 h-6 text-purple-600" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-semibold text-gray-900">Образцы данных</h3>
                                            <p className="text-gray-600">Загрузите готовые образцы данных для тестирования</p>
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-4">
                                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
                                            <h4 className="font-medium text-purple-900 mb-2">Готовые образцы данных</h4>
                                            <p className="text-purple-700 mb-4">
                                                Образцы содержат реальные данные о государственных закупках для демонстрации работы системы анализа.
                                            </p>
                                            <div className="flex gap-3">
                                                <Button 
                                                    onClick={loadSampleData}
                                                    className="bg-purple-500 hover:bg-purple-600 text-white"
                                                >
                                                    Загрузить образцы данных
                                                </Button>
                                                {tableData.length > 0 && (
                                                    <Button 
                                                        onClick={analyzeTableData}
                                                        disabled={loading}
                                                        className="bg-lime-500 hover:bg-lime-600 text-white"
                                                    >
                                                        {loading ? 'Анализ...' : 'Анализировать образцы'}
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                        {tableData.length > 0 && (
                                            <div className="text-sm text-gray-600">
                                                Загружено записей: {tableData.length}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Goszakup Tab */}
                            {activeTab === 'goszakup' && (
                                <div>
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="w-12 h-12 bg-lime-100 rounded-lg flex items-center justify-center">
                                            <Globe className="w-6 h-6 text-lime-600" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-semibold text-gray-900">Импорт из Goszakup.gov.kz</h3>
                                            <p className="text-gray-600">Получите данные напрямую с портала государственных закупок</p>
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-4">
                                        <div className="bg-lime-50 border border-lime-200 rounded-lg p-6">
                                            <h4 className="font-medium text-lime-900 mb-2">Импорт данных с Goszakup.gov.kz</h4>
                                            <p className="text-lime-700 mb-4">
                                                Введите URL страницы объявления с goszakup.gov.kz для автоматического извлечения данных о закупке.
                                            </p>
                                            <div>
                                                <Label htmlFor="goszakup-url" className="text-sm font-medium text-lime-700 mb-2 block">
                                                    URL объявления
                                                </Label>
                                                <div className="flex gap-3">
                                                    <Input
                                                        id="goszakup-url"
                                                        value={goszakupUrl}
                                                        onChange={(e) => setGoszakupUrl(e.target.value)}
                                                        placeholder="https://goszakup.gov.kz/ru/subpriceoffer/index/..."
                                                        className="flex-1"
                                                    />
                                                    <Button 
                                                        onClick={fetchGoszakupData}
                                                        disabled={goszakupLoading || !goszakupUrl}
                                                        className="bg-lime-500 hover:bg-lime-600 text-white"
                                                    >
                                                        {goszakupLoading ? (
                                                            <>
                                                                <Clock className="w-4 h-4 mr-2 animate-spin" />
                                                                Загрузка...
                                                            </>
                                                        ) : (
                                                            'Импортировать'
                                                        )}
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>

                                        {tableData.length > 0 && (
                                            <div className="bg-lime-50 border border-lime-200 rounded-lg p-4">
                                                <div className="flex items-center justify-between">
                                                    <p className="text-sm text-lime-600 flex items-center gap-2">
                                                        <CheckCircle className="w-4 h-4" />
                                                        Загружено записей: {tableData.length}
                                                    </p>
                                                    <Button 
                                                        onClick={analyzeTableData}
                                                        disabled={loading}
                                                        size="sm"
                                                        className="bg-lime-500 hover:bg-lime-600 text-white"
                                                    >
                                                        {loading ? 'Анализ...' : 'Анализировать'}
                                                    </Button>
                                                </div>
                                            </div>
                                        )}

                                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                                            <h4 className="font-medium text-yellow-900 mb-2">⚠️ Ограничения браузера</h4>
                                            <p className="text-yellow-700 mb-3">
                                                Из-за политики CORS большинство браузеров блокируют прямые запросы к goszakup.gov.kz. 
                                                Возможные решения:
                                            </p>
                                            <ul className="text-yellow-700 text-sm space-y-1 list-disc list-inside">
                                                <li>Скопируйте HTML страницы и используйте редактор таблицы</li>
                                                <li>Используйте расширение браузера для отключения CORS (только для разработки)</li>
                                                <li>Дождитесь серверной реализации в следующих обновлениях</li>
                                            </ul>
                                        </div>

                                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                                            <h4 className="font-medium text-blue-900 mb-2">📋 Как использовать</h4>
                                            <ol className="text-blue-700 text-sm space-y-1 list-decimal list-inside">
                                                <li>Откройте страницу объявления на goszakup.gov.kz</li>
                                                <li>Скопируйте URL из адресной строки</li>
                                                <li>Вставьте URL в поле выше</li>
                                                <li>Нажмите "Импортировать" для загрузки данных</li>
                                                <li>Система попробует несколько методов для обхода CORS</li>
                                                <li>После успешной загрузки нажмите "Анализировать"</li>
                                            </ol>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Agent Mode Tab */}
                            {activeTab === 'agent' && (
                                <div>
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="w-12 h-12 bg-lime-100 rounded-lg flex items-center justify-center">
                                            <Bot className="w-6 h-6 text-lime-600" />
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="text-lg font-semibold text-gray-900">Agent Mode</h3>
                                            <p className="text-gray-600">Автоматический мониторинг в фоновом режиме</p>
                                            {agentActive && (
                                                <div className="mt-2 flex items-center space-x-4 text-xs">
                                                    <span className="flex items-center text-green-600">
                                                        <div className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse"></div>
                                                        Агент активен
                                                    </span>
                                                    <span className="text-gray-600">
                                                        Проверок: {agentStats.totalFetches}
                                                    </span>
                                                    <span className="text-gray-600">
                                                        Успешных: {agentStats.successfulFetches}
                                                    </span>
                                                    <span className="text-gray-600">
                                                        Новых записей: {agentStats.newRecords}
                                                    </span>
                                                    {agentStats.lastFetch && (
                                                        <span className="text-gray-600">
                                                            Последняя: {agentStats.lastFetch.toLocaleTimeString()}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-4">
                                                                                 <div className="bg-lime-50 border border-lime-200 rounded-lg p-6">
                                             <h4 className="font-medium text-lime-900 mb-4">Автоматическое получение данных</h4>
                                             <div className="mb-4">
                                                 <Label htmlFor="agent-url" className="text-sm font-medium text-lime-700 mb-2 block">
                                                     URL страницы поиска
                                                 </Label>
                                                 <div className="space-y-3">
                                                     <div className="flex gap-3">
                                                         <Input
                                                             id="agent-url"
                                                             value={agentUrl}
                                                             onChange={(e) => setAgentUrl(e.target.value)}
                                                             placeholder="https://goszakup.gov.kz/ru/search/lots"
                                                             className="flex-1"
                                                             disabled={agentActive}
                                                         />
                                                         <Input
                                                             type="number"
                                                             min="30"
                                                             max="3600"
                                                             value={agentInterval}
                                                             onChange={(e) => setAgentInterval(Number(e.target.value))}
                                                             placeholder="60"
                                                             className="w-20"
                                                             disabled={agentActive}
                                                         />
                                                         <span className="flex items-center text-sm text-gray-600">сек</span>
                                                     </div>
                                                     
                                                     <div className="flex gap-3">
                                                         {!agentActive ? (
                                                             <>
                                                                 <Button 
                                                                     onClick={handleStartAgent}
                                                                     disabled={!agentUrl.trim()}
                                                                     className="bg-green-600 hover:bg-green-700 text-white"
                                                                 >
                                                                     <Bot className="w-4 h-4 mr-2" />
                                                                     Запустить агента
                                                                 </Button>
                                                                 <Button 
                                                                     onClick={handleFetchAgentData}
                                                                     disabled={agentLoading || !agentUrl.trim()}
                                                                     className="bg-lime-500 hover:bg-lime-600 text-white"
                                                                 >
                                                                     {agentLoading ? (
                                                                         <>
                                                                             <Clock className="w-4 h-4 mr-2 animate-spin" />
                                                                             Загрузка...
                                                                         </>
                                                                     ) : (
                                                                         'Разовая загрузка'
                                                                     )}
                                                                 </Button>
                                                             </>
                                                         ) : (
                                                             <Button 
                                                                 onClick={handleStopAgent}
                                                                 className="bg-red-600 hover:bg-red-700 text-white"
                                                             >
                                                                 <Bot className="w-4 h-4 mr-2" />
                                                                 Остановить агента
                                                             </Button>
                                                         )}
                                                     </div>
                                                 </div>
                                             </div>
                                             

                                         </div>

                                         {!agentActive && tableData.length > 0 && (
                                             <div className="flex gap-3">
                                                 <Button 
                                                     onClick={analyzeTableData}
                                                     disabled={loading}
                                                     className="bg-blue-500 hover:bg-blue-600 text-white"
                                                 >
                                                     {loading ? (
                                                         <>
                                                             <Clock className="w-4 h-4 mr-2 animate-spin" />
                                                             Анализ...
                                                         </>
                                                     ) : (
                                                         'Анализировать'
                                                     )}
                                                 </Button>
                                             </div>
                                         )}

                                         {tableData.length > 0 && (
                                             <div className="bg-lime-50 border border-lime-200 rounded-lg p-4">
                                                 <div className="flex items-center justify-between">
                                                     <p className="text-sm text-lime-600 flex items-center gap-2">
                                                         <CheckCircle className="w-4 h-4" />
                                                         Загружено записей: {tableData.length}
                                                     </p>
                                                     <div className="flex gap-2">
                                                         <Button 
                                                             onClick={downloadTableData}
                                                             variant="outline"
                                                             size="sm"
                                                             className="flex items-center gap-2"
                                                         >
                                                             <Download className="w-4 h-4" />
                                                             Скачать JSON
                                                         </Button>
                                                     </div>
                                                 </div>
                                             </div>
                                         )}

                                         <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                                             <h4 className="font-medium text-blue-900 mb-2">📋 Как использовать Agent Mode</h4>
                                             <div className="text-blue-700 text-sm space-y-3">
                                                 <div>
                                                     <strong>Автоматический режим агента:</strong>
                                                     <ol className="list-decimal list-inside space-y-1 mt-1">
                                                         <li>Введите URL страницы поиска (по умолчанию уже указан)</li>
                                                         <li>Установите интервал проверки в секундах (минимум 30 сек)</li>
                                                         <li>Нажмите "Запустить агента" - система начнет мониторинг в фоновом режиме</li>
                                                         <li>Агент будет автоматически загружать новые данные и анализировать их</li>
                                                         <li>Для остановки нажмите "Остановить агента"</li>
                                                     </ol>
                                                 </div>
                                                 <div>
                                                     <strong>Разовая загрузка:</strong>
                                                     <ol className="list-decimal list-inside space-y-1 mt-1">
                                                         <li>Введите URL страницы поиска</li>
                                                         <li>Нажмите "Разовая загрузка" для однократного получения данных</li>
                                                         <li>После загрузки используйте кнопку "Анализировать" для анализа</li>
                                                     </ol>
                                                 </div>
                                             </div>
                                         </div>

                                         <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
                                             <h4 className="font-medium text-amber-900 mb-2">⚠️ Ограничения CORS</h4>
                                             <p className="text-amber-700 text-sm">
                                                 Автоматическая загрузка может не работать из-за политики CORS. 
                                                 Система попробует несколько методов обхода, включая прокси-сервисы. 
                                                 Если автозагрузка не работает, используйте ручной ввод HTML.
                                             </p>
                                         </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Status Section */}
                    {(executionTime !== null || error || logs.length > 0) && (
                        <div className="grid md:grid-cols-2 gap-6 mb-8">
                            {/* Execution Time */}
                            {executionTime !== null && (
                                <div className="bg-lime-50 border border-lime-200 rounded-xl p-6">
                                    <div className="flex items-center gap-3">
                                        <CheckCircle className="w-6 h-6 text-lime-600" />
                                        <div>
                                            <h4 className="font-semibold text-lime-900">Анализ завершен</h4>
                                            <p className="text-lime-700">Время выполнения: {executionTime} секунд</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Error Display */}
                            {error && (
                                <div className="bg-red-50 border border-red-200 rounded-xl p-6">
                                    <div className="flex items-start gap-3">
                                        <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                                        <div>
                                            <h4 className="font-semibold text-red-900 mb-2">Ошибка</h4>
                                            <pre className="text-sm text-red-700 whitespace-pre-wrap">{error}</pre>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Logs */}
                            {logs.length > 0 && (
                                <div className={`bg-gray-50 border border-gray-200 rounded-xl p-6 ${executionTime !== null || error ? 'md:col-span-2' : ''}`}>
                                    <h4 className="font-semibold text-gray-900 mb-3">Журнал выполнения</h4>
                                    <div className="space-y-1 max-h-32 overflow-y-auto">
                                        {logs.map((log, index) => (
                                            <div key={index} className="text-sm text-gray-600 font-mono">
                                                {log}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Results Section */}
                    {results && (
                        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                            <div className="p-6 border-b border-gray-100">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-900">Результаты анализа</h3>
                                        <p className="text-gray-600">Найдено {results.length} записей для анализа</p>
                                    </div>
                                    <div className="flex gap-3">
                                        <select
                                            value={selectedLevel}
                                            onChange={(e) => setSelectedLevel(e.target.value as SuspicionLevel)}
                                            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-lime-500/20 focus:border-lime-500"
                                        >
                                            <option value="all">Все уровни</option>
                                            <option value="Высокий">Высокий риск</option>
                                            <option value="Средний">Средний риск</option>
                                            <option value="Низкий">Низкий риск</option>
                                        </select>
                                        <select
                                            value={sortType}
                                            onChange={(e) => setSortType(e.target.value as SortType)}
                                            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-lime-500/20 focus:border-lime-500"
                                        >
                                            <option value="probability_desc">По убыванию вероятности</option>
                                            <option value="probability_asc">По возрастанию вероятности</option>
                                            <option value="level">По уровню риска</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="divide-y divide-gray-100">
                                {filterAndSortResults(results).map((result, index) => (
                                    <div key={result.id || index} className="p-6">
                                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                            <div className="flex-1">
                                                <div className="flex items-start gap-3 mb-3">
                                                    <div className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border ${getSuspicionColor(result.suspicion_level)}`}>
                                                        {translateSuspicionLevel(result.suspicion_level)} риск
                                                    </div>
                                                    <div className="text-lg font-medium text-gray-900">
                                                        {formatProbability(result.suspicion_percentage)}
                                                    </div>
                                                </div>
                                                <h4 className="font-medium text-gray-900 mb-2">{result.subject}</h4>
                                                <div className="grid sm:grid-cols-2 gap-4 text-sm text-gray-600">
                                                    <div>
                                                        <span className="font-medium">Сумма:</span> {formatAmount(result.amount)} ₸
                                                    </div>
                                                    <div>
                                                        <span className="font-medium">Количество:</span> {formatQuantity(result.quantity)}
                                                    </div>
                                                </div>
                                            </div>
                                            {result.subject_link && (
                                                <div>
                                                    <Link 
                                                        href={result.subject_link} 
                                                        target="_blank"
                                                        className="inline-flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors duration-200"
                                                    >
                                                        Подробнее
                                                    </Link>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}