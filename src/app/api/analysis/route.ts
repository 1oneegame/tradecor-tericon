import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

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

        console.log('[Analysis API] Запуск Python скрипта');
        
        // Читаем данные файла в память
        const bytes = await file.arrayBuffer();
        const fileContent = Buffer.from(bytes).toString('utf-8');

        const outputData = await new Promise<string>((resolve, reject) => {
            const pythonProcess = spawn('python', [pythonScript], {
                cwd: scriptDir
            });

            let stdout = '';
            let stderr = '';

            // Отправляем данные в stdin Python процесса
            pythonProcess.stdin.write(fileContent);
            pythonProcess.stdin.end();

            pythonProcess.stdout.on('data', (data) => {
                stdout += data.toString();
                console.log('[Python Output]', data.toString());
            });

            pythonProcess.stderr.on('data', (data) => {
                stderr += data.toString();
                console.error('[Python Error]', data.toString());
            });

            pythonProcess.on('close', (code) => {
                console.log('[Analysis API] Python процесс завершился с кодом:', code);
                if (code !== 0) {
                    reject(new Error(`Python process exited with code ${code}\n${stderr}`));
                } else {
                    resolve(stdout);
                }
            });
        });

        const endTime = Date.now();
        const executionTime = (endTime - startTime) / 1000;
        console.log(`[Analysis API] Запрос обработан успешно за ${executionTime} секунд`);

        // Предполагаем, что Python скрипт вернул JSON в stdout
        const predictions = JSON.parse(outputData);

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

        return NextResponse.json({ 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error',
            executionTime
        }, { status: 500 });
    }
} 