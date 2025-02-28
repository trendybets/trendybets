"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { 
  Calculator, 
  RefreshCw, 
  GamepadIcon,
  CirclePlus,
  Menu,
  X,
  TrendingUp
} from "lucide-react"
import { motion } from "framer-motion"
import { Disclosure, Transition } from "@headlessui/react"

const navigation = [
  {
    name: "Trendy Games",
    href: "/",
    icon: GamepadIcon,
  },
  {
    name: "Trendy Props",
    href: "/trendy-props",
    icon: CirclePlus,
  },
  {
    name: "Calculators",
    href: "/calculators",
    icon: Calculator,
  },
  {
    name: "Sync",
    href: "/admin/sync",
    icon: RefreshCw,
  },
]

export function Navbar() {
  const pathname = usePathname()
  const [scrolled, setScrolled] = useState(false)

  // Add scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <Disclosure as="nav" className={cn(
      "sticky top-0 z-50 w-full transition-all duration-300",
      scrolled 
        ? "bg-white backdrop-blur-md shadow-md" 
        : "bg-white"
    )}>
      {({ open }) => (
        <>
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 items-center justify-between">
              {/* Logo and brand */}
              <div className="flex items-center">
                <Link href="/" className="flex items-center space-x-2">
                  <motion.div
                    whileHover={{ rotate: 180 }}
                    transition={{ duration: 0.3 }}
                  >
                    <TrendingUp className="h-7 w-7 text-blue-600" />
                  </motion.div>
                  <span className="font-bold text-lg tracking-tight text-black">Trendy Bets</span>
                </Link>
              </div>

              {/* Desktop navigation */}
              <div className="hidden md:block">
                <div className="flex items-center space-x-8">
                  {navigation.map((item) => {
                    const isActive = 
                      pathname === item.href || 
                      (pathname === "/trendy-games" && item.href === "/")
                    
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          "relative flex items-center text-sm font-medium transition-colors duration-200",
                          isActive 
                            ? "text-blue-600" 
                            : "text-gray-700 hover:text-black"
                        )}
                      >
                        <item.icon className={cn(
                          "mr-2 h-4 w-4",
                          isActive ? "text-blue-600" : "text-gray-700"
                        )} />
                        {item.name}
                        {isActive && (
                          <motion.div
                            layoutId="navbar-indicator"
                            className="absolute -bottom-1 left-0 right-0 h-0.5 bg-blue-600"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.3 }}
                          />
                        )}
                      </Link>
                    )
                  })}
                </div>
              </div>

              {/* Mobile menu button */}
              <div className="flex md:hidden">
                <Disclosure.Button className="inline-flex items-center justify-center rounded-md p-2 text-gray-700 hover:bg-gray-100 hover:text-black focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-600">
                  <span className="sr-only">Open main menu</span>
                  {open ? (
                    <X className="block h-6 w-6" aria-hidden="true" />
                  ) : (
                    <Menu className="block h-6 w-6" aria-hidden="true" />
                  )}
                </Disclosure.Button>
              </div>
            </div>
          </div>

          {/* Mobile menu */}
          <Transition
            enter="transition duration-100 ease-out"
            enterFrom="transform scale-95 opacity-0"
            enterTo="transform scale-100 opacity-100"
            leave="transition duration-75 ease-out"
            leaveFrom="transform scale-100 opacity-100"
            leaveTo="transform scale-95 opacity-0"
          >
            <Disclosure.Panel className="md:hidden bg-white">
              <div className="space-y-1 px-4 pb-3 pt-2">
                {navigation.map((item) => {
                  const isActive = 
                    pathname === item.href || 
                    (pathname === "/trendy-games" && item.href === "/")
                  
                  return (
                    <Disclosure.Button
                      key={item.href}
                      as={Link}
                      href={item.href}
                      className={cn(
                        "flex w-full items-center rounded-md px-3 py-2 text-base font-medium",
                        isActive
                          ? "bg-blue-50 text-blue-600"
                          : "text-gray-700 hover:bg-gray-100 hover:text-black"
                      )}
                    >
                      <item.icon className={cn(
                        "mr-3 h-5 w-5",
                        isActive ? "text-blue-600" : "text-gray-700"
                      )} />
                      {item.name}
                    </Disclosure.Button>
                  )
                })}
              </div>
            </Disclosure.Panel>
          </Transition>
        </>
      )}
    </Disclosure>
  )
}

