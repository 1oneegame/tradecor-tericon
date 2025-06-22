'use client'
import Link from "next/link";
import { Button } from "./ui/button";
import { usePathname } from "next/navigation";
import Image from "next/image";

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
    <div className="h-16 fixed top-4 left-0 right-0 z-50 flex flex-row items-center justify-between px-6 mx-6">
      <div className="bg-white/80 backdrop-blur-lg border border-gray-200/50 rounded-2xl shadow-sm px-6 py-3 flex flex-row items-center justify-between w-full max-w-6xl mx-auto">
        <div className="flex flex-row gap-4 items-center justify-center">
          <Link href="/" className="flex items-center">
            <Image 
              src="/tradecor.svg" 
              alt="TradeCor Logo" 
              width={120} 
              height={30}
              className="h-8 w-auto"
            />
          </Link>
        </div>
        
        <div className="flex flex-row gap-1 items-center justify-center bg-gray-50 rounded-xl p-1">
          {links.map((link) => (
            <Link 
              key={link.href} 
              href={link.href} 
              className={`text-sm font-medium px-4 py-2 rounded-lg transition-all duration-200 ${
                pathname === link.href 
                  ? "bg-white text-gray-900 shadow-sm" 
                  : "text-gray-600 hover:text-gray-900 hover:bg-white/50"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}