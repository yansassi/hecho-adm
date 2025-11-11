import React, { useState, useEffect } from 'react'
import Layout from './components/Layout'
import Dashboard from './components/Dashboard'
import Products from './components/Products'
import ProductForm from './components/ProductForm'
import Catalog from './components/Catalog'
import Promotions from './components/Promotions'
import Reports from './components/Reports'
import SiteSettings from './components/SiteSettings'
import Clients from './components/Clients'
import Sales from './components/Sales'
import Deliveries from './components/Deliveries'
import UsersManagement from './components/UsersManagement'
import Suppliers from './components/Suppliers'
import LoginPage from './components/LoginPage'
import UserProfile from './components/UserProfile'
import { ProductWithCategory } from './lib/supabase'
import { validateAccessCode, createSession, clearSession } from './lib/auth'
import { isAuthenticated as isAuthenticatedEmail, logout as logoutEmail, hasPermission, getCurrentUser } from './lib/authService'

function App() {
  const [isAuth, setIsAuth] = useState(isAuthenticatedEmail())
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [currentPage, setCurrentPage] = useState('dashboard')
  const [showProductForm, setShowProductForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState<ProductWithCategory | undefined>()
  const [productFilter, setProductFilter] = useState<'all' | 'active' | 'lowStock'>('all')
  const [productListRef, setProductListRef] = useState<{ refresh: () => void } | null>(null)
  const [showUserProfile, setShowUserProfile] = useState(false)

  useEffect(() => {
    const authenticated = isAuthenticatedEmail()
    setIsAuth(authenticated)

    if (authenticated) {
      const user = getCurrentUser()
      if (!user) {
        handleLogout()
        return
      }

      const availablePages = ['dashboard', 'products', 'suppliers', 'clients', 'sales', 'deliveries', 'catalog', 'promotions', 'reports', 'settings', 'users']
      const hasAccessToCurrentPage = hasPermission(currentPage)

      if (!hasAccessToCurrentPage && !availablePages.includes(currentPage)) {
        const firstAllowedPage = availablePages.find(page => hasPermission(page))
        if (firstAllowedPage) {
          setCurrentPage(firstAllowedPage)
        } else {
          setCurrentPage('dashboard')
        }
      }
    }
  }, [])

  useEffect(() => {
    if (isAuth && currentPage && !hasPermission(currentPage)) {
      const availablePages = ['dashboard', 'products', 'suppliers', 'clients', 'sales', 'deliveries', 'catalog', 'promotions', 'reports', 'settings', 'users']
      const firstAllowedPage = availablePages.find(page => hasPermission(page))
      if (firstAllowedPage && firstAllowedPage !== currentPage) {
        setCurrentPage(firstAllowedPage)
      }
    }
  }, [currentPage, isAuth])

  const handleLogin = async (code: string) => {
    setIsLoading(true)
    setError('')
    try {
      const isValid = await validateAccessCode(code)
      if (isValid) {
        createSession()
        setIsAuth(true)
      } else {
        setError('Código inválido')
      }
    } catch (err) {
      setError('Erro ao validar código')
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = () => {
    clearSession()
    logoutEmail()
    setIsAuth(false)
    setCurrentPage('dashboard')
  }

  const handleLoginSuccess = () => {
    setIsAuth(true)
  }

  const handleEditProduct = (product: ProductWithCategory) => {
    setEditingProduct(product)
    setShowProductForm(true)
  }

  const handleCloseProductForm = () => {
    setShowProductForm(false)
    setEditingProduct(undefined)
  }

  const handleProductSave = () => {
    if (productListRef?.refresh) {
      productListRef.refresh()
    }
  }

  const handleDashboardNavigation = (filter: 'all' | 'active' | 'lowStock') => {
    if (hasPermission('products')) {
      setProductFilter(filter)
      setCurrentPage('products')
    }
  }

  const handlePageChange = (page: string) => {
    if (hasPermission(page)) {
      setCurrentPage(page)
    }
  }

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard onNavigateToProducts={handleDashboardNavigation} />
      case 'products':
        return <Products
          productListRef={setProductListRef}
          onEditProduct={handleEditProduct}
          initialFilter={productFilter}
        />
      case 'suppliers':
        return <Suppliers />
      case 'clients':
        return <Clients />
      case 'sales':
        return <Sales />
      case 'deliveries':
        return <Deliveries />
      case 'catalog':
        return <Catalog />
      case 'promotions':
        return <Promotions />
      case 'reports':
        return <Reports />
      case 'settings':
        return <SiteSettings />
      case 'users':
        return <UsersManagement />
      default:
        return <Dashboard onNavigateToProducts={handleDashboardNavigation} />
    }
  }

  if (!isAuth) {
    return (
      <LoginPage
        onLogin={async (code: string) => {
          await handleLogin(code)
        }}
        onLoginSuccess={handleLoginSuccess}
        isLoading={isLoading}
        error={error}
      />
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Layout
        currentPage={currentPage}
        onPageChange={handlePageChange}
        onLogout={handleLogout}
        onOpenProfile={() => setShowUserProfile(true)}
      >
        {renderCurrentPage()}
      </Layout>

      {showProductForm && (
        <ProductForm
          product={editingProduct}
          onClose={handleCloseProductForm}
          onSave={handleProductSave}
        />
      )}

      {showUserProfile && (
        <UserProfile onClose={() => setShowUserProfile(false)} />
      )}
    </div>
  )
}

export default App