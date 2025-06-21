import pandas as pd
import json
import logging
import time
import os
from predict import predict_suspicious

logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] %(levelname)s: %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)

def get_suspicion_level(probability):
    if probability < 25:
        return 'Низкий'
    elif probability < 75:
        return 'Средний'
    else:
        return 'Высокий'

def format_amount(amount):
    try:
        if isinstance(amount, str):
            # Удаляем все пробелы и заменяем запятую на точку
            amount = float(amount.replace(' ', '').replace(',', '.'))
        return f"{amount:,.2f}".replace(',', ' ')
    except (ValueError, TypeError):
        return str(amount)

def predict_for_new_data(input_file, output_file='predictions.csv'):
    """
    Пример использования модели для новых данных
    
    Args:
        input_file (str): Путь к JSON файлу с новыми данными
        output_file (str): Путь для сохранения результатов
    """
    start_time = time.time()
    logging.info(f"Начало анализа данных")
    
    try:
        current_dir = os.path.dirname(os.path.abspath(__file__))
        input_path = os.path.join(current_dir, input_file)
        output_path = os.path.join(current_dir, output_file)
        
        logging.info(f"Загрузка данных из {input_path}")
        with open(input_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        if isinstance(data, dict) and 'lots' in data:
            df = pd.DataFrame(data['lots'])
        else:
            df = pd.DataFrame(data)
            
        logging.info(f"Загружено {len(df)} записей")
        
        required_columns = ['amount', 'quantity', 'subject', 'announcement']
        missing_columns = [col for col in required_columns if col not in df.columns]
        if missing_columns:
            raise ValueError(f"Отсутствуют обязательные колонки: {', '.join(missing_columns)}")
        
        # Преобразуем числовые столбцы
        try:
            df['amount'] = pd.to_numeric(df['amount'].astype(str).str.replace(' ', '').str.replace(',', '.'), errors='coerce')
            df['quantity'] = pd.to_numeric(df['quantity'].astype(str).str.replace(' ', '').str.replace(',', '.'), errors='coerce')
        except Exception as e:
            logging.warning(f"Ошибка при преобразовании числовых значений: {str(e)}")
        
        logging.info("Выполнение анализа данных")
        df['suspicion_probability'] = predict_suspicious(df)
        df['suspicion_level'] = df['suspicion_probability'].apply(get_suspicion_level)
        
        df['is_suspicious'] = (df['suspicion_probability'] >= 75).astype(int)
        suspicious_count = df['is_suspicious'].sum()
        logging.info(f"Найдено {suspicious_count} подозрительных закупок")
        
        # Форматируем данные для вывода
        df['formatted_output'] = df.apply(
            lambda row: (
                f"Лот №{row.get('lot_id', 'Н/Д')} | "
                f"{str(row['subject'])[:100]}... | "
                f"Кол-во: {row['quantity']} | "
                f"Цена: {format_amount(row['amount'])} тг | "
                f"Подозрительность: {row['suspicion_probability']:.1f}% | "
                f"Уровень: {row['suspicion_level']}"
            ),
            axis=1
        )
        
        # Сохраняем результаты в JSON вместо CSV
        results = []
        for _, row in df.iterrows():
            results.append({
                'lot_id': row.get('lot_id', 'Н/Д'),
                'announcement': row.get('announcement', ''),
                'customer': row.get('customer', ''),
                'subject': row.get('subject', ''),
                'quantity': float(row['quantity']) if pd.notnull(row['quantity']) else None,
                'amount': float(row['amount']) if pd.notnull(row['amount']) else None,
                'suspicion_probability': float(row['suspicion_probability']) if pd.notnull(row['suspicion_probability']) else None,
                'suspicion_level': row['suspicion_level'],
                'is_suspicious': int(row['is_suspicious'])
            })
        
        with open(output_path.replace('.csv', '.json'), 'w', encoding='utf-8') as f:
            json.dump(results, f, ensure_ascii=False, indent=2)
        
        end_time = time.time()
        execution_time = end_time - start_time
        logging.info(f"Анализ завершен за {execution_time:.2f} секунд")
        
        logging.info("\nРезультаты анализа:")
        logging.info("-" * 100)
        
        # Сортируем по уровню подозрительности (высокий -> средний -> низкий)
        df_sorted = df.sort_values('suspicion_probability', ascending=False)
        for _, row in df_sorted.iterrows():
            logging.info(row['formatted_output'])
            
        logging.info("\nСтатистика по уровням подозрительности:")
        for level in ['Высокий', 'Средний', 'Низкий']:
            count = (df['suspicion_level'] == level).sum()
            percentage = count/len(df) * 100
            logging.info(f"{level}: {count} закупок ({percentage:.1f}%)")
        
    except FileNotFoundError:
        logging.error(f"Ошибка: Файл {input_path} не найден")
        raise
    except json.JSONDecodeError:
        logging.error(f"Ошибка: Файл {input_path} содержит некорректный JSON")
        raise
    except ValueError as e:
        logging.error(f"Ошибка в данных: {str(e)}")
        raise
    except Exception as e:
        logging.error(f"Непредвиденная ошибка: {str(e)}")
        raise

if __name__ == "__main__":
    try:
        predict_for_new_data('new_data.json', 'predictions.csv')
    except Exception as e:
        logging.error(f"Программа завершилась с ошибкой: {str(e)}")
        raise
    
    # 2. Для нескольких файлов
    """
    files_to_check = [
        ('data_2024_01.json', 'predictions_2024_01.csv'),
        ('data_2024_02.json', 'predictions_2024_02.csv'),
        ('data_2024_03.json', 'predictions_2024_03.csv')
    ]
    
    for input_file, output_file in files_to_check:
        print(f"\nОбработка файла {input_file}")
        predict_for_new_data(input_file, output_file)
    """ 