'use client'
import { Grid, GridItem } from "@/components/grid";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Shield, Target, Zap, Users } from "lucide-react";
import { TypeAnimation } from "react-type-animation";

export default function Home() {

  return (
    <div className="min-h-screen bg-gray-50/50 text-gray-900 pt-24">
      {/* Hero Section */}
      <section className="container mx-auto px-6 pt-16 pb-24">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex flex-col gap-6 items-center justify-center">
            <div className="inline-flex items-center rounded-full border border-lime-200 bg-lime-50 px-3 py-1 text-sm text-lime-700">
              <Shield className="w-4 h-4 mr-2" />
              Corruption Detection Platform
            </div>
            <TypeAnimation
              sequence={[
                "Сканируйте коррупцию",
                2000,
                "Находите. Предотвращайте. Защищайте.",
                2000,
              ]}
              repeat={Infinity}
              speed={50}
              wrapper="h1"
              className="text-5xl md:text-6xl font-bold text-gray-900 leading-tight"
            />
            <p className="text-xl text-gray-600 max-w-2xl leading-relaxed">
              Интеллектуальная система выявления коррупционных рисков в закупках с использованием передовых алгоритмов машинного обучения
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-center mt-12 max-w-md mx-auto">
            <div className="relative flex-1 w-full">
              <Input 
                placeholder="Введите запрос для анализа..." 
                className="w-full h-12 pl-4 pr-12 border-gray-200 focus:border-lime-400 focus:ring-lime-400/20 rounded-lg" 
              />
              <button className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-lime-400 text-white p-2 rounded-md hover:bg-lime-600 transition-colors duration-200">
                <Search className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-6 py-24">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Почему именно мы?
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Передовые технологии для максимальной защиты от коррупционных схем
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-12 items-start">
            <div className="space-y-8">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 bg-lime-100 rounded-lg flex items-center justify-center">
                  <Target className="w-5 h-5 text-lime-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Точное выявление рисков</h3>
                  <ul className="space-y-2 text-gray-600">
                    <li>• Распознавание аффилированности между заказчиками и поставщиками</li>
                    <li>• Анализ ценообразования и выявление необоснованных отклонений</li>
                    <li>• Идентификация картельных сговоров на основе поведенческих паттернов</li>
                    <li>• Мониторинг нестандартных условий в технических заданиях</li>
                  </ul>
                </div>
              </div>
            </div>
            
            <div className="space-y-8">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 bg-lime-100 rounded-lg flex items-center justify-center">
                  <Zap className="w-5 h-5 text-lime-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Максимальная эффективность</h3>
                  <ul className="space-y-2 text-gray-600">
                    <li>• Снижение финансовых потерь до 30% бюджета закупок</li>
                    <li>• Автоматизация проверок без дополнительных специалистов</li>
                    <li>• Объективность оценки благодаря исключению человеческого фактора</li>
                    <li>• Предупреждение нарушений на ранних стадиях процесса</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="bg-white py-24">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Отзывы наших клиентов
              </h2>
              <p className="text-lg text-gray-600">
                Доверие ведущих организаций России
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-gray-50 rounded-xl p-8 border border-gray-100">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 rounded-full bg-lime-100 flex items-center justify-center">
                    <span className="text-lime-700 font-bold text-sm">МФ</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Министерство Финансов</h3>
                    <p className="text-sm text-gray-500">Государственный сектор</p>
                  </div>
                </div>
                <p className="text-gray-700 leading-relaxed">
                  "Внедрение КОРРУПТ-СКАН позволило нам выявить и предотвратить нарушения в закупочных процедурах на сумму более 2 млрд рублей за первый год использования."
                </p>
              </div>
              
              <div className="bg-gray-50 rounded-xl p-8 border border-gray-100">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 rounded-full bg-lime-100 flex items-center justify-center">
                    <span className="text-lime-700 font-bold text-sm">ГК</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Газнефтьком</h3>
                    <p className="text-sm text-gray-500">Энергетический сектор</p>
                  </div>
                </div>
                <p className="text-gray-700 leading-relaxed">
                  "Система помогла нам стандартизировать процессы закупок и значительно снизить риски коррупционных схем. Особенно ценим возможность раннего выявления аффилированности."
                </p>
              </div>
              
              <div className="bg-gray-50 rounded-xl p-8 border border-gray-100">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 rounded-full bg-lime-100 flex items-center justify-center">
                    <span className="text-lime-700 font-bold text-sm">РЖ</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">РосЖелДор</h3>
                    <p className="text-sm text-gray-500">Транспортная отрасль</p>
                  </div>
                </div>
                <p className="text-gray-700 leading-relaxed">
                  "КОРРУПТ-СКАН стал незаменимым инструментом для нашей службы внутреннего аудита. Автоматический анализ закупок экономит сотни человеко-часов ежемесячно."
                </p>
              </div>
            </div>
            
            <div className="mt-16 text-center">
              <Button className="bg-lime-400 hover:bg-lime-600 text-white px-8 py-3 rounded-lg font-medium transition-colors duration-200">
                Запросить демо-доступ
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
