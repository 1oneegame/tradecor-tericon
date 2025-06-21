import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

export async function POST(req: Request) {
    const startTime = Date.now();
    console.log('[Analysis API] Начало обработки запроса');

    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;
        
        if (!file) {
            throw new Error('Файл не найден в запросе');
        }

        const scriptDir = path.join(process.cwd(), 'analyze-the-lots');
        const pythonScript = path.join(scriptDir, 'example_predict.py');
        const inputFile = path.join(scriptDir, 'new_data.json');
        const outputFile = path.join(scriptDir, 'predictions.json');

        console.log('[Analysis API] Файлы:', {
            scriptDir,
            pythonScript,
            inputFile,
            outputFile,
            uploadedFile: file.name,
            workingDirectory: process.cwd()
        });

        if (!fs.existsSync(pythonScript)) {
            throw new Error(`Python скрипт не найден: ${pythonScript}`);
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        fs.writeFileSync(inputFile, buffer);
        console.log('[Analysis API] Файл сохранен:', inputFile);

        console.log('[Analysis API] Запуск Python скрипта');
        await new Promise((resolve, reject) => {
            const pythonProcess = spawn('python', [pythonScript], {
                cwd: scriptDir
            });

            let outputData = '';
            let errorData = '';

            pythonProcess.stdout.on('data', (data) => {
                const output = data.toString();
                outputData += output;
                console.log('[Python Output]', output);
            });

            pythonProcess.stderr.on('data', (data) => {
                const error = data.toString();
                errorData += error;
                console.error('[Python Error]', error);
            });

            pythonProcess.on('close', (code) => {
                console.log('[Analysis API] Python процесс завершился с кодом:', code);
                if (code !== 0) {
                    reject(new Error(`Python process exited with code ${code}\n${errorData}`));
                } else {
                    resolve(outputData);
                }
            });
        });

        console.log('[Analysis API] Чтение результатов анализа');
        let predictions = null;
        if (fs.existsSync(outputFile)) {
            predictions = JSON.parse(fs.readFileSync(outputFile, 'utf-8'));
        } else {
            console.error('[Analysis API] Файл с результатами не найден:', outputFile);
        }

        // Удаляем входной файл после завершения анализа
        try {
            if (fs.existsSync(inputFile)) {
                fs.unlinkSync(inputFile);
                console.log('[Analysis API] Входной файл удален:', inputFile);
            }
            if (fs.existsSync(outputFile)) {
                fs.unlinkSync(outputFile);
                console.log('[Analysis API] Выходной файл удален:', outputFile);
            }
        } catch (deleteError) {
            console.error('[Analysis API] Ошибка при удалении файлов:', deleteError);
        }

        const endTime = Date.now();
        const executionTime = (endTime - startTime) / 1000;
        console.log(`[Analysis API] Запрос обработан успешно за ${executionTime} секунд`);

        return NextResponse.json({ 
            success: true,
            predictions: predictions,
            executionTime
        });
    } catch (error) {
        const endTime = Date.now();
        const executionTime = (endTime - startTime) / 1000;
        console.error('[Analysis API] Ошибка при обработке запроса:', error);
        console.log(`[Analysis API] Запрос завершился с ошибкой за ${executionTime} секунд`);

        // Удаляем входной файл даже в случае ошибки
        try {
            const inputFile = path.join(process.cwd(), 'analyze-the-lots', 'new_data.json');
            const outputFile = path.join(process.cwd(), 'analyze-the-lots', 'predictions.json');
            if (fs.existsSync(inputFile)) {
                fs.unlinkSync(inputFile);
                console.log('[Analysis API] Входной файл удален после ошибки:', inputFile);
            }
            if (fs.existsSync(outputFile)) {
                fs.unlinkSync(outputFile);
                console.log('[Analysis API] Выходной файл удален после ошибки:', outputFile);
            }
        } catch (deleteError) {
            console.error('[Analysis API] Ошибка при удалении файлов:', deleteError);
        }

        return NextResponse.json({ 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error',
            executionTime
        }, { status: 500 });
    }
} 