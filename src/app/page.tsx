'use client'
import { Grid, GridItem } from "@/components/grid";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { TypeAnimation } from "react-type-animation";

export default function Home() {

  return (
    <div className="min-h-screen bg-white text-black mt-[70px]">
      <section className="container mx-auto px-4 pt-12">
        <Grid decoratorPositions={["top-left", "top-right"]}>
          <GridItem >
              <div className="flex flex-col gap-4 items-center justify-center">
                <TypeAnimation
                  sequence={[
                    "Scan your corruption.",
                    1000,
                  ]}
                  repeat={Infinity}
                  speed={50}
                  wrapper="h1"
                  className="text-4xl font-bold text-blue-800 text-center"
                />
                <p className="text-lg text-gray-500">Интеллектуальная система выявления коррупционных рисков в закупках</p>
              </div>
              <div className="flex flex-row gap-2 items-center justify-center mt-8">
                <Input placeholder="Enter request..." className="w-full max-w-sm" />
                <button className="bg-blue-800 text-white p-3 rounded-full shadow-md hover:bg-blue-900 transition-colors duration-300">
                  <Search className="w-4 h-4" />
                </button>
              </div>
          </GridItem>
        </Grid>
      </section>
      <section className="container mx-auto px-4 pt-12 flex flex-col gap-6 items-center justify-center">
        <h1 className="text-4xl font-bold text-blue-800 text-center">Почему именно мы?</h1>
        <Grid columns={2} decoratorPositions={["bottom-left", "bottom-right"]}>
          <GridItem>
            <div className="flex flex-col gap-2">
              <ul className="list-disc list-inside text-md text-gray-700">
                <li>Распознавание аффилированности между заказчиками и поставщиками</li>
                <li>Анализ ценообразования и выявление необоснованных отклонений от рыночных цен</li>
                <li>Идентификация картельных сговоров на основе поведенческих паттернов участников</li>
                <li>Мониторинг нестандартных условий в технических заданиях и документации</li>
              </ul>
            </div>
          </GridItem>
          <GridItem>
            <div className="flex flex-col gap-2">
              <ul className="list-disc list-inside text-md text-gray-700">
                <li>Снижение финансовых потерь до 30% бюджета закупок</li>
                <li>Автоматизация проверок без привлечения дополнительных специалистов</li>
                <li>Объективность оценки благодаря исключению человеческого фактора</li>
                <li>Предупреждение нарушений на ранних стадиях закупочного процесса</li>
              </ul>
            </div>
          </GridItem>
        </Grid>
      </section>
    </div>
  );
}
