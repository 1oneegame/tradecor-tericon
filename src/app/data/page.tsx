import { Database, FileText, TrendingUp, Shield } from "lucide-react";

export default function DataPage() {
  return (
    <div className="min-h-screen bg-gray-50/50 text-gray-900 pt-24">
      <div className="container mx-auto px-6 py-16">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center rounded-full border border-lime-200 bg-lime-50 px-3 py-1 text-sm text-lime-700 mb-6">
              <Database className="w-4 h-4 mr-2" />
              Data Management
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Управление данными
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Централизованное хранение и обработка данных о закупках для эффективного анализа коррупционных рисков
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-16">
            <div className="bg-white rounded-xl p-8 border border-gray-100 shadow-sm">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-lime-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-6 h-6 text-lime-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Источники данных</h3>
                  <p className="text-gray-600">Интеграция с различными системами</p>
                </div>
              </div>
              <ul className="space-y-3 text-gray-700">
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-lime-400 rounded-full"></div>
                  Единая информационная система закупок (ЕИС)
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-lime-400 rounded-full"></div>
                  Региональные электронные торговые площадки
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-lime-400 rounded-full"></div>
                  Корпоративные системы закупок
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-lime-400 rounded-full"></div>
                  Реестры недобросовестных поставщиков
                </li>
              </ul>
            </div>

            <div className="bg-white rounded-xl p-8 border border-gray-100 shadow-sm">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-lime-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-lime-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Обработка данных</h3>
                  <p className="text-gray-600">Автоматизированная аналитика</p>
                </div>
              </div>
              <ul className="space-y-3 text-gray-700">
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-lime-400 rounded-full"></div>
                  Нормализация и очистка данных
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-lime-400 rounded-full"></div>
                  Выявление дубликатов и аномалий
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-lime-400 rounded-full"></div>
                  Построение связей между участниками
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-lime-400 rounded-full"></div>
                  Расчет рискологических показателей
                </li>
              </ul>
            </div>
          </div>

          <div className="bg-white rounded-xl p-8 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-lime-100 rounded-lg flex items-center justify-center">
                <Shield className="w-6 h-6 text-lime-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Безопасность и конфиденциальность</h3>
                <p className="text-gray-600">Защита персональных данных и коммерческой тайны</p>
              </div>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-lime-600 mb-2">256-bit</div>
                <div className="text-sm text-gray-600">Шифрование данных</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-lime-600 mb-2">ISO 27001</div>
                <div className="text-sm text-gray-600">Сертификация безопасности</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-lime-600 mb-2">GDPR</div>
                <div className="text-sm text-gray-600">Соответствие требованиям</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
