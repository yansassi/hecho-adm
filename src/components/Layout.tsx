import React, { useState, useRef, useEffect } from 'react'
import { LayoutDashboard, Package, ShoppingBag, Settings, LogOut, BookOpen, Star, FileText, Tag, Users, ShoppingCart, Award, Truck, Shield, UserCog, User as UserIcon, ChevronDown, Lock, Building2 } from 'lucide-react'
import { getCurrentUser, hasPermission } from '../lib/authService'

interface LayoutProps {
  children: React.ReactNode
  currentPage: string
  onPageChange: (page: string) => void
  onLogout: () => void
  onOpenProfile: () => void
}

const Layout: React.FC<LayoutProps> = ({ children, currentPage, onPageChange, onLogout, onOpenProfile }) => {
  const [showUserMenu, setShowUserMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const user = getCurrentUser()

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const allMenuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, rota: 'dashboard' },
    { id: 'products', label: 'Produtos', icon: Package, rota: 'products' },
    { id: 'suppliers', label: 'Fornecedores', icon: Building2, rota: 'suppliers' },
    { id: 'clients', label: 'Clientes', icon: Users, rota: 'clients' },
    { id: 'sales', label: 'Vendas', icon: ShoppingCart, rota: 'sales' },
    { id: 'deliveries', label: 'Entregas', icon: Truck, rota: 'deliveries' },
    { id: 'catalog', label: 'Catálogo', icon: BookOpen, rota: 'catalog' },
    { id: 'promotions', label: 'Promoções', icon: Tag, rota: 'promotions' },
    { id: 'reports', label: 'Relatórios', icon: FileText, rota: 'reports' },
    { id: 'settings', label: 'Configurações Site', icon: Settings, rota: 'settings' },
    { id: 'users', label: 'Gestão de Usuários', icon: UserCog, rota: 'users' },
  ]

  const menuItems = allMenuItems.filter(item => hasPermission(item.rota))

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg">
        <div className="p-6 border-b">
          <h1 className="text-xl font-bold text-gray-800">Admin Panel</h1>
          <p className="text-sm text-gray-600">Gerenciar Produtos</p>
        </div>
        
        <nav className="mt-6">
          {menuItems.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                onClick={() => onPageChange(item.id)}
                className={`w-full flex items-center px-6 py-3 text-left hover:bg-blue-50 transition-colors ${
                  currentPage === item.id
                    ? 'bg-blue-50 text-blue-600 border-r-2 border-blue-600'
                    : 'text-gray-600 hover:text-blue-600'
                }`}
              >
                <Icon className="w-5 h-5 mr-3" />
                {item.label}
              </button>
            )
          })}
        </nav>

        <div className="absolute bottom-0 w-64 p-6 border-t">
          <button onClick={onLogout} className="flex items-center text-gray-600 hover:text-red-600 transition-colors">
            <LogOut className="w-5 h-5 mr-3" />
            Sair
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white shadow-sm border-b">
          <div className="px-6 py-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800 capitalize">
              {menuItems.find(item => item.id === currentPage)?.label || 'Dashboard'}
            </h2>

            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">{user?.nome || 'Usuário'}</p>
                  {user?.cargo_nome && (
                    <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full">
                      {user.cargo_nome}
                    </span>
                  )}
                </div>
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                  <UserIcon className="w-6 h-6 text-white" />
                </div>
                <ChevronDown className="w-4 h-4 text-gray-600" />
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border z-50">
                  <div className="p-4 border-b">
                    <p className="font-semibold text-gray-900">{user?.nome}</p>
                    <p className="text-sm text-gray-600">{user?.email}</p>
                  </div>
                  <div className="py-2">
                    <button
                      onClick={() => {
                        setShowUserMenu(false)
                        onOpenProfile()
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-gray-100 transition-colors flex items-center gap-2"
                    >
                      <UserIcon className="w-4 h-4 text-gray-600" />
                      <span className="text-gray-700">Ver Perfil</span>
                    </button>
                    <button
                      onClick={() => {
                        setShowUserMenu(false)
                        onOpenProfile()
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-gray-100 transition-colors flex items-center gap-2"
                    >
                      <Lock className="w-4 h-4 text-gray-600" />
                      <span className="text-gray-700">Alterar Senha</span>
                    </button>
                  </div>
                  <div className="border-t py-2">
                    <button
                      onClick={() => {
                        setShowUserMenu(false)
                        onLogout()
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-red-50 transition-colors flex items-center gap-2"
                    >
                      <LogOut className="w-4 h-4 text-red-600" />
                      <span className="text-red-600 font-medium">Sair</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}

export default Layout