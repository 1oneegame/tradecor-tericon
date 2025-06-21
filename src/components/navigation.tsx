'use client'
import Link from "next/link";
import { Button } from "./ui/button";
import { usePathname } from "next/navigation";

const links = [
  {
    label: "Главная",
    href: "/",
  },
  {
    label: "Аналитика",
    href: "/analysis",
  },
  {
    label: "Данные",
    href: "/data",
  },
]

export default function Navigation() {

  const pathname = usePathname();

  return (
    <div className={`h-[70px] fixed top-2 left-0 right-0 z-50 flex flex-row items-center justify-between px-24 py-2 bg-transparent text-blue-800 transition-opacity duration-300`}>
        <div className="flex flex-row gap-4 items-center justify-center">
            <h1 className="text-2xl font-bold">TradeCor</h1>
        </div>
        <div className="absolute left-1/2 transform -translate-x-1/2 flex flex-row gap-9 items-center justify-center border-2 border-gray-200 rounded-full bg-white px-4 py-1">
            {links.map((link) => (
              <div key={link.href} className="w-full h-full flex items-center justify-center">
                  <Link key={link.href} href={link.href} className={`text-blue-800 hover:text-blue-600 w-full h-full flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors duration-300 text-md px-4 py-1 ${pathname === link.href && "border border-blue-800"}`}>
                  {link.label}
                  </Link>
              </div>
            ))}
        </div>
        <div className="flex flex-row gap-4 items-center justify-center">
            <Button className="rounded-full text-white bg-blue-800 hover:bg-blue-900 transition-colors duration-300">
                Личный кабинет
            </Button>
        </div>
    </div>
  )
}