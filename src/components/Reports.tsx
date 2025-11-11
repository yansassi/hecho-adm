import React, { useState, useEffect } from 'react'
import {
  Download,
  TrendingUp,
  Package,
  DollarSign,
  AlertTriangle,
  BarChart3,
  FileSpreadsheet,
  Users,
  ShoppingCart,
  Tag,
  Truck,
  PieChart,
  Calendar,
  Filter,
  Settings,
  TrendingDown,
  Activity,
  Target,
  Zap,
  UserCheck,
  UserX,
  MapPin,
  Clock,
  History,
  TrendingUp as Trending
} from 'lucide-react'
import { supabase, ProductWithCategory, Category } from '../lib/supabase'
import * as XLSX from 'xlsx'

interface ReportSection {
  id: string
  title: string
  description: string
  icon: React.FC<any>
  color: string
  available: boolean
}

const Reports: React.FC = () => {
  const [activeSection, setActiveSection] = useState<string>('sales')
  const [loading, setLoading] = useState(false)

  const sections: ReportSection[] = [
    {
      id: 'sales',
      title: 'Vendas e Financeiro',
      description: 'Receitas, lucros e análises de vendas',
      icon: DollarSign,
      color: 'bg-green-500',
      available: true
    },
    {
      id: 'clients',
      title: 'Clientes e Comportamento',
      description: 'Análise de clientes e padrões de compra',
      icon: Users,
      color: 'bg-blue-500',
      available: true
    },
    {
      id: 'products',
      title: 'Produtos e Estoque',
      description: 'Inventário, rotatividade e análise ABC',
      icon: Package,
      color: 'bg-purple-500',
      available: true
    },
    {
      id: 'promotions',
      title: 'Promoções e Descontos',
      description: 'Efetividade de campanhas promocionais',
      icon: Tag,
      color: 'bg-orange-500',
      available: true
    },
    {
      id: 'deliveries',
      title: 'Entregas e Logística',
      description: 'Performance de entregas e rotas',
      icon: Truck,
      color: 'bg-indigo-500',
      available: true
    },
    {
      id: 'charts',
      title: 'Visualizações e Gráficos',
      description: 'Dashboards visuais e gráficos avançados',
      icon: PieChart,
      color: 'bg-pink-500',
      available: true
    },
    {
      id: 'filters',
      title: 'Filtros e Customização',
      description: 'Personalize seus relatórios',
      icon: Filter,
      color: 'bg-teal-500',
      available: true
    },
    {
      id: 'export',
      title: 'Exportação',
      description: 'Exporte dados em múltiplos formatos',
      icon: FileSpreadsheet,
      color: 'bg-cyan-500',
      available: true
    },
    {
      id: 'analytics',
      title: 'Análises Preditivas',
      description: 'Previsões e tendências futuras',
      icon: Activity,
      color: 'bg-yellow-500',
      available: true
    },
    {
      id: 'dashboard',
      title: 'Dashboard Interativo',
      description: 'Visão geral consolidada',
      icon: BarChart3,
      color: 'bg-red-500',
      available: true
    }
  ]

  const renderSectionContent = () => {
    switch (activeSection) {
      case 'sales':
        return <SalesReports />
      case 'clients':
        return <ClientsReports />
      case 'products':
        return <ProductsReports />
      case 'promotions':
        return <PromotionsReports />
      case 'deliveries':
        return <DeliveriesReports />
      case 'charts':
        return <ChartsReports />
      case 'filters':
        return <FiltersReports />
      case 'export':
        return <ExportReports />
      case 'analytics':
        return <AnalyticsReports />
      case 'dashboard':
        return <DashboardReports />
      default:
        return <SalesReports />
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Central de Relatórios</h1>
        <p className="text-gray-600">Análises completas e insights do seu negócio</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {sections.map((section) => {
          const Icon = section.icon
          const isActive = activeSection === section.id
          return (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              disabled={!section.available}
              className={`p-4 rounded-lg border-2 transition-all ${
                isActive
                  ? 'border-gray-900 bg-gray-50 shadow-md'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              } ${!section.available ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <div className={`${section.color} w-10 h-10 rounded-lg flex items-center justify-center mb-2`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-semibold text-sm text-gray-900 text-left">{section.title}</h3>
              <p className="text-xs text-gray-500 mt-1 text-left">{section.description}</p>
            </button>
          )
        })}
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-6">
        {renderSectionContent()}
      </div>
    </div>
  )
}

const SalesReports: React.FC = () => {
  const [sales, setSales] = useState<any[]>([])
  const [saleItems, setSaleItems] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [activeReport, setActiveReport] = useState<'custom' | 'evolution' | 'ticket' | 'payment' | 'pending' | 'discounts' | 'goals'>('custom')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [monthlyGoal, setMonthlyGoal] = useState(10000000)

  useEffect(() => {
    fetchAllData()
  }, [])

  const fetchAllData = async () => {
    try {
      setLoading(true)
      const [salesResult, itemsResult, clientsResult, categoriesResult] = await Promise.all([
        supabase.from('sales').select('*').order('sale_date', { ascending: false }),
        supabase.from('sale_items').select('*'),
        supabase.from('clients').select('*'),
        supabase.from('categories').select('*')
      ])

      if (salesResult.error) throw salesResult.error
      if (itemsResult.error) throw itemsResult.error
      if (clientsResult.error) throw clientsResult.error
      if (categoriesResult.error) throw categoriesResult.error

      setSales(salesResult.data || [])
      setSaleItems(itemsResult.data || [])
      setClients(clientsResult.data || [])
      setCategories(categoriesResult.data || [])
    } catch (error) {
      console.error('Erro ao buscar dados:', error)
    } finally {
      setLoading(false)
    }
  }

  const reports = [
    { id: 'custom', label: 'Período Customizável', icon: Calendar },
    { id: 'evolution', label: 'Evolução Mensal', icon: TrendingUp },
    { id: 'ticket', label: 'Ticket Médio', icon: BarChart3 },
    { id: 'payment', label: 'Formas de Pagamento', icon: DollarSign },
    { id: 'pending', label: 'Pendentes', icon: AlertTriangle },
    { id: 'discounts', label: 'Descontos', icon: Tag },
    { id: 'goals', label: 'Metas', icon: Target }
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Relatórios de Vendas e Financeiro</h2>
        <p className="text-sm text-gray-600">Análises detalhadas e insights financeiros</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
        {reports.map((report) => {
          const Icon = report.icon
          const isActive = activeReport === report.id
          return (
            <button
              key={report.id}
              onClick={() => setActiveReport(report.id as any)}
              className={`p-3 rounded-lg border transition-all ${
                isActive
                  ? 'border-blue-600 bg-blue-50 shadow-md'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <Icon className={`w-5 h-5 mx-auto mb-1 ${isActive ? 'text-blue-600' : 'text-gray-600'}`} />
              <p className={`text-xs font-medium text-center ${isActive ? 'text-blue-600' : 'text-gray-700'}`}>
                {report.label}
              </p>
            </button>
          )
        })}
      </div>

      <div className="bg-white border rounded-lg p-6">
        {activeReport === 'custom' && <CustomPeriodReport sales={sales} startDate={startDate} endDate={endDate} setStartDate={setStartDate} setEndDate={setEndDate} />}
        {activeReport === 'evolution' && <MonthlyEvolutionReport sales={sales} />}
        {activeReport === 'ticket' && <AverageTicketReport sales={sales} saleItems={saleItems} clients={clients} categories={categories} />}
        {activeReport === 'payment' && <PaymentMethodsReport sales={sales} />}
        {activeReport === 'pending' && <PendingSalesReport sales={sales} clients={clients} />}
        {activeReport === 'discounts' && <DiscountsReport sales={sales} />}
        {activeReport === 'goals' && <GoalsReport sales={sales} monthlyGoal={monthlyGoal} setMonthlyGoal={setMonthlyGoal} />}
      </div>
    </div>
  )
}

const CustomPeriodReport: React.FC<{
  sales: any[]
  startDate: string
  endDate: string
  setStartDate: (date: string) => void
  setEndDate: (date: string) => void
}> = ({ sales, startDate, endDate, setStartDate, setEndDate }) => {
  const filteredSales = sales.filter(sale => {
    if (!startDate && !endDate) return sale.payment_status !== 'cancelled'
    const saleDate = new Date(sale.sale_date)
    const start = startDate ? new Date(startDate) : null
    const end = endDate ? new Date(endDate) : null

    if (start && end) {
      return saleDate >= start && saleDate <= end && sale.payment_status !== 'cancelled'
    } else if (start) {
      return saleDate >= start && sale.payment_status !== 'cancelled'
    } else if (end) {
      return saleDate <= end && sale.payment_status !== 'cancelled'
    }
    return sale.payment_status !== 'cancelled'
  })

  const totalRevenue = filteredSales.reduce((sum, s) => sum + Number(s.final_amount), 0)
  const totalSales = filteredSales.length
  const avgTicket = totalSales > 0 ? totalRevenue / totalSales : 0

  const exportReport = () => {
    const dataToExport = filteredSales.map(sale => ({
      'Número': sale.sale_number,
      'Data': new Date(sale.sale_date).toLocaleDateString('pt-BR'),
      'Valor Total': sale.total_amount,
      'Desconto': sale.discount_amount,
      'Valor Final': sale.final_amount,
      'Método': sale.payment_method,
      'Status': sale.payment_status
    }))

    const worksheet = XLSX.utils.json_to_sheet(dataToExport)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Vendas')
    XLSX.writeFile(workbook, `Vendas_${startDate || 'inicio'}_${endDate || 'fim'}.xlsx`)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-2">Data Início</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-2">Data Fim</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex items-end">
          <button
            onClick={exportReport}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Exportar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-700 font-medium">Receita Total</p>
          <p className="text-2xl font-bold text-green-600 mt-2">₲ {totalRevenue.toLocaleString('es-PY')}</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-700 font-medium">Total de Vendas</p>
          <p className="text-2xl font-bold text-blue-600 mt-2">{totalSales}</p>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <p className="text-sm text-orange-700 font-medium">Ticket Médio</p>
          <p className="text-2xl font-bold text-orange-600 mt-2">₲ {avgTicket.toFixed(0).toLocaleString('es-PY')}</p>
        </div>
      </div>
    </div>
  )
}

const MonthlyEvolutionReport: React.FC<{ sales: any[] }> = ({ sales }) => {
  const getLast12Months = () => {
    const months = []
    const now = new Date()
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      months.push({
        key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
        label: date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
      })
    }
    return months
  }

  const months = getLast12Months()
  const monthlyData = months.map(month => {
    const monthSales = sales.filter(sale => {
      const saleMonth = new Date(sale.sale_date).toISOString().substring(0, 7)
      return saleMonth === month.key && sale.payment_status !== 'cancelled'
    })
    const revenue = monthSales.reduce((sum, s) => sum + Number(s.final_amount), 0)
    return {
      ...month,
      sales: monthSales.length,
      revenue
    }
  })

  const maxRevenue = Math.max(...monthlyData.map(m => m.revenue), 1)

  const exportReport = () => {
    const dataToExport = monthlyData.map(m => ({
      'Mês': m.label,
      'Vendas': m.sales,
      'Receita': m.revenue
    }))

    const worksheet = XLSX.utils.json_to_sheet(dataToExport)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Evolução Mensal')
    XLSX.writeFile(workbook, `Evolucao_Mensal_12meses.xlsx`)
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-gray-900">Evolução dos Últimos 12 Meses</h3>
        <button
          onClick={exportReport}
          className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          Exportar
        </button>
      </div>

      <div className="space-y-2">
        {monthlyData.map((month) => (
          <div key={month.key} className="border rounded-lg p-3">
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium text-gray-900">{month.label}</span>
              <div className="text-right">
                <span className="text-sm font-bold text-green-600">₲ {month.revenue.toLocaleString('es-PY')}</span>
                <span className="text-xs text-gray-500 ml-2">({month.sales} vendas)</span>
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-600 h-2 rounded-full transition-all"
                style={{ width: `${(month.revenue / maxRevenue) * 100}%` }}
              ></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

const AverageTicketReport: React.FC<{
  sales: any[]
  saleItems: any[]
  clients: any[]
  categories: Category[]
}> = ({ sales, saleItems, clients, categories }) => {
  const validSales = sales.filter(s => s.payment_status !== 'cancelled')

  const clientTickets = clients.map(client => {
    const clientSales = validSales.filter(s => s.client_id === client.id)
    const total = clientSales.reduce((sum, s) => sum + Number(s.final_amount), 0)
    const count = clientSales.length
    return {
      name: client.name,
      count,
      total,
      avg: count > 0 ? total / count : 0
    }
  }).filter(c => c.count > 0).sort((a, b) => b.avg - a.avg)

  const categoryTickets = categories.map(category => {
    const categoryItems = saleItems.filter(item => {
      return validSales.some(s => s.id === item.sale_id)
    })
    const categoryRevenue = categoryItems.reduce((sum, item) => sum + Number(item.subtotal), 0)
    const count = categoryItems.length
    return {
      name: category.name,
      count,
      total: categoryRevenue,
      avg: count > 0 ? categoryRevenue / count : 0
    }
  }).filter(c => c.count > 0).sort((a, b) => b.total - a.total)

  const exportReport = () => {
    const ws1Data = clientTickets.map(c => ({
      'Cliente': c.name,
      'Vendas': c.count,
      'Total': c.total,
      'Ticket Médio': c.avg.toFixed(0)
    }))

    const ws2Data = categoryTickets.map(c => ({
      'Categoria': c.name,
      'Itens Vendidos': c.count,
      'Total': c.total,
      'Média': c.avg.toFixed(0)
    }))

    const wb = XLSX.utils.book_new()
    const ws1 = XLSX.utils.json_to_sheet(ws1Data)
    const ws2 = XLSX.utils.json_to_sheet(ws2Data)
    XLSX.utils.book_append_sheet(wb, ws1, 'Por Cliente')
    XLSX.utils.book_append_sheet(wb, ws2, 'Por Categoria')
    XLSX.writeFile(wb, `Ticket_Medio_Detalhado.xlsx`)
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-gray-900">Análise de Ticket Médio</h3>
        <button
          onClick={exportReport}
          className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          Exportar
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-3">Top 5 Clientes (Ticket Médio)</h4>
          <div className="space-y-2">
            {clientTickets.slice(0, 5).map((client, idx) => (
              <div key={idx} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                <span className="text-sm font-medium text-gray-900">{client.name}</span>
                <span className="text-sm font-bold text-blue-600">₲ {client.avg.toFixed(0).toLocaleString('es-PY')}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="border rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-3">Receita por Categoria</h4>
          <div className="space-y-2">
            {categoryTickets.slice(0, 5).map((cat, idx) => (
              <div key={idx} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                <span className="text-sm font-medium text-gray-900">{cat.name}</span>
                <span className="text-sm font-bold text-green-600">₲ {cat.total.toLocaleString('es-PY')}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

const PaymentMethodsReport: React.FC<{ sales: any[] }> = ({ sales }) => {
  const validSales = sales.filter(s => s.payment_status !== 'cancelled')

  const methods = ['cash', 'card', 'transfer', 'pix', 'check', 'credit']
  const methodLabels: Record<string, string> = {
    cash: 'Dinheiro',
    card: 'Cartão',
    transfer: 'Transferência',
    pix: 'PIX',
    check: 'Cheque',
    credit: 'Crédito'
  }

  const methodData = methods.map(method => {
    const methodSales = validSales.filter(s => s.payment_method === method)
    const revenue = methodSales.reduce((sum, s) => sum + Number(s.final_amount), 0)
    return {
      method,
      label: methodLabels[method],
      count: methodSales.length,
      revenue
    }
  }).sort((a, b) => b.revenue - a.revenue)

  const totalRevenue = methodData.reduce((sum, m) => sum + m.revenue, 0)

  const exportReport = () => {
    const dataToExport = methodData.map(m => ({
      'Método': m.label,
      'Vendas': m.count,
      'Receita': m.revenue,
      'Percentual': totalRevenue > 0 ? ((m.revenue / totalRevenue) * 100).toFixed(2) + '%' : '0%'
    }))

    const worksheet = XLSX.utils.json_to_sheet(dataToExport)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Formas Pagamento')
    XLSX.writeFile(workbook, `Formas_Pagamento.xlsx`)
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-gray-900">Formas de Pagamento Mais Utilizadas</h3>
        <button
          onClick={exportReport}
          className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          Exportar
        </button>
      </div>

      <div className="space-y-3">
        {methodData.map((method) => {
          const percentage = totalRevenue > 0 ? (method.revenue / totalRevenue * 100).toFixed(1) : '0'
          return (
            <div key={method.method} className="border rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium text-gray-900">{method.label}</span>
                <div className="text-right">
                  <span className="font-bold text-green-600">₲ {method.revenue.toLocaleString('es-PY')}</span>
                  <span className="text-sm text-gray-500 ml-2">({method.count} vendas)</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
                <span className="text-sm font-medium text-gray-700">{percentage}%</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const PendingSalesReport: React.FC<{ sales: any[], clients: any[] }> = ({ sales, clients }) => {
  const pendingSales = sales.filter(s => s.payment_status === 'pending')
  const totalPending = pendingSales.reduce((sum, s) => sum + Number(s.final_amount), 0)

  const pendingByClient = clients.map(client => {
    const clientPending = pendingSales.filter(s => s.client_id === client.id)
    const total = clientPending.reduce((sum, s) => sum + Number(s.final_amount), 0)
    return {
      client,
      sales: clientPending,
      count: clientPending.length,
      total
    }
  }).filter(c => c.count > 0).sort((a, b) => b.total - a.total)

  const exportReport = () => {
    const dataToExport = pendingSales.map(sale => {
      const client = clients.find(c => c.id === sale.client_id)
      return {
        'Número': sale.sale_number,
        'Data': new Date(sale.sale_date).toLocaleDateString('pt-BR'),
        'Cliente': client?.name || 'Não informado',
        'Valor': sale.final_amount,
        'Método': sale.payment_method
      }
    })

    const worksheet = XLSX.utils.json_to_sheet(dataToExport)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Pendentes')
    XLSX.writeFile(workbook, `Vendas_Pendentes.xlsx`)
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-semibold text-gray-900">Vendas Pendentes de Pagamento</h3>
          <p className="text-sm text-gray-600 mt-1">Total a receber: ₲ {totalPending.toLocaleString('es-PY')}</p>
        </div>
        <button
          onClick={exportReport}
          className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          Exportar
        </button>
      </div>

      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
        <p className="text-sm text-orange-700 font-medium">Total Pendente</p>
        <p className="text-3xl font-bold text-orange-600 mt-2">₲ {totalPending.toLocaleString('es-PY')}</p>
        <p className="text-xs text-orange-600 mt-1">{pendingSales.length} vendas</p>
      </div>

      <div className="space-y-2">
        {pendingByClient.map((item) => (
          <div key={item.client.id} className="border rounded-lg p-3">
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium text-gray-900">{item.client.name}</span>
              <span className="font-bold text-orange-600">₲ {item.total.toLocaleString('es-PY')}</span>
            </div>
            <p className="text-xs text-gray-600">{item.count} venda(s) pendente(s)</p>
          </div>
        ))}
      </div>
    </div>
  )
}

const DiscountsReport: React.FC<{ sales: any[] }> = ({ sales }) => {
  const validSales = sales.filter(s => s.payment_status !== 'cancelled')
  const salesWithDiscount = validSales.filter(s => Number(s.discount_amount) > 0)

  const totalDiscount = salesWithDiscount.reduce((sum, s) => sum + Number(s.discount_amount), 0)
  const totalRevenue = validSales.reduce((sum, s) => sum + Number(s.final_amount), 0)
  const revenueWithoutDiscount = validSales.reduce((sum, s) => sum + Number(s.total_amount), 0)
  const avgDiscount = salesWithDiscount.length > 0 ? totalDiscount / salesWithDiscount.length : 0

  const exportReport = () => {
    const dataToExport = salesWithDiscount.map(sale => ({
      'Número': sale.sale_number,
      'Data': new Date(sale.sale_date).toLocaleDateString('pt-BR'),
      'Valor Original': sale.total_amount,
      'Desconto': sale.discount_amount,
      'Valor Final': sale.final_amount,
      'Percentual': ((sale.discount_amount / sale.total_amount) * 100).toFixed(2) + '%'
    }))

    const worksheet = XLSX.utils.json_to_sheet(dataToExport)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Descontos')
    XLSX.writeFile(workbook, `Analise_Descontos.xlsx`)
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-gray-900">Análise de Descontos e Rentabilidade</h3>
        <button
          onClick={exportReport}
          className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          Exportar
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-700 font-medium">Total em Descontos</p>
          <p className="text-2xl font-bold text-red-600 mt-2">₲ {totalDiscount.toLocaleString('es-PY')}</p>
          <p className="text-xs text-red-600 mt-1">{salesWithDiscount.length} vendas</p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-700 font-medium">Desconto Médio</p>
          <p className="text-2xl font-bold text-blue-600 mt-2">₲ {avgDiscount.toFixed(0).toLocaleString('es-PY')}</p>
          <p className="text-xs text-blue-600 mt-1">por venda com desconto</p>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-700 font-medium">Impacto na Receita</p>
          <p className="text-2xl font-bold text-green-600 mt-2">
            {revenueWithoutDiscount > 0 ? ((totalDiscount / revenueWithoutDiscount) * 100).toFixed(1) : 0}%
          </p>
          <p className="text-xs text-green-600 mt-1">do total</p>
        </div>
      </div>
    </div>
  )
}

const GoalsReport: React.FC<{
  sales: any[]
  monthlyGoal: number
  setMonthlyGoal: (goal: number) => void
}> = ({ sales, monthlyGoal, setMonthlyGoal }) => {
  const now = new Date()
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const monthSales = sales.filter(sale => {
    const saleMonth = new Date(sale.sale_date).toISOString().substring(0, 7)
    return saleMonth === currentMonth && sale.payment_status !== 'cancelled'
  })

  const monthRevenue = monthSales.reduce((sum, s) => sum + Number(s.final_amount), 0)
  const goalPercentage = monthlyGoal > 0 ? (monthRevenue / monthlyGoal) * 100 : 0
  const remaining = monthlyGoal - monthRevenue

  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const currentDay = now.getDate()
  const dailyGoal = monthlyGoal / daysInMonth
  const dailyRequired = remaining / (daysInMonth - currentDay + 1)

  const exportReport = () => {
    const dataToExport = [{
      'Meta Mensal': monthlyGoal,
      'Alcançado': monthRevenue,
      'Percentual': goalPercentage.toFixed(2) + '%',
      'Faltante': remaining,
      'Meta Diária': dailyGoal.toFixed(0),
      'Necessário por Dia': dailyRequired > 0 ? dailyRequired.toFixed(0) : 0
    }]

    const worksheet = XLSX.utils.json_to_sheet(dataToExport)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Metas')
    XLSX.writeFile(workbook, `Meta_Mensal_${currentMonth}.xlsx`)
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-gray-900">Meta de Vendas Mensal</h3>
        <button
          onClick={exportReport}
          className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          Exportar
        </button>
      </div>

      <div className="border rounded-lg p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Meta Mensal (₲)</label>
        <input
          type="number"
          value={monthlyGoal}
          onChange={(e) => setMonthlyGoal(Number(e.target.value) || 0)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          placeholder="Digite a meta mensal"
        />
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <span className="text-lg font-medium text-gray-900">Progresso da Meta</span>
          <span className="text-3xl font-bold text-blue-600">{goalPercentage.toFixed(1)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-4 mb-3">
          <div
            className="bg-blue-600 h-4 rounded-full transition-all"
            style={{ width: `${Math.min(goalPercentage, 100)}%` }}
          ></div>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-600">Meta</p>
            <p className="font-bold text-gray-900">₲ {monthlyGoal.toLocaleString('es-PY')}</p>
          </div>
          <div>
            <p className="text-gray-600">Alcançado</p>
            <p className="font-bold text-green-600">₲ {monthRevenue.toLocaleString('es-PY')}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="border rounded-lg p-4">
          <p className="text-sm text-gray-600">Faltante</p>
          <p className="text-xl font-bold text-orange-600 mt-2">
            ₲ {remaining > 0 ? remaining.toLocaleString('es-PY') : 0}
          </p>
        </div>

        <div className="border rounded-lg p-4">
          <p className="text-sm text-gray-600">Meta Diária</p>
          <p className="text-xl font-bold text-blue-600 mt-2">
            ₲ {dailyGoal.toFixed(0).toLocaleString('es-PY')}
          </p>
        </div>

        <div className="border rounded-lg p-4">
          <p className="text-sm text-gray-600">Necessário/Dia</p>
          <p className="text-xl font-bold text-green-600 mt-2">
            ₲ {dailyRequired > 0 ? dailyRequired.toFixed(0).toLocaleString('es-PY') : 0}
          </p>
        </div>
      </div>
    </div>
  )
}

const ClientsReports: React.FC = () => {
  const [clients, setClients] = useState<any[]>([])
  const [sales, setSales] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeReport, setActiveReport] = useState<'ranking' | 'inactive' | 'new' | 'pending' | 'frequency' | 'geographic' | 'location'>('ranking')

  useEffect(() => {
    fetchClientsData()
  }, [])

  const fetchClientsData = async () => {
    try {
      const [clientsResult, salesResult] = await Promise.all([
        supabase.from('clients').select('*'),
        supabase.from('sales').select('*')
      ])

      if (clientsResult.error) throw clientsResult.error
      if (salesResult.error) throw salesResult.error

      setClients(clientsResult.data || [])
      setSales(salesResult.data || [])
    } catch (error) {
      console.error('Erro ao buscar dados:', error)
    } finally {
      setLoading(false)
    }
  }

  const reports = [
    { id: 'ranking', label: 'Ranking de Clientes', icon: Trending },
    { id: 'inactive', label: 'Clientes Inativos', icon: UserX },
    { id: 'new', label: 'Novos Clientes', icon: UserCheck },
    { id: 'pending', label: 'Pagamentos Pendentes', icon: AlertTriangle },
    { id: 'frequency', label: 'Frequência de Compra', icon: Clock },
    { id: 'geographic', label: 'Análise Geográfica', icon: MapPin },
    { id: 'location', label: 'Por Cidade/Estado', icon: MapPin }
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Relatórios de Clientes e Comportamento</h2>
        <p className="text-sm text-gray-600">Análises completas sobre seus clientes</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
        {reports.map((report) => {
          const Icon = report.icon
          const isActive = activeReport === report.id
          return (
            <button
              key={report.id}
              onClick={() => setActiveReport(report.id as any)}
              className={`p-3 rounded-lg border transition-all ${
                isActive
                  ? 'border-blue-600 bg-blue-50 shadow-md'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <Icon className={`w-5 h-5 mx-auto mb-1 ${isActive ? 'text-blue-600' : 'text-gray-600'}`} />
              <p className={`text-xs font-medium text-center ${isActive ? 'text-blue-600' : 'text-gray-700'}`}>
                {report.label}
              </p>
            </button>
          )
        })}
      </div>

      <div className="bg-white border rounded-lg p-6">
        {activeReport === 'ranking' && <ClientRankingReport clients={clients} sales={sales} />}
        {activeReport === 'inactive' && <InactiveClientsReport clients={clients} sales={sales} />}
        {activeReport === 'new' && <NewClientsReport clients={clients} sales={sales} />}
        {activeReport === 'pending' && <PendingPaymentsReport clients={clients} sales={sales} />}
        {activeReport === 'frequency' && <PurchaseFrequencyReport clients={clients} sales={sales} />}
        {activeReport === 'geographic' && <GeographicAnalysisReport clients={clients} sales={sales} />}
        {activeReport === 'location' && <LocationVolumeReport clients={clients} sales={sales} />}
      </div>
    </div>
  )
}

const ClientRankingReport: React.FC<{ clients: any[], sales: any[] }> = ({ clients, sales }) => {
  const getClientPurchaseStats = () => {
    const clientStats = clients.map(client => {
      const clientSales = sales.filter(s => s.client_id === client.id && s.payment_status !== 'cancelled')
      const totalSpent = clientSales.reduce((sum, s) => sum + Number(s.final_amount), 0)
      return {
        client,
        purchaseCount: clientSales.length,
        totalSpent,
        avgTicket: clientSales.length > 0 ? totalSpent / clientSales.length : 0
      }
    })

    return clientStats.sort((a, b) => b.totalSpent - a.totalSpent)
  }

  const exportReport = () => {
    const stats = getClientPurchaseStats()
    const dataToExport = stats.map((stat, index) => ({
      'Ranking': index + 1,
      'Cliente': stat.client.name,
      'Email': stat.client.email || '-',
      'Telefone': stat.client.phone || '-',
      'RUC': stat.client.ruc || '-',
      'Total Compras': stat.purchaseCount,
      'Valor Total': stat.totalSpent,
      'Ticket Médio': stat.avgTicket.toFixed(0),
      'Status': stat.client.active ? 'Ativo' : 'Inativo'
    }))

    const worksheet = XLSX.utils.json_to_sheet(dataToExport)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Ranking Clientes')
    XLSX.writeFile(workbook, `Ranking_Clientes_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  const clientStats = getClientPurchaseStats()
  const totalClientsWithPurchases = clientStats.filter(s => s.purchaseCount > 0).length

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-gray-900">Ranking Completo de Clientes por Volume de Compras</h3>
        <button
          onClick={exportReport}
          className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          Exportar
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-blue-700 font-medium">Total de Clientes</p>
            <Users className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-blue-600">{clients.length}</p>
          <p className="text-xs text-blue-600 mt-1">{clients.filter(c => c.active).length} ativos</p>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-green-700 font-medium">Clientes Compradores</p>
            <ShoppingCart className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-3xl font-bold text-green-600">{totalClientsWithPurchases}</p>
          <p className="text-xs text-green-600 mt-1">
            {clients.length > 0 ? ((totalClientsWithPurchases / clients.length) * 100).toFixed(1) : 0}% convertidos
          </p>
        </div>

        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-orange-700 font-medium">Ticket Médio</p>
            <DollarSign className="w-5 h-5 text-orange-600" />
          </div>
          <p className="text-3xl font-bold text-orange-600">
            ₲ {clientStats.length > 0
              ? (clientStats.reduce((sum, s) => sum + s.totalSpent, 0) / totalClientsWithPurchases || 0).toFixed(0).toLocaleString('es-PY')
              : 0}
          </p>
          <p className="text-xs text-orange-600 mt-1">por cliente</p>
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-3 px-4 font-medium text-gray-900">Ranking</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900">Cliente</th>
                <th className="text-center py-3 px-4 font-medium text-gray-900">Compras</th>
                <th className="text-right py-3 px-4 font-medium text-gray-900">Total Gasto</th>
                <th className="text-right py-3 px-4 font-medium text-gray-900">Ticket Médio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {clientStats.map((stat, index) => (
                <tr key={stat.client.id} className="hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        index === 0 ? 'bg-yellow-500' :
                        index === 1 ? 'bg-gray-400' :
                        index === 2 ? 'bg-orange-600' :
                        'bg-blue-500'
                      }`}>
                        <span className="text-white font-bold text-sm">{index + 1}</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div>
                      <p className="font-medium text-gray-900">{stat.client.name}</p>
                      <p className="text-xs text-gray-500">{stat.client.email || stat.client.phone || '-'}</p>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="font-medium text-gray-900">{stat.purchaseCount}</span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className="font-bold text-green-600">
                      ₲ {stat.totalSpent.toLocaleString('es-PY')}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className="text-gray-900">
                      ₲ {stat.avgTicket.toFixed(0).toLocaleString('es-PY')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {clientStats.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            Nenhum cliente com compras registradas.
          </div>
        )}
      </div>
    </div>
  )
}

const InactiveClientsReport: React.FC<{ clients: any[], sales: any[] }> = ({ clients, sales }) => {
  const getInactiveClients = () => {
    const now = new Date()
    const days30Ago = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const days60Ago = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)
    const days90Ago = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)

    const clientsWithLastPurchase = clients.map(client => {
      const clientSales = sales
        .filter(s => s.client_id === client.id && s.payment_status !== 'cancelled')
        .sort((a, b) => new Date(b.sale_date).getTime() - new Date(a.sale_date).getTime())

      const lastSale = clientSales[0]
      const lastPurchaseDate = lastSale ? new Date(lastSale.sale_date) : null

      let inactivityDays = null
      if (lastPurchaseDate) {
        inactivityDays = Math.floor((now.getTime() - lastPurchaseDate.getTime()) / (1000 * 60 * 60 * 24))
      }

      return {
        client,
        lastPurchaseDate,
        inactivityDays,
        totalPurchases: clientSales.length,
        totalSpent: clientSales.reduce((sum, s) => sum + Number(s.final_amount), 0)
      }
    })

    const inactive30 = clientsWithLastPurchase.filter(c => c.inactivityDays && c.inactivityDays >= 30)
    const inactive60 = clientsWithLastPurchase.filter(c => c.inactivityDays && c.inactivityDays >= 60)
    const inactive90 = clientsWithLastPurchase.filter(c => c.inactivityDays && c.inactivityDays >= 90)

    return { inactive30, inactive60, inactive90, allInactive: clientsWithLastPurchase }
  }

  const exportReport = () => {
    const { allInactive } = getInactiveClients()
    const dataToExport = allInactive
      .filter(c => c.inactivityDays && c.inactivityDays >= 30)
      .map(item => ({
        'Cliente': item.client.name,
        'Email': item.client.email || '-',
        'Telefone': item.client.phone || '-',
        'Última Compra': item.lastPurchaseDate ? new Date(item.lastPurchaseDate).toLocaleDateString('pt-BR') : 'Nunca comprou',
        'Dias Inativo': item.inactivityDays || '-',
        'Total Compras': item.totalPurchases,
        'Valor Total Gasto': item.totalSpent
      }))

    const worksheet = XLSX.utils.json_to_sheet(dataToExport)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Clientes Inativos')
    XLSX.writeFile(workbook, `Clientes_Inativos_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  const { inactive30, inactive60, inactive90 } = getInactiveClients()

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-gray-900">Clientes Inativos por Período</h3>
        <button
          onClick={exportReport}
          className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          Exportar
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-yellow-700 font-medium">Inativos 30+ dias</p>
            <UserX className="w-5 h-5 text-yellow-600" />
          </div>
          <p className="text-3xl font-bold text-yellow-600">{inactive30.length}</p>
          <p className="text-xs text-yellow-600 mt-1">clientes sem comprar</p>
        </div>

        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-orange-700 font-medium">Inativos 60+ dias</p>
            <UserX className="w-5 h-5 text-orange-600" />
          </div>
          <p className="text-3xl font-bold text-orange-600">{inactive60.length}</p>
          <p className="text-xs text-orange-600 mt-1">clientes sem comprar</p>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-red-700 font-medium">Inativos 90+ dias</p>
            <UserX className="w-5 h-5 text-red-600" />
          </div>
          <p className="text-3xl font-bold text-red-600">{inactive90.length}</p>
          <p className="text-xs text-red-600 mt-1">clientes sem comprar</p>
        </div>
      </div>

      <div className="space-y-3">
        {[
          { title: 'Inativos há 30+ dias', data: inactive30, color: 'yellow' },
          { title: 'Inativos há 60+ dias', data: inactive60, color: 'orange' },
          { title: 'Inativos há 90+ dias', data: inactive90, color: 'red' }
        ].map(({ title, data, color }) => (
          <div key={title} className="border rounded-lg">
            <div className={`bg-${color}-50 border-b border-${color}-200 p-3`}>
              <h4 className={`font-medium text-${color}-900`}>{title} ({data.length})</h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-2 px-4 text-sm font-medium text-gray-900">Cliente</th>
                    <th className="text-center py-2 px-4 text-sm font-medium text-gray-900">Última Compra</th>
                    <th className="text-center py-2 px-4 text-sm font-medium text-gray-900">Dias Inativo</th>
                    <th className="text-right py-2 px-4 text-sm font-medium text-gray-900">Total Gasto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {data.slice(0, 10).map((item) => (
                    <tr key={item.client.id} className="hover:bg-gray-50">
                      <td className="py-2 px-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{item.client.name}</p>
                          <p className="text-xs text-gray-500">{item.client.email || item.client.phone || '-'}</p>
                        </div>
                      </td>
                      <td className="py-2 px-4 text-center text-sm text-gray-900">
                        {item.lastPurchaseDate
                          ? new Date(item.lastPurchaseDate).toLocaleDateString('pt-BR')
                          : 'Nunca comprou'}
                      </td>
                      <td className="py-2 px-4 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          item.inactivityDays && item.inactivityDays >= 90 ? 'bg-red-100 text-red-800' :
                          item.inactivityDays && item.inactivityDays >= 60 ? 'bg-orange-100 text-orange-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {item.inactivityDays} dias
                        </span>
                      </td>
                      <td className="py-2 px-4 text-right text-sm font-medium text-gray-900">
                        ₲ {item.totalSpent.toLocaleString('es-PY')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {data.length > 10 && (
              <div className="p-2 bg-gray-50 text-center text-xs text-gray-600">
                Mostrando 10 de {data.length} clientes inativos
              </div>
            )}
            {data.length === 0 && (
              <div className="p-4 text-center text-sm text-gray-500">
                Nenhum cliente inativo neste período
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

const NewClientsReport: React.FC<{ clients: any[], sales: any[] }> = ({ clients, sales }) => {
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const getNewClients = () => {
    return clients.map(client => {
      const clientSales = sales
        .filter(s => s.client_id === client.id && s.payment_status !== 'cancelled')
        .sort((a, b) => new Date(a.sale_date).getTime() - new Date(b.sale_date).getTime())

      const firstSale = clientSales[0]

      return {
        client,
        registrationDate: new Date(client.created_at),
        firstPurchaseDate: firstSale ? new Date(firstSale.sale_date) : null,
        firstPurchaseAmount: firstSale ? Number(firstSale.final_amount) : 0,
        totalPurchases: clientSales.length,
        totalSpent: clientSales.reduce((sum, s) => sum + Number(s.final_amount), 0)
      }
    })
  }

  const filteredNewClients = () => {
    const allNewClients = getNewClients()

    if (!startDate && !endDate) {
      return allNewClients.sort((a, b) => b.registrationDate.getTime() - a.registrationDate.getTime())
    }

    return allNewClients.filter(item => {
      const regDate = item.registrationDate
      const start = startDate ? new Date(startDate) : null
      const end = endDate ? new Date(endDate) : null

      if (start && end) {
        return regDate >= start && regDate <= end
      } else if (start) {
        return regDate >= start
      } else if (end) {
        return regDate <= end
      }
      return true
    }).sort((a, b) => b.registrationDate.getTime() - a.registrationDate.getTime())
  }

  const exportReport = () => {
    const newClients = filteredNewClients()
    const dataToExport = newClients.map(item => ({
      'Cliente': item.client.name,
      'Email': item.client.email || '-',
      'Telefone': item.client.phone || '-',
      'Data Cadastro': item.registrationDate.toLocaleDateString('pt-BR'),
      'Primeira Compra': item.firstPurchaseDate ? item.firstPurchaseDate.toLocaleDateString('pt-BR') : 'Ainda não comprou',
      'Valor Primeira Compra': item.firstPurchaseAmount,
      'Total Compras': item.totalPurchases,
      'Valor Total Gasto': item.totalSpent
    }))

    const worksheet = XLSX.utils.json_to_sheet(dataToExport)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Novos Clientes')
    XLSX.writeFile(workbook, `Novos_Clientes_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  const newClients = filteredNewClients()
  const clientsWithPurchase = newClients.filter(c => c.firstPurchaseDate).length
  const conversionRate = newClients.length > 0 ? (clientsWithPurchase / newClients.length) * 100 : 0

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-gray-900">Novos Clientes por Período</h3>
        <button
          onClick={exportReport}
          className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          Exportar
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-2">Data Início</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-2">Data Fim</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-blue-700 font-medium">Novos Clientes</p>
            <UserCheck className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-blue-600">{newClients.length}</p>
          <p className="text-xs text-blue-600 mt-1">no período</p>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-green-700 font-medium">Já Compraram</p>
            <ShoppingCart className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-3xl font-bold text-green-600">{clientsWithPurchase}</p>
          <p className="text-xs text-green-600 mt-1">{conversionRate.toFixed(1)}% conversão</p>
        </div>

        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-orange-700 font-medium">Receita Gerada</p>
            <DollarSign className="w-5 h-5 text-orange-600" />
          </div>
          <p className="text-2xl font-bold text-orange-600">
            ₲ {newClients.reduce((sum, c) => sum + c.totalSpent, 0).toLocaleString('es-PY')}
          </p>
          <p className="text-xs text-orange-600 mt-1">dos novos clientes</p>
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-3 px-4 font-medium text-gray-900">Cliente</th>
                <th className="text-center py-3 px-4 font-medium text-gray-900">Data Cadastro</th>
                <th className="text-center py-3 px-4 font-medium text-gray-900">Primeira Compra</th>
                <th className="text-right py-3 px-4 font-medium text-gray-900">Valor 1ª Compra</th>
                <th className="text-center py-3 px-4 font-medium text-gray-900">Total Compras</th>
                <th className="text-right py-3 px-4 font-medium text-gray-900">Total Gasto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {newClients.map((item) => (
                <tr key={item.client.id} className="hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <div>
                      <p className="font-medium text-gray-900">{item.client.name}</p>
                      <p className="text-xs text-gray-500">{item.client.email || item.client.phone || '-'}</p>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center text-sm text-gray-900">
                    {item.registrationDate.toLocaleDateString('pt-BR')}
                  </td>
                  <td className="py-3 px-4 text-center text-sm">
                    {item.firstPurchaseDate ? (
                      <span className="text-green-600 font-medium">
                        {item.firstPurchaseDate.toLocaleDateString('pt-BR')}
                      </span>
                    ) : (
                      <span className="text-gray-400">Ainda não comprou</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right text-sm font-medium text-gray-900">
                    {item.firstPurchaseAmount > 0 ? `₲ ${item.firstPurchaseAmount.toLocaleString('es-PY')}` : '-'}
                  </td>
                  <td className="py-3 px-4 text-center text-sm text-gray-900">
                    {item.totalPurchases}
                  </td>
                  <td className="py-3 px-4 text-right text-sm font-bold text-green-600">
                    ₲ {item.totalSpent.toLocaleString('es-PY')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {newClients.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            Nenhum novo cliente no período selecionado.
          </div>
        )}
      </div>
    </div>
  )
}

const PendingPaymentsReport: React.FC<{ clients: any[], sales: any[] }> = ({ clients, sales }) => {
  const getPendingPayments = () => {
    const pendingSales = sales.filter(s => s.payment_status === 'pending')

    const clientsWithPending = clients.map(client => {
      const clientPending = pendingSales.filter(s => s.client_id === client.id)
      return {
        client,
        pendingSales: clientPending,
        totalPending: clientPending.reduce((sum, s) => sum + Number(s.final_amount), 0),
        oldestPending: clientPending.length > 0
          ? new Date(Math.min(...clientPending.map(s => new Date(s.sale_date).getTime())))
          : null
      }
    }).filter(c => c.pendingSales.length > 0)

    return clientsWithPending.sort((a, b) => b.totalPending - a.totalPending)
  }

  const exportReport = () => {
    const pending = getPendingPayments()
    const dataToExport = pending.map(item => ({
      'Cliente': item.client.name,
      'Email': item.client.email || '-',
      'Telefone': item.client.phone || '-',
      'Vendas Pendentes': item.pendingSales.length,
      'Valor Total Pendente': item.totalPending,
      'Pendente Mais Antigo': item.oldestPending ? item.oldestPending.toLocaleDateString('pt-BR') : '-'
    }))

    const worksheet = XLSX.utils.json_to_sheet(dataToExport)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Pagamentos Pendentes')
    XLSX.writeFile(workbook, `Pagamentos_Pendentes_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  const clientsWithPending = getPendingPayments()
  const totalPending = clientsWithPending.reduce((sum, c) => sum + c.totalPending, 0)
  const totalSalesPending = clientsWithPending.reduce((sum, c) => sum + c.pendingSales.length, 0)

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-gray-900">Clientes com Pagamentos Pendentes</h3>
        <button
          onClick={exportReport}
          className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          Exportar
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-orange-700 font-medium">Clientes com Pendências</p>
            <AlertTriangle className="w-5 h-5 text-orange-600" />
          </div>
          <p className="text-3xl font-bold text-orange-600">{clientsWithPending.length}</p>
          <p className="text-xs text-orange-600 mt-1">com pagamentos pendentes</p>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-red-700 font-medium">Vendas Pendentes</p>
            <ShoppingCart className="w-5 h-5 text-red-600" />
          </div>
          <p className="text-3xl font-bold text-red-600">{totalSalesPending}</p>
          <p className="text-xs text-red-600 mt-1">vendas não pagas</p>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-yellow-700 font-medium">Valor Total Pendente</p>
            <DollarSign className="w-5 h-5 text-yellow-600" />
          </div>
          <p className="text-2xl font-bold text-yellow-600">
            ₲ {totalPending.toLocaleString('es-PY')}
          </p>
          <p className="text-xs text-yellow-600 mt-1">a receber</p>
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-3 px-4 font-medium text-gray-900">Cliente</th>
                <th className="text-center py-3 px-4 font-medium text-gray-900">Vendas Pendentes</th>
                <th className="text-right py-3 px-4 font-medium text-gray-900">Valor Pendente</th>
                <th className="text-center py-3 px-4 font-medium text-gray-900">Mais Antigo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {clientsWithPending.map((item) => {
                const daysOld = item.oldestPending
                  ? Math.floor((new Date().getTime() - item.oldestPending.getTime()) / (1000 * 60 * 60 * 24))
                  : 0

                return (
                  <tr key={item.client.id} className="hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium text-gray-900">{item.client.name}</p>
                        <p className="text-xs text-gray-500">{item.client.email || item.client.phone || '-'}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                        {item.pendingSales.length} venda{item.pendingSales.length > 1 ? 's' : ''}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="font-bold text-red-600">
                        ₲ {item.totalPending.toLocaleString('es-PY')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center text-sm">
                      <div>
                        <p className="text-gray-900">
                          {item.oldestPending ? item.oldestPending.toLocaleDateString('pt-BR') : '-'}
                        </p>
                        {daysOld > 0 && (
                          <p className={`text-xs ${
                            daysOld > 30 ? 'text-red-600' : daysOld > 15 ? 'text-orange-600' : 'text-yellow-600'
                          }`}>
                            há {daysOld} dia{daysOld > 1 ? 's' : ''}
                          </p>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {clientsWithPending.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            Nenhum cliente com pagamento pendente.
          </div>
        )}
      </div>
    </div>
  )
}

const PurchaseFrequencyReport: React.FC<{ clients: any[], sales: any[] }> = ({ clients, sales }) => {
  const getFrequencyAnalysis = () => {
    return clients.map(client => {
      const clientSales = sales
        .filter(s => s.client_id === client.id && s.payment_status !== 'cancelled')
        .sort((a, b) => new Date(a.sale_date).getTime() - new Date(b.sale_date).getTime())

      if (clientSales.length === 0) {
        return {
          client,
          totalPurchases: 0,
          avgDaysBetweenPurchases: null,
          firstPurchase: null,
          lastPurchase: null,
          totalSpent: 0
        }
      }

      const firstPurchase = new Date(clientSales[0].sale_date)
      const lastPurchase = new Date(clientSales[clientSales.length - 1].sale_date)
      const daysSinceFirst = Math.floor((new Date().getTime() - firstPurchase.getTime()) / (1000 * 60 * 60 * 24))

      let avgDaysBetweenPurchases = null
      if (clientSales.length > 1) {
        const totalDays = Math.floor((lastPurchase.getTime() - firstPurchase.getTime()) / (1000 * 60 * 60 * 24))
        avgDaysBetweenPurchases = Math.floor(totalDays / (clientSales.length - 1))
      }

      return {
        client,
        totalPurchases: clientSales.length,
        avgDaysBetweenPurchases,
        firstPurchase,
        lastPurchase,
        totalSpent: clientSales.reduce((sum, s) => sum + Number(s.final_amount), 0),
        daysSinceFirst
      }
    }).filter(c => c.totalPurchases > 0)
      .sort((a, b) => b.totalPurchases - a.totalPurchases)
  }

  const exportReport = () => {
    const frequency = getFrequencyAnalysis()
    const dataToExport = frequency.map(item => ({
      'Cliente': item.client.name,
      'Email': item.client.email || '-',
      'Telefone': item.client.phone || '-',
      'Total Compras': item.totalPurchases,
      'Média Dias Entre Compras': item.avgDaysBetweenPurchases || '-',
      'Primeira Compra': item.firstPurchase ? item.firstPurchase.toLocaleDateString('pt-BR') : '-',
      'Última Compra': item.lastPurchase ? item.lastPurchase.toLocaleDateString('pt-BR') : '-',
      'Valor Total Gasto': item.totalSpent
    }))

    const worksheet = XLSX.utils.json_to_sheet(dataToExport)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Frequência Compra')
    XLSX.writeFile(workbook, `Frequencia_Compra_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  const frequencyData = getFrequencyAnalysis()
  const avgFrequency = frequencyData.length > 0
    ? frequencyData
        .filter(f => f.avgDaysBetweenPurchases !== null)
        .reduce((sum, f) => sum + (f.avgDaysBetweenPurchases || 0), 0) /
      frequencyData.filter(f => f.avgDaysBetweenPurchases !== null).length
    : 0

  const highFrequency = frequencyData.filter(f => f.avgDaysBetweenPurchases && f.avgDaysBetweenPurchases <= 30)
  const mediumFrequency = frequencyData.filter(f => f.avgDaysBetweenPurchases && f.avgDaysBetweenPurchases > 30 && f.avgDaysBetweenPurchases <= 60)
  const lowFrequency = frequencyData.filter(f => f.avgDaysBetweenPurchases && f.avgDaysBetweenPurchases > 60)

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-gray-900">Frequência de Compra por Cliente</h3>
        <button
          onClick={exportReport}
          className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          Exportar
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-blue-700 font-medium">Média Geral</p>
            <Clock className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-blue-600">{avgFrequency.toFixed(0)}</p>
          <p className="text-xs text-blue-600 mt-1">dias entre compras</p>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-green-700 font-medium">Alta Frequência</p>
            <Trending className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-3xl font-bold text-green-600">{highFrequency.length}</p>
          <p className="text-xs text-green-600 mt-1">≤ 30 dias</p>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-yellow-700 font-medium">Média Frequência</p>
            <Clock className="w-5 h-5 text-yellow-600" />
          </div>
          <p className="text-3xl font-bold text-yellow-600">{mediumFrequency.length}</p>
          <p className="text-xs text-yellow-600 mt-1">31-60 dias</p>
        </div>

        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-orange-700 font-medium">Baixa Frequência</p>
            <TrendingDown className="w-5 h-5 text-orange-600" />
          </div>
          <p className="text-3xl font-bold text-orange-600">{lowFrequency.length}</p>
          <p className="text-xs text-orange-600 mt-1">&gt; 60 dias</p>
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-3 px-4 font-medium text-gray-900">Cliente</th>
                <th className="text-center py-3 px-4 font-medium text-gray-900">Total Compras</th>
                <th className="text-center py-3 px-4 font-medium text-gray-900">Média Entre Compras</th>
                <th className="text-center py-3 px-4 font-medium text-gray-900">Última Compra</th>
                <th className="text-right py-3 px-4 font-medium text-gray-900">Total Gasto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {frequencyData.map((item) => (
                <tr key={item.client.id} className="hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <div>
                      <p className="font-medium text-gray-900">{item.client.name}</p>
                      <p className="text-xs text-gray-500">{item.client.email || item.client.phone || '-'}</p>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="font-medium text-gray-900">{item.totalPurchases}</span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    {item.avgDaysBetweenPurchases !== null ? (
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        item.avgDaysBetweenPurchases <= 30 ? 'bg-green-100 text-green-800' :
                        item.avgDaysBetweenPurchases <= 60 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-orange-100 text-orange-800'
                      }`}>
                        {item.avgDaysBetweenPurchases} dias
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">Apenas 1 compra</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center text-sm text-gray-900">
                    {item.lastPurchase ? item.lastPurchase.toLocaleDateString('pt-BR') : '-'}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className="font-bold text-green-600">
                      ₲ {item.totalSpent.toLocaleString('es-PY')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {frequencyData.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            Nenhum cliente com compras registradas.
          </div>
        )}
      </div>
    </div>
  )
}

const GeographicAnalysisReport: React.FC<{ clients: any[], sales: any[] }> = ({ clients, sales }) => {
  const getGeographicData = () => {
    const clientsWithCoordinates = clients.filter(c => c.latitude && c.longitude)

    return clientsWithCoordinates.map(client => {
      const clientSales = sales.filter(s => s.client_id === client.id && s.payment_status !== 'cancelled')
      return {
        client,
        totalPurchases: clientSales.length,
        totalSpent: clientSales.reduce((sum, s) => sum + Number(s.final_amount), 0),
        latitude: client.latitude,
        longitude: client.longitude
      }
    }).sort((a, b) => b.totalSpent - a.totalSpent)
  }

  const exportReport = () => {
    const geoData = getGeographicData()
    const dataToExport = geoData.map(item => ({
      'Cliente': item.client.name,
      'Endereço': item.client.address || '-',
      'Cidade': item.client.city || '-',
      'Latitude': item.latitude,
      'Longitude': item.longitude,
      'Total Compras': item.totalPurchases,
      'Valor Total Gasto': item.totalSpent
    }))

    const worksheet = XLSX.utils.json_to_sheet(dataToExport)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Análise Geográfica')
    XLSX.writeFile(workbook, `Analise_Geografica_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  const geoData = getGeographicData()
  const totalClientsWithCoords = geoData.length
  const totalRevenueGeo = geoData.reduce((sum, item) => sum + item.totalSpent, 0)

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-gray-900">Análise Geográfica de Clientes</h3>
        <button
          onClick={exportReport}
          className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          Exportar
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-blue-700 font-medium">Com Coordenadas</p>
            <MapPin className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-blue-600">{totalClientsWithCoords}</p>
          <p className="text-xs text-blue-600 mt-1">de {clients.length} clientes</p>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-green-700 font-medium">Receita Mapeada</p>
            <DollarSign className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-green-600">
            ₲ {totalRevenueGeo.toLocaleString('es-PY')}
          </p>
          <p className="text-xs text-green-600 mt-1">dos clientes mapeados</p>
        </div>

        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-orange-700 font-medium">Ticket Médio Geo</p>
            <DollarSign className="w-5 h-5 text-orange-600" />
          </div>
          <p className="text-2xl font-bold text-orange-600">
            ₲ {totalClientsWithCoords > 0 ? (totalRevenueGeo / totalClientsWithCoords).toFixed(0).toLocaleString('es-PY') : 0}
          </p>
          <p className="text-xs text-orange-600 mt-1">por cliente</p>
        </div>
      </div>

      {totalClientsWithCoords === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <MapPin className="w-12 h-12 text-yellow-500 mx-auto mb-3" />
          <p className="text-yellow-800 font-medium">Nenhum cliente com coordenadas GPS cadastradas</p>
          <p className="text-yellow-700 text-sm mt-2">
            Adicione coordenadas GPS aos clientes para visualizar a análise geográfica.
          </p>
        </div>
      )}

      {totalClientsWithCoords > 0 && (
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Cliente</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Endereço</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-900">Coordenadas</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-900">Compras</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-900">Total Gasto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {geoData.map((item) => (
                  <tr key={item.client.id} className="hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium text-gray-900">{item.client.name}</p>
                        <p className="text-xs text-gray-500">{item.client.email || item.client.phone || '-'}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-sm text-gray-900">
                        <p>{item.client.address || '-'}</p>
                        {item.client.city && (
                          <p className="text-xs text-gray-500">{item.client.city}</p>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <a
                        href={`https://www.google.com/maps?q=${item.latitude},${item.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 text-xs font-mono"
                      >
                        {item.latitude.toFixed(6)}, {item.longitude.toFixed(6)}
                      </a>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="font-medium text-gray-900">{item.totalPurchases}</span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="font-bold text-green-600">
                        ₲ {item.totalSpent.toLocaleString('es-PY')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

const LocationVolumeReport: React.FC<{ clients: any[], sales: any[] }> = ({ clients, sales }) => {
  const getLocationData = () => {
    const cityMap = new Map<string, { clients: any[], totalSales: number, totalRevenue: number }>()
    const stateMap = new Map<string, { clients: any[], totalSales: number, totalRevenue: number }>()

    clients.forEach(client => {
      const clientSales = sales.filter(s => s.client_id === client.id && s.payment_status !== 'cancelled')
      const totalRevenue = clientSales.reduce((sum, s) => sum + Number(s.final_amount), 0)

      const city = client.city || 'Não informada'
      const state = client.state || 'Não informado'

      if (!cityMap.has(city)) {
        cityMap.set(city, { clients: [], totalSales: 0, totalRevenue: 0 })
      }
      const cityData = cityMap.get(city)!
      cityData.clients.push(client)
      cityData.totalSales += clientSales.length
      cityData.totalRevenue += totalRevenue

      if (!stateMap.has(state)) {
        stateMap.set(state, { clients: [], totalSales: 0, totalRevenue: 0 })
      }
      const stateData = stateMap.get(state)!
      stateData.clients.push(client)
      stateData.totalSales += clientSales.length
      stateData.totalRevenue += totalRevenue
    })

    const cityData = Array.from(cityMap.entries())
      .map(([city, data]) => ({ city, ...data }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue)

    const stateData = Array.from(stateMap.entries())
      .map(([state, data]) => ({ state, ...data }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue)

    return { cityData, stateData }
  }

  const exportReport = () => {
    const { cityData, stateData } = getLocationData()

    const citiesExport = cityData.map(item => ({
      'Cidade': item.city,
      'Clientes': item.clients.length,
      'Vendas': item.totalSales,
      'Receita Total': item.totalRevenue
    }))

    const statesExport = stateData.map(item => ({
      'Departamento': item.state,
      'Clientes': item.clients.length,
      'Vendas': item.totalSales,
      'Receita Total': item.totalRevenue
    }))

    const wb = XLSX.utils.book_new()
    const wsCities = XLSX.utils.json_to_sheet(citiesExport)
    const wsStates = XLSX.utils.json_to_sheet(statesExport)
    XLSX.utils.book_append_sheet(wb, wsCities, 'Por Cidade')
    XLSX.utils.book_append_sheet(wb, wsStates, 'Por Departamento')
    XLSX.writeFile(wb, `Clientes_Localizacao_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  const { cityData, stateData } = getLocationData()
  const totalCities = cityData.length
  const totalStates = stateData.length

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-gray-900">Clientes por Cidade e Departamento</h3>
        <button
          onClick={exportReport}
          className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          Exportar
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-blue-700 font-medium">Cidades Atendidas</p>
            <MapPin className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-blue-600">{totalCities}</p>
          <p className="text-xs text-blue-600 mt-1">cidades diferentes</p>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-green-700 font-medium">Departamentos</p>
            <MapPin className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-3xl font-bold text-green-600">{totalStates}</p>
          <p className="text-xs text-green-600 mt-1">departamentos</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-gray-50 border-b p-3">
            <h4 className="font-medium text-gray-900">Top 10 Cidades por Receita</h4>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-2 px-3 text-sm font-medium text-gray-900">Cidade</th>
                  <th className="text-center py-2 px-3 text-sm font-medium text-gray-900">Clientes</th>
                  <th className="text-center py-2 px-3 text-sm font-medium text-gray-900">Vendas</th>
                  <th className="text-right py-2 px-3 text-sm font-medium text-gray-900">Receita</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {cityData.slice(0, 10).map((item, index) => (
                  <tr key={item.city} className="hover:bg-gray-50">
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          index === 0 ? 'bg-yellow-500 text-white' :
                          index === 1 ? 'bg-gray-400 text-white' :
                          index === 2 ? 'bg-orange-600 text-white' :
                          'bg-blue-500 text-white'
                        }`}>
                          {index + 1}
                        </div>
                        <span className="text-sm font-medium text-gray-900">{item.city}</span>
                      </div>
                    </td>
                    <td className="py-2 px-3 text-center text-sm text-gray-900">
                      {item.clients.length}
                    </td>
                    <td className="py-2 px-3 text-center text-sm text-gray-900">
                      {item.totalSales}
                    </td>
                    <td className="py-2 px-3 text-right text-sm font-bold text-green-600">
                      ₲ {item.totalRevenue.toLocaleString('es-PY')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="border rounded-lg overflow-hidden">
          <div className="bg-gray-50 border-b p-3">
            <h4 className="font-medium text-gray-900">Por Departamento</h4>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-2 px-3 text-sm font-medium text-gray-900">Departamento</th>
                  <th className="text-center py-2 px-3 text-sm font-medium text-gray-900">Clientes</th>
                  <th className="text-center py-2 px-3 text-sm font-medium text-gray-900">Vendas</th>
                  <th className="text-right py-2 px-3 text-sm font-medium text-gray-900">Receita</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {stateData.map((item, index) => (
                  <tr key={item.state} className="hover:bg-gray-50">
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          index === 0 ? 'bg-yellow-500 text-white' :
                          index === 1 ? 'bg-gray-400 text-white' :
                          index === 2 ? 'bg-orange-600 text-white' :
                          'bg-green-500 text-white'
                        }`}>
                          {index + 1}
                        </div>
                        <span className="text-sm font-medium text-gray-900">{item.state}</span>
                      </div>
                    </td>
                    <td className="py-2 px-3 text-center text-sm text-gray-900">
                      {item.clients.length}
                    </td>
                    <td className="py-2 px-3 text-center text-sm text-gray-900">
                      {item.totalSales}
                    </td>
                    <td className="py-2 px-3 text-right text-sm font-bold text-green-600">
                      ₲ {item.totalRevenue.toLocaleString('es-PY')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

const ProductsReports: React.FC = () => {
  const [products, setProducts] = useState<ProductWithCategory[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchProductsData()
  }, [])

  const fetchProductsData = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*, categories(id, name, description)')

      if (error) throw error

      const productsData = (data || []).map(product => ({
        ...product,
        categories: product.categories as any
      }))

      setProducts(productsData)
    } catch (error) {
      console.error('Erro ao buscar produtos:', error)
    } finally {
      setLoading(false)
    }
  }

  const exportProductsReport = () => {
    const dataToExport = products.map(product => ({
      'Código': product.codigo,
      'Nome': product.nome,
      'Categoria': product.categories?.name || 'Sem categoria',
      'Preço Varejo': product.price,
      'Preço Atacado': product.price_atacado,
      'Estoque': product.stock,
      'Valor em Estoque': Number(product.price) * Number(product.stock),
      'Status': product.active ? 'Ativo' : 'Inativo',
      'Rotatividade': product.stock <= 5 ? 'Baixa' : product.stock <= 20 ? 'Média' : 'Alta'
    }))

    const worksheet = XLSX.utils.json_to_sheet(dataToExport)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Produtos')

    const fileName = `Relatorio_Produtos_${new Date().toISOString().split('T')[0]}.xlsx`
    XLSX.writeFile(workbook, fileName)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const totalStockValue = products.reduce((sum, p) => sum + (Number(p.price) * Number(p.stock)), 0)
  const lowStockProducts = products.filter(p => p.stock <= 5 && p.stock > 0)
  const outOfStockProducts = products.filter(p => p.stock === 0)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-900">Relatórios de Produtos e Estoque</h2>
        <button
          onClick={exportProductsReport}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          Exportar
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Total Produtos</p>
            <Package className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{products.length}</p>
          <p className="text-xs text-gray-500 mt-1">{products.filter(p => p.active).length} ativos</p>
        </div>

        <div className="bg-white border rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Valor em Estoque</p>
            <DollarSign className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            ₲ {totalStockValue.toLocaleString('es-PY')}
          </p>
          <p className="text-xs text-gray-500 mt-1">valor total</p>
        </div>

        <div className="bg-white border rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Estoque Baixo</p>
            <AlertTriangle className="w-5 h-5 text-orange-500" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{lowStockProducts.length}</p>
          <p className="text-xs text-gray-500 mt-1">produtos críticos</p>
        </div>

        <div className="bg-white border rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Sem Estoque</p>
            <TrendingDown className="w-5 h-5 text-red-500" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{outOfStockProducts.length}</p>
          <p className="text-xs text-gray-500 mt-1">esgotados</p>
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-yellow-600" />
          Produtos com Estoque Crítico
        </h3>
        <div className="space-y-2">
          {lowStockProducts.slice(0, 10).map(product => (
            <div key={product.id} className="flex justify-between items-center bg-white p-3 rounded border">
              <div>
                <p className="font-medium text-gray-900">{product.nome}</p>
                <p className="text-xs text-gray-500">Código: {product.codigo}</p>
              </div>
              <div className="text-right">
                <p className={`font-bold ${product.stock === 0 ? 'text-red-600' : 'text-orange-600'}`}>
                  {product.stock} unidades
                </p>
                <p className="text-xs text-gray-500">
                  ₲ {Number(product.price).toLocaleString('es-PY')}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const PromotionsReports: React.FC = () => {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900">Relatórios de Promoções e Descontos</h2>
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center">
        <Tag className="w-16 h-16 text-blue-400 mx-auto mb-4" />
        <p className="text-gray-600">Relatório de promoções em desenvolvimento</p>
      </div>
    </div>
  )
}

const DeliveriesReports: React.FC = () => {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900">Relatórios de Entregas e Logística</h2>
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center">
        <Truck className="w-16 h-16 text-blue-400 mx-auto mb-4" />
        <p className="text-gray-600">Relatório de entregas em desenvolvimento</p>
      </div>
    </div>
  )
}

const ChartsReports: React.FC = () => {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900">Visualizações e Gráficos Avançados</h2>
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center">
        <PieChart className="w-16 h-16 text-blue-400 mx-auto mb-4" />
        <p className="text-gray-600">Gráficos avançados em desenvolvimento</p>
      </div>
    </div>
  )
}

const FiltersReports: React.FC = () => {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900">Filtros e Customização Avançada</h2>
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center">
        <Filter className="w-16 h-16 text-blue-400 mx-auto mb-4" />
        <p className="text-gray-600">Filtros customizados em desenvolvimento</p>
      </div>
    </div>
  )
}

const ExportReports: React.FC = () => {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900">Exportação e Compartilhamento</h2>
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center">
        <FileSpreadsheet className="w-16 h-16 text-blue-400 mx-auto mb-4" />
        <p className="text-gray-600">Opções de exportação em desenvolvimento</p>
      </div>
    </div>
  )
}

const AnalyticsReports: React.FC = () => {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900">Análises Preditivas e Insights</h2>
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center">
        <Activity className="w-16 h-16 text-blue-400 mx-auto mb-4" />
        <p className="text-gray-600">Análises preditivas em desenvolvimento</p>
      </div>
    </div>
  )
}

const DashboardReports: React.FC = () => {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900">Dashboard Interativo de Relatórios</h2>
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center">
        <BarChart3 className="w-16 h-16 text-blue-400 mx-auto mb-4" />
        <p className="text-gray-600">Dashboard consolidado em desenvolvimento</p>
      </div>
    </div>
  )
}

export default Reports
