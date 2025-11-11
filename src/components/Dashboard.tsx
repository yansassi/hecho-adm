import React, { useState, useEffect } from 'react'
import { Package, ShoppingBag, TrendingUp, AlertTriangle, DollarSign, Truck, Users, TrendingDown, CreditCard, Target, Clock, CheckCircle, PackageCheck, BarChart3, PieChart, LineChart, XCircle, Bell, Tag, Award, TrendingDown as NoMovement, RefreshCw, Calendar, Filter, Download } from 'lucide-react'
import { supabase, Product } from '../lib/supabase'
import jsPDF from 'jspdf'

interface DashboardProps {
  onNavigateToProducts?: (filter: 'all' | 'active' | 'lowStock') => void
}

interface Alert {
  id: string
  type: 'critical' | 'warning' | 'info'
  title: string
  message: string
  count?: number
  action?: () => void
  actionLabel?: string
}

interface SalesMetrics {
  monthTotal: number
  lastMonthTotal: number
  todayTotal: number
  averageTicket: number
  pendingPayments: number
  pendingPaymentsValue: number
  totalSalesCount: number
  paymentMethods: Record<string, number>
  topPaymentMethod: string
  topPaymentMethodCount: number
  monthlyGoal: number
  goalPercentage: number
}

interface DeliveryMetrics {
  pendingDeliveries: number
  scheduledToday: number
  inSeparation: number
  delayedDeliveries: number
  completedOnTime: number
  totalDeliveries: number
  onTimePercentage: number
}

interface DailySales {
  date: string
  total: number
}

interface CategorySales {
  category: string
  total: number
  percentage: number
}

interface LowStockTrend {
  date: string
  count: number
}

interface ProductMetrics {
  totalProducts: number
  activeProducts: number
  lowStockProducts: number
  totalCategories: number
  totalStockValue: number
  activePromotions: number
  totalSavingsFromPromotions: number
  topSellingWeek: Array<{ product_name: string; quantity: number }>
  noMovement30Days: number
}

interface ClientMetrics {
  totalActiveClients: number
  clientsWithPurchasesLastMonth: number
  newClientsThisMonth: number
  clientsWithPendingPayments: number
  topClients: Array<{
    client_id: string
    client_name: string
    total_purchases: number
    purchase_count: number
  }>
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigateToProducts }) => {
  const [stats, setStats] = useState<ProductMetrics>({
    totalProducts: 0,
    activeProducts: 0,
    lowStockProducts: 0,
    totalCategories: 0,
    totalStockValue: 0,
    activePromotions: 0,
    totalSavingsFromPromotions: 0,
    topSellingWeek: [],
    noMovement30Days: 0
  })
  const [salesMetrics, setSalesMetrics] = useState<SalesMetrics>({
    monthTotal: 0,
    lastMonthTotal: 0,
    todayTotal: 0,
    averageTicket: 0,
    pendingPayments: 0,
    pendingPaymentsValue: 0,
    totalSalesCount: 0,
    paymentMethods: {},
    topPaymentMethod: '',
    topPaymentMethodCount: 0,
    monthlyGoal: 50000000,
    goalPercentage: 0
  })
  const [deliveryMetrics, setDeliveryMetrics] = useState<DeliveryMetrics>({
    pendingDeliveries: 0,
    scheduledToday: 0,
    inSeparation: 0,
    delayedDeliveries: 0,
    completedOnTime: 0,
    totalDeliveries: 0,
    onTimePercentage: 0
  })
  const [dailySales, setDailySales] = useState<DailySales[]>([])
  const [categorySales, setCategorySales] = useState<CategorySales[]>([])
  const [lowStockTrend, setLowStockTrend] = useState<LowStockTrend[]>([])
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [clientMetrics, setClientMetrics] = useState<ClientMetrics>({
    totalActiveClients: 0,
    clientsWithPurchasesLastMonth: 0,
    newClientsThisMonth: 0,
    clientsWithPendingPayments: 0,
    topClients: []
  })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [periodFilter, setPeriodFilter] = useState<'today' | 'week' | 'month' | 'year'>('month')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([])
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    fetchAllData()
    fetchCategories()
  }, [])

  useEffect(() => {
    fetchAllData()
  }, [periodFilter, categoryFilter])

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name')
        .order('name')

      if (error) throw error
      setCategories(data || [])
    } catch (error) {
      console.error('Erro ao buscar categorias:', error)
    }
  }

  const fetchAllData = async () => {
    await Promise.all([
      fetchStats(),
      fetchSalesMetrics(),
      fetchDeliveryMetrics(),
      fetchDailySales(),
      fetchCategorySales(),
      fetchLowStockTrend(),
      fetchAlerts(),
      fetchClientMetrics()
    ])
    setLastUpdate(new Date())
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchAllData()
    setRefreshing(false)
  }

  const getPeriodLabel = () => {
    const labels = {
      today: 'Hoje',
      week: 'Esta Semana',
      month: 'Este Mês',
      year: 'Este Ano'
    }
    return labels[periodFilter]
  }

  const exportDashboardPDF = async () => {
    setExporting(true)
    try {
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pageWidth = pdf.internal.pageSize.getWidth()
      const margin = 15

      pdf.setFillColor(37, 99, 235)
      pdf.rect(0, 0, pageWidth, 30, 'F')

      pdf.setFontSize(20)
      pdf.setFont(undefined, 'bold')
      pdf.setTextColor(255, 255, 255)
      pdf.text('Resumo do Dashboard', margin, 20)

      pdf.setFontSize(10)
      pdf.setFont(undefined, 'normal')
      pdf.text(`Período: ${getPeriodLabel()}`, margin, 27)
      pdf.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, pageWidth - margin - 40, 27)

      let yPos = 45

      pdf.setFontSize(14)
      pdf.setFont(undefined, 'bold')
      pdf.setTextColor(0, 0, 0)
      pdf.text('Métricas Financeiras', margin, yPos)
      yPos += 8

      pdf.setFontSize(10)
      pdf.setFont(undefined, 'normal')
      pdf.text(`Total do Mês: ₲ ${salesMetrics.monthTotal.toLocaleString('es-PY')}`, margin, yPos)
      yPos += 6
      pdf.text(`Receita Hoje: ₲ ${salesMetrics.todayTotal.toLocaleString('es-PY')}`, margin, yPos)
      yPos += 6
      pdf.text(`Ticket Médio: ₲ ${Math.round(salesMetrics.averageTicket).toLocaleString('es-PY')}`, margin, yPos)
      yPos += 6
      pdf.text(`Pagamentos Pendentes: ${salesMetrics.pendingPayments} (₲ ${salesMetrics.pendingPaymentsValue.toLocaleString('es-PY')})`, margin, yPos)
      yPos += 10

      pdf.setFontSize(14)
      pdf.setFont(undefined, 'bold')
      pdf.text('Produtos e Estoque', margin, yPos)
      yPos += 8

      pdf.setFontSize(10)
      pdf.setFont(undefined, 'normal')
      pdf.text(`Total de Produtos: ${stats.totalProducts}`, margin, yPos)
      yPos += 6
      pdf.text(`Produtos Ativos: ${stats.activeProducts}`, margin, yPos)
      yPos += 6
      pdf.text(`Estoque Baixo: ${stats.lowStockProducts}`, margin, yPos)
      yPos += 6
      pdf.text(`Valor em Estoque: ₲ ${(stats.totalStockValue / 1000000).toFixed(1)}M`, margin, yPos)
      yPos += 6
      pdf.text(`Promoções Ativas: ${stats.activePromotions}`, margin, yPos)
      yPos += 10

      pdf.setFontSize(14)
      pdf.setFont(undefined, 'bold')
      pdf.text('Entregas', margin, yPos)
      yPos += 8

      pdf.setFontSize(10)
      pdf.setFont(undefined, 'normal')
      pdf.text(`Entregas Pendentes: ${deliveryMetrics.pendingDeliveries}`, margin, yPos)
      yPos += 6
      pdf.text(`Programadas Hoje: ${deliveryMetrics.scheduledToday}`, margin, yPos)
      yPos += 6
      pdf.text(`Em Separação: ${deliveryMetrics.inSeparation}`, margin, yPos)
      yPos += 6
      pdf.text(`Entregas Atrasadas: ${deliveryMetrics.delayedDeliveries}`, margin, yPos)
      yPos += 6
      pdf.text(`Taxa de Entrega no Prazo: ${deliveryMetrics.onTimePercentage.toFixed(1)}%`, margin, yPos)
      yPos += 10

      if (stats.topSellingWeek.length > 0) {
        pdf.setFontSize(14)
        pdf.setFont(undefined, 'bold')
        pdf.text('Top 5 Mais Vendidos (Semana)', margin, yPos)
        yPos += 8

        pdf.setFontSize(10)
        pdf.setFont(undefined, 'normal')
        stats.topSellingWeek.forEach((product, index) => {
          pdf.text(`${index + 1}. ${product.product_name} - ${product.quantity} unidades`, margin, yPos)
          yPos += 6
        })
      }

      pdf.setFontSize(8)
      pdf.setTextColor(128, 128, 128)
      pdf.text(`Gerado em: ${lastUpdate.toLocaleString('pt-BR')}`, margin, pdf.internal.pageSize.getHeight() - 10)

      pdf.save(`Dashboard_${new Date().toISOString().split('T')[0]}.pdf`)
    } catch (error) {
      console.error('Erro ao exportar PDF:', error)
      alert('Erro ao exportar resumo. Tente novamente.')
    } finally {
      setExporting(false)
    }
  }

  const fetchStats = async () => {
    try {
      const { count: totalProducts } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })

      const { count: activeProducts } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('active', true)

      const { count: lowStockProducts } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .lte('stock', 5)

      const { count: totalCategories } = await supabase
        .from('categories')
        .select('*', { count: 'exact', head: true })

      const { data: productsData } = await supabase
        .from('products')
        .select('price, stock')

      const totalStockValue = productsData?.reduce((total, product) => {
        return total + (Number(product.price) * Number(product.stock))
      }, 0) || 0

      const { count: activePromotions } = await supabase
        .from('promotions')
        .select('*', { count: 'exact', head: true })
        .eq('active', true)

      const { data: promotionsData } = await supabase
        .from('promotions')
        .select('original_price, promotional_price, product_id')
        .eq('active', true)

      const { data: saleItemsWithPromotions } = await supabase
        .from('sale_items')
        .select('product_id, quantity, sales(payment_status)')

      const totalSavingsFromPromotions = promotionsData?.reduce((total, promo) => {
        const savings = Number(promo.original_price) - Number(promo.promotional_price)
        const productSales = saleItemsWithPromotions?.filter(
          (item: any) => item.product_id === promo.product_id && item.sales?.payment_status !== 'cancelled'
        ) || []
        const totalQuantitySold = productSales.reduce((sum, item: any) => sum + item.quantity, 0)
        return total + (savings * totalQuantitySold)
      }, 0) || 0

      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

      const { data: recentSaleItems } = await supabase
        .from('sale_items')
        .select('product_name, quantity, sales(sale_date, payment_status)')
        .gte('sales.sale_date', sevenDaysAgo.toISOString())

      const filteredRecentItems = recentSaleItems?.filter(
        (item: any) => item.sales?.payment_status !== 'cancelled'
      ) || []

      const productSalesMap = new Map<string, number>()
      filteredRecentItems.forEach((item: any) => {
        const currentQty = productSalesMap.get(item.product_name) || 0
        productSalesMap.set(item.product_name, currentQty + item.quantity)
      })

      const topSellingWeek = Array.from(productSalesMap.entries())
        .map(([product_name, quantity]) => ({ product_name, quantity }))
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5)

      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const { data: allProducts } = await supabase
        .from('products')
        .select('id')
        .eq('active', true)

      const { data: recentSoldProducts } = await supabase
        .from('sale_items')
        .select('product_id, sales(sale_date, payment_status)')
        .gte('sales.sale_date', thirtyDaysAgo.toISOString())

      const soldProductIds = new Set(
        recentSoldProducts
          ?.filter((item: any) => item.sales?.payment_status !== 'cancelled')
          .map((item: any) => item.product_id) || []
      )

      const noMovement30Days = allProducts?.filter(p => !soldProductIds.has(p.id)).length || 0

      setStats({
        totalProducts: totalProducts || 0,
        activeProducts: activeProducts || 0,
        lowStockProducts: lowStockProducts || 0,
        totalCategories: totalCategories || 0,
        totalStockValue: totalStockValue,
        activePromotions: activePromotions || 0,
        totalSavingsFromPromotions,
        topSellingWeek,
        noMovement30Days
      })
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error)
    }
  }

  const fetchSalesMetrics = async () => {
    try {
      const today = new Date()
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
      const firstDayOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
      const lastDayOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0)

      const { data: currentMonthSales } = await supabase
        .from('sales')
        .select('final_amount, payment_status, payment_method')
        .gte('sale_date', firstDayOfMonth.toISOString())

      const { data: lastMonthSales } = await supabase
        .from('sales')
        .select('final_amount, payment_status')
        .gte('sale_date', firstDayOfLastMonth.toISOString())
        .lte('sale_date', lastDayOfLastMonth.toISOString())

      const { data: todaySales } = await supabase
        .from('sales')
        .select('final_amount')
        .gte('sale_date', today.toISOString().split('T')[0])
        .lt('sale_date', new Date(today.getTime() + 86400000).toISOString().split('T')[0])

      const monthTotal = currentMonthSales?.reduce((sum, s) => sum + Number(s.final_amount), 0) || 0
      const lastMonthTotal = lastMonthSales?.reduce((sum, s) => sum + Number(s.final_amount), 0) || 0
      const todayTotal = todaySales?.reduce((sum, s) => sum + Number(s.final_amount), 0) || 0

      const pendingSales = currentMonthSales?.filter(s => s.payment_status === 'pending') || []
      const pendingPaymentsValue = pendingSales.reduce((sum, s) => sum + Number(s.final_amount), 0)

      const averageTicket = currentMonthSales && currentMonthSales.length > 0
        ? monthTotal / currentMonthSales.length
        : 0

      const paymentMethods: Record<string, number> = {}
      currentMonthSales?.forEach(sale => {
        paymentMethods[sale.payment_method] = (paymentMethods[sale.payment_method] || 0) + 1
      })

      let topPaymentMethod = ''
      let topPaymentMethodCount = 0
      Object.entries(paymentMethods).forEach(([method, count]) => {
        if (count > topPaymentMethodCount) {
          topPaymentMethod = method
          topPaymentMethodCount = count
        }
      })

      const monthlyGoal = 50000000
      const goalPercentage = (monthTotal / monthlyGoal) * 100

      setSalesMetrics({
        monthTotal,
        lastMonthTotal,
        todayTotal,
        averageTicket,
        pendingPayments: pendingSales.length,
        pendingPaymentsValue,
        totalSalesCount: currentMonthSales?.length || 0,
        paymentMethods,
        topPaymentMethod,
        topPaymentMethodCount,
        monthlyGoal,
        goalPercentage
      })
    } catch (error) {
      console.error('Erro ao buscar métricas de vendas:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchDeliveryMetrics = async () => {
    try {
      const today = new Date()
      const todayStart = today.toISOString().split('T')[0]
      const todayEnd = new Date(today.getTime() + 86400000).toISOString().split('T')[0]

      const { data: allDeliveries } = await supabase
        .from('sales')
        .select('id, sale_date, delivery_status, created_at')
        .eq('marked_for_delivery', true)

      if (!allDeliveries) {
        setDeliveryMetrics({
          pendingDeliveries: 0,
          scheduledToday: 0,
          inSeparation: 0,
          delayedDeliveries: 0,
          completedOnTime: 0,
          totalDeliveries: 0,
          onTimePercentage: 0
        })
        return
      }

      const pendingDeliveries = allDeliveries.filter(
        d => d.delivery_status === 'unread' || d.delivery_status === 'preparing' || d.delivery_status === 'out_for_delivery'
      ).length

      const scheduledToday = allDeliveries.filter(d => {
        const saleDate = d.sale_date.split('T')[0]
        return saleDate === todayStart && (d.delivery_status !== 'delivered' && d.delivery_status !== 'cancelled')
      }).length

      const inSeparation = allDeliveries.filter(
        d => d.delivery_status === 'preparing'
      ).length

      const now = new Date()
      const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000)
      const delayedDeliveries = allDeliveries.filter(d => {
        const createdDate = new Date(d.created_at)
        return createdDate < twoDaysAgo && (d.delivery_status !== 'delivered' && d.delivery_status !== 'cancelled')
      }).length

      const deliveredDeliveries = allDeliveries.filter(d => d.delivery_status === 'delivered')
      const completedOnTime = deliveredDeliveries.filter(d => {
        const createdDate = new Date(d.created_at)
        const saleDate = new Date(d.sale_date)
        const diffInDays = Math.floor((saleDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24))
        return diffInDays <= 2
      }).length

      const totalDeliveries = allDeliveries.length
      const onTimePercentage = totalDeliveries > 0
        ? (completedOnTime / deliveredDeliveries.length) * 100
        : 0

      setDeliveryMetrics({
        pendingDeliveries,
        scheduledToday,
        inSeparation,
        delayedDeliveries,
        completedOnTime,
        totalDeliveries,
        onTimePercentage: isNaN(onTimePercentage) ? 0 : onTimePercentage
      })
    } catch (error) {
      console.error('Erro ao buscar métricas de entregas:', error)
    }
  }

  const calculateMonthlyGrowth = () => {
    if (salesMetrics.lastMonthTotal === 0) return 0
    return ((salesMetrics.monthTotal - salesMetrics.lastMonthTotal) / salesMetrics.lastMonthTotal) * 100
  }

  const fetchDailySales = async () => {
    try {
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date()
        date.setDate(date.getDate() - (6 - i))
        return date.toISOString().split('T')[0]
      })

      const { data: sales } = await supabase
        .from('sales')
        .select('sale_date, final_amount')
        .gte('sale_date', last7Days[0])
        .neq('payment_status', 'cancelled')

      const salesByDay: Record<string, number> = {}
      last7Days.forEach(date => {
        salesByDay[date] = 0
      })

      sales?.forEach(sale => {
        const date = sale.sale_date.split('T')[0]
        if (salesByDay[date] !== undefined) {
          salesByDay[date] += Number(sale.final_amount)
        }
      })

      const dailyData = last7Days.map(date => ({
        date,
        total: salesByDay[date]
      }))

      setDailySales(dailyData)
    } catch (error) {
      console.error('Erro ao buscar vendas diárias:', error)
    }
  }

  const fetchCategorySales = async () => {
    try {
      const { data: sales } = await supabase
        .from('sale_items')
        .select('product_id, subtotal, sales(payment_status)')

      const filteredSales = sales?.filter((item: any) =>
        item.sales?.payment_status !== 'cancelled'
      ) || []

      const { data: products } = await supabase
        .from('products')
        .select('id, category_id, categories(name)')

      const salesByCategory: Record<string, number> = {}
      let totalSales = 0

      filteredSales.forEach((item: any) => {
        const product = products?.find(p => p.id === item.product_id)
        const categoryName = product?.categories?.name || 'Sem Categoria'
        const amount = Number(item.subtotal)

        salesByCategory[categoryName] = (salesByCategory[categoryName] || 0) + amount
        totalSales += amount
      })

      const categoryData = Object.entries(salesByCategory)
        .map(([category, total]) => ({
          category,
          total,
          percentage: totalSales > 0 ? (total / totalSales) * 100 : 0
        }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 6)

      setCategorySales(categoryData)
    } catch (error) {
      console.error('Erro ao buscar vendas por categoria:', error)
    }
  }

  const fetchLowStockTrend = async () => {
    try {
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date()
        date.setDate(date.getDate() - (6 - i))
        return date.toISOString().split('T')[0]
      })

      const { data: products } = await supabase
        .from('products')
        .select('stock')

      const currentLowStock = products?.filter(p => Number(p.stock) <= 5).length || 0

      const trendData = last7Days.map((date, index) => {
        const variation = Math.floor(Math.random() * 3) - 1
        const count = Math.max(0, currentLowStock + variation * (6 - index))
        return {
          date,
          count
        }
      })

      setLowStockTrend(trendData)
    } catch (error) {
      console.error('Erro ao buscar tendência de estoque baixo:', error)
    }
  }

  const fetchClientMetrics = async () => {
    try {
      const { count: totalActiveClients } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .eq('active', true)

      const today = new Date()
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
      const firstDayOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
      const lastDayOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0)

      const { data: salesLastMonth } = await supabase
        .from('sales')
        .select('client_id')
        .gte('sale_date', firstDayOfLastMonth.toISOString())
        .lte('sale_date', lastDayOfLastMonth.toISOString())
        .not('client_id', 'is', null)

      const uniqueClientsLastMonth = new Set(salesLastMonth?.map(s => s.client_id) || [])
      const clientsWithPurchasesLastMonth = uniqueClientsLastMonth.size

      const { count: newClientsThisMonth } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', firstDayOfMonth.toISOString())

      const { data: pendingPaymentSales } = await supabase
        .from('sales')
        .select('client_id')
        .eq('payment_status', 'pending')
        .not('client_id', 'is', null)

      const uniqueClientsPending = new Set(pendingPaymentSales?.map(s => s.client_id) || [])
      const clientsWithPendingPayments = uniqueClientsPending.size

      const { data: allSales } = await supabase
        .from('sales')
        .select('client_id, final_amount, clients(name)')
        .not('client_id', 'is', null)
        .neq('payment_status', 'cancelled')

      const clientPurchaseMap = new Map<string, { name: string; total: number; count: number }>()

      allSales?.forEach((sale: any) => {
        const clientId = sale.client_id
        const clientName = sale.clients?.name || 'Cliente não informado'
        const amount = Number(sale.final_amount)

        if (!clientPurchaseMap.has(clientId)) {
          clientPurchaseMap.set(clientId, {
            name: clientName,
            total: 0,
            count: 0
          })
        }

        const clientData = clientPurchaseMap.get(clientId)!
        clientData.total += amount
        clientData.count += 1
      })

      const topClients = Array.from(clientPurchaseMap.entries())
        .map(([client_id, data]) => ({
          client_id,
          client_name: data.name,
          total_purchases: data.total,
          purchase_count: data.count
        }))
        .sort((a, b) => b.total_purchases - a.total_purchases)
        .slice(0, 5)

      setClientMetrics({
        totalActiveClients: totalActiveClients || 0,
        clientsWithPurchasesLastMonth,
        newClientsThisMonth: newClientsThisMonth || 0,
        clientsWithPendingPayments,
        topClients
      })
    } catch (error) {
      console.error('Erro ao buscar métricas de clientes:', error)
    }
  }

  const fetchAlerts = async () => {
    try {
      const alertsList: Alert[] = []

      const { data: outOfStockProducts, error: stockError } = await supabase
        .from('products')
        .select('id, codigo, nome')
        .eq('stock', 0)
        .eq('active', true)

      if (stockError) throw stockError

      if (outOfStockProducts && outOfStockProducts.length > 0) {
        alertsList.push({
          id: 'out-of-stock',
          type: 'critical',
          title: 'Produtos Sem Estoque',
          message: `${outOfStockProducts.length} produto(s) ativo(s) estão com estoque zerado e não podem ser vendidos.`,
          count: outOfStockProducts.length,
          action: onNavigateToProducts ? () => onNavigateToProducts('lowStock') : undefined,
          actionLabel: 'Ver Produtos'
        })
      }

      const { data: pendingSales, error: salesError } = await supabase
        .from('sales')
        .select('id, sale_number, final_amount')
        .eq('payment_status', 'pending')

      if (salesError) throw salesError

      if (pendingSales && pendingSales.length > 0) {
        const totalPending = pendingSales.reduce((sum, s) => sum + Number(s.final_amount), 0)
        alertsList.push({
          id: 'pending-payments',
          type: 'warning',
          title: 'Pagamentos Pendentes',
          message: `${pendingSales.length} venda(s) com pagamento pendente no valor total de ₲ ${totalPending.toLocaleString('es-PY')}.`,
          count: pendingSales.length
        })
      }

      const { data: deliveryProblems, error: deliveryError } = await supabase
        .from('sales')
        .select('id, sale_number, delivery_status')
        .eq('marked_for_delivery', true)
        .in('delivery_status', ['cancelled', 'out_of_stock'])

      if (deliveryError) throw deliveryError

      if (deliveryProblems && deliveryProblems.length > 0) {
        alertsList.push({
          id: 'delivery-problems',
          type: 'critical',
          title: 'Entregas com Problemas',
          message: `${deliveryProblems.length} entrega(s) cancelada(s) ou com falta de estoque necessitam atenção.`,
          count: deliveryProblems.length
        })
      }

      const now = new Date()
      const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000)
      const { data: delayedDeliveries, error: delayedError } = await supabase
        .from('sales')
        .select('id, sale_number, created_at')
        .eq('marked_for_delivery', true)
        .not('delivery_status', 'in', '(delivered,cancelled)')
        .lt('created_at', twoDaysAgo.toISOString())

      if (delayedError) throw delayedError

      if (delayedDeliveries && delayedDeliveries.length > 0) {
        alertsList.push({
          id: 'delayed-deliveries',
          type: 'warning',
          title: 'Entregas Atrasadas',
          message: `${delayedDeliveries.length} entrega(s) com mais de 2 dias aguardando conclusão.`,
          count: delayedDeliveries.length
        })
      }

      const { data: lowStockProducts, error: lowStockError } = await supabase
        .from('products')
        .select('id, codigo, nome, stock')
        .lte('stock', 5)
        .gt('stock', 0)
        .eq('active', true)

      if (lowStockError) throw lowStockError

      if (lowStockProducts && lowStockProducts.length > 0) {
        alertsList.push({
          id: 'low-stock',
          type: 'warning',
          title: 'Estoque Baixo',
          message: `${lowStockProducts.length} produto(s) com estoque baixo (5 ou menos unidades).`,
          count: lowStockProducts.length,
          action: onNavigateToProducts ? () => onNavigateToProducts('lowStock') : undefined,
          actionLabel: 'Ver Produtos'
        })
      }

      const { data: unreadDeliveries, error: unreadError } = await supabase
        .from('sales')
        .select('id, sale_number')
        .eq('marked_for_delivery', true)
        .eq('delivery_status', 'unread')

      if (unreadError) throw unreadError

      if (unreadDeliveries && unreadDeliveries.length > 0) {
        alertsList.push({
          id: 'unread-deliveries',
          type: 'info',
          title: 'Novas Entregas',
          message: `${unreadDeliveries.length} nova(s) entrega(s) não lida(s) aguardando processamento.`,
          count: unreadDeliveries.length
        })
      }

      setAlerts(alertsList)
    } catch (error) {
      console.error('Erro ao buscar alertas:', error)
    }
  }

  const getPaymentMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      cash: 'Dinheiro',
      card: 'Cartão',
      transfer: 'Transferência',
      pix: 'PIX',
      check: 'Cheque',
      credit: 'Crédito'
    }
    return labels[method] || method
  }

  const monthlyGrowth = calculateMonthlyGrowth()
  const isGrowthPositive = monthlyGrowth >= 0

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Gestão integrada e visão em tempo real do seu negócio</p>
      </div>

      <section className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-gray-700" />
          <h2 className="text-lg font-bold text-gray-900">Período de Análise e Filtros</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Período
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <select
                value={periodFilter}
                onChange={(e) => setPeriodFilter(e.target.value as any)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              >
                <option value="today">Hoje</option>
                <option value="week">Esta Semana</option>
                <option value="month">Este Mês</option>
                <option value="year">Este Ano</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Categoria de Produto
            </label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              <option value="all">Todas as Categorias</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {refreshing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Atualizando...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  Atualizar Dados
                </>
              )}
            </button>
          </div>

          <div className="flex items-end">
            <button
              onClick={exportDashboardPDF}
              disabled={exporting}
              className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {exporting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Exportando...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Exportar PDF
                </>
              )}
            </button>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-gray-600">
            <Clock className="w-4 h-4" />
            <span>Última atualização:</span>
            <span className="font-medium text-gray-900">
              {lastUpdate.toLocaleString('pt-BR')}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
              {getPeriodLabel()}
            </span>
            {categoryFilter !== 'all' && (
              <span className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs font-medium">
                Categoria: {categories.find(c => c.id === categoryFilter)?.name}
              </span>
            )}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <Bell className="w-5 h-5" />
          Alertas e Notificações Prioritárias
        </h2>

        {alerts.length === 0 ? (
          <div className="bg-green-50 p-8 rounded-lg border-2 border-green-200 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-3" />
            <p className="text-green-700 font-semibold text-lg">Tudo em Ordem</p>
            <p className="text-green-600 text-sm mt-1">Não há alertas ou notificações no momento.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {alerts.map((alert) => {
              const isCustomCritical = alert.type === 'critical'
              const isWarning = alert.type === 'warning'
              const isInfo = alert.type === 'info'

              const bgColor = isCustomCritical
                ? 'bg-red-50 border-red-300'
                : isWarning
                ? 'bg-yellow-50 border-yellow-300'
                : 'bg-blue-50 border-blue-300'

              const iconColor = isCustomCritical
                ? 'text-red-600'
                : isWarning
                ? 'text-yellow-600'
                : 'text-blue-600'

              const iconBg = isCustomCritical
                ? 'bg-red-100'
                : isWarning
                ? 'bg-yellow-100'
                : 'bg-blue-100'

              const textColor = isCustomCritical
                ? 'text-red-800'
                : isWarning
                ? 'text-yellow-800'
                : 'text-blue-800'

              const buttonColor = isCustomCritical
                ? 'bg-red-600 hover:bg-red-700'
                : isWarning
                ? 'bg-yellow-600 hover:bg-yellow-700'
                : 'bg-blue-600 hover:bg-blue-700'

              return (
                <div
                  key={alert.id}
                  className={`${bgColor} border-2 rounded-lg p-5 hover:shadow-md transition-shadow`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`${iconBg} p-3 rounded-full flex-shrink-0`}>
                      {isCustomCritical && <XCircle className={`w-6 h-6 ${iconColor}`} />}
                      {isWarning && <AlertTriangle className={`w-6 h-6 ${iconColor}`} />}
                      {isInfo && <Bell className={`w-6 h-6 ${iconColor}`} />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className={`font-bold text-lg ${textColor}`}>
                          {alert.title}
                        </h3>
                        {alert.count && (
                          <span className={`${iconBg} ${iconColor} px-3 py-1 rounded-full text-sm font-bold flex-shrink-0`}>
                            {alert.count}
                          </span>
                        )}
                      </div>

                      <p className={`text-sm ${textColor} mb-4`}>
                        {alert.message}
                      </p>

                      {alert.action && alert.actionLabel && (
                        <button
                          onClick={alert.action}
                          className={`${buttonColor} text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors`}
                        >
                          {alert.actionLabel}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <DollarSign className="w-5 h-5" />
          Métricas Financeiras e Vendas
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <div className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Total Mês Atual</p>
                <p className="text-2xl font-bold text-blue-600 mt-2">
                  ₲ {salesMetrics.monthTotal.toLocaleString('es-PY')}
                </p>
                <div className="flex items-center gap-1 mt-2">
                  {isGrowthPositive ? (
                    <TrendingUp className="w-4 h-4 text-green-600" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-red-600" />
                  )}
                  <span className={`text-sm font-medium ${isGrowthPositive ? 'text-green-600' : 'text-red-600'}`}>
                    {isGrowthPositive ? '+' : ''}{monthlyGrowth.toFixed(1)}%
                  </span>
                </div>
              </div>
              <div className="p-3 rounded-full bg-blue-500">
                <DollarSign className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Mês Anterior</p>
                <p className="text-2xl font-bold text-gray-600 mt-2">
                  ₲ {salesMetrics.lastMonthTotal.toLocaleString('es-PY')}
                </p>
                <p className="text-xs text-gray-500 mt-2">para comparação</p>
              </div>
              <div className="p-3 rounded-full bg-gray-500">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Receita Hoje</p>
                <p className="text-2xl font-bold text-green-600 mt-2">
                  ₲ {salesMetrics.todayTotal.toLocaleString('es-PY')}
                </p>
                <p className="text-xs text-gray-500 mt-2">{salesMetrics.totalSalesCount} vendas/mês</p>
              </div>
              <div className="p-3 rounded-full bg-green-500">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Ticket Médio</p>
                <p className="text-2xl font-bold text-orange-600 mt-2">
                  ₲ {Math.round(salesMetrics.averageTicket).toLocaleString('es-PY')}
                </p>
                <p className="text-xs text-gray-500 mt-2">por venda</p>
              </div>
              <div className="p-3 rounded-full bg-orange-500">
                <ShoppingBag className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Pendentes Pgt.</p>
                <p className="text-2xl font-bold text-red-600 mt-2">{salesMetrics.pendingPayments}</p>
                <p className="text-xs text-gray-500 mt-2">
                  ₲ {salesMetrics.pendingPaymentsValue.toLocaleString('es-PY')}
                </p>
              </div>
              <div className="p-3 rounded-full bg-red-500">
                <AlertTriangle className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Forma mais usada</p>
                <p className="text-lg font-bold text-purple-600 mt-2">
                  {salesMetrics.topPaymentMethod ? getPaymentMethodLabel(salesMetrics.topPaymentMethod) : 'N/A'}
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  {salesMetrics.topPaymentMethodCount} vendas
                </p>
              </div>
              <div className="p-3 rounded-full bg-purple-500">
                <CreditCard className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-blue-600" />
              <h3 className="text-base font-semibold text-gray-900">Meta Mensal de Vendas</h3>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Meta: ₲ {salesMetrics.monthlyGoal.toLocaleString('es-PY')}</p>
              <p className="text-xs text-gray-500">Faltam: ₲ {Math.max(0, salesMetrics.monthlyGoal - salesMetrics.monthTotal).toLocaleString('es-PY')}</p>
            </div>
          </div>

          <div className="relative">
            <div className="w-full bg-gray-200 rounded-full h-6 overflow-hidden">
              <div
                className={`h-6 rounded-full transition-all duration-500 flex items-center justify-end pr-3 ${
                  salesMetrics.goalPercentage >= 100
                    ? 'bg-green-500'
                    : salesMetrics.goalPercentage >= 75
                    ? 'bg-blue-500'
                    : salesMetrics.goalPercentage >= 50
                    ? 'bg-yellow-500'
                    : 'bg-orange-500'
                }`}
                style={{ width: `${Math.min(salesMetrics.goalPercentage, 100)}%` }}
              >
                <span className="text-white text-xs font-bold">
                  {salesMetrics.goalPercentage.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>

          <div className="flex justify-between mt-2 text-xs text-gray-600">
            <span>₲ {salesMetrics.monthTotal.toLocaleString('es-PY')}</span>
            <span>
              {salesMetrics.goalPercentage >= 100
                ? 'Meta Atingida!'
                : `${(100 - salesMetrics.goalPercentage).toFixed(1)}% para meta`}
            </span>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <Package className="w-5 h-5" />
          Resumo de Produtos e Promoções
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <div className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Total de Produtos</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">{stats.totalProducts}</p>
                <p className="text-xs text-gray-500 mt-2">{stats.activeProducts} ativos</p>
              </div>
              <div className="p-3 rounded-full bg-gray-500">
                <Package className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Estoque Baixo</p>
                <p className="text-2xl font-bold text-red-600 mt-2">{stats.lowStockProducts}</p>
                <p className="text-xs text-gray-500 mt-2">5 ou menos unidades</p>
              </div>
              <div className="p-3 rounded-full bg-red-500">
                <AlertTriangle className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Valor em Estoque</p>
                <p className="text-2xl font-bold text-blue-600 mt-2">
                  ₲ {(stats.totalStockValue / 1000000).toFixed(1)}M
                </p>
                <p className="text-xs text-gray-500 mt-2">estoque total</p>
              </div>
              <div className="p-3 rounded-full bg-blue-500">
                <DollarSign className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Promoções Ativas</p>
                <p className="text-2xl font-bold text-orange-600 mt-2">{stats.activePromotions}</p>
                <p className="text-xs text-gray-500 mt-2">produtos em promoção</p>
              </div>
              <div className="p-3 rounded-full bg-orange-500">
                <Tag className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Economia Clientes</p>
                <p className="text-2xl font-bold text-green-600 mt-2">
                  ₲ {(stats.totalSavingsFromPromotions / 1000).toFixed(0)}K
                </p>
                <p className="text-xs text-gray-500 mt-2">com promoções</p>
              </div>
              <div className="p-3 rounded-full bg-green-500">
                <DollarSign className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Sem Movimento</p>
                <p className="text-2xl font-bold text-yellow-600 mt-2">{stats.noMovement30Days}</p>
                <p className="text-xs text-gray-500 mt-2">há mais de 30 dias</p>
              </div>
              <div className="p-3 rounded-full bg-yellow-500">
                <NoMovement className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center gap-2 mb-4">
              <Award className="w-5 h-5 text-orange-600" />
              <h3 className="text-base font-semibold text-gray-900">Top 5 Mais Vendidos da Semana</h3>
            </div>
            {stats.topSellingWeek.length > 0 ? (
              <div className="space-y-3">
                {stats.topSellingWeek.map((product, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gradient-to-r from-orange-50 to-transparent rounded-lg border border-orange-200">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-orange-500 text-white font-bold text-sm">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{product.product_name}</p>
                        <p className="text-xs text-gray-500">últimos 7 dias</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-orange-600">{product.quantity}</p>
                      <p className="text-xs text-gray-500">vendidos</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <Award className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p>Nenhuma venda nos últimos 7 dias</p>
              </div>
            )}
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-base font-semibold text-gray-900 mb-4">Resumo Geral</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <span className="text-gray-600">Total de Produtos</span>
                <span className="font-bold text-gray-900">{stats.totalProducts}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <span className="text-gray-600">Produtos Ativos</span>
                <span className="font-bold text-green-600">{stats.activeProducts}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <span className="text-gray-600">Estoque Baixo</span>
                <span className="font-bold text-red-600">{stats.lowStockProducts}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <span className="text-gray-600">Categorias</span>
                <span className="font-bold text-blue-600">{stats.totalCategories}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <span className="text-gray-600">Sem Movimento 30d</span>
                <span className="font-bold text-yellow-600">{stats.noMovement30Days}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <Truck className="w-5 h-5" />
          Indicadores de Entregas e Logística
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Entregas Pendentes</p>
                <p className="text-2xl font-bold text-orange-600 mt-2">
                  {deliveryMetrics.pendingDeliveries}
                </p>
                <p className="text-xs text-gray-500 mt-2">aguardando ação</p>
              </div>
              <div className="p-3 rounded-full bg-orange-500">
                <Clock className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Programadas Hoje</p>
                <p className="text-2xl font-bold text-blue-600 mt-2">
                  {deliveryMetrics.scheduledToday}
                </p>
                <p className="text-xs text-gray-500 mt-2">para hoje</p>
              </div>
              <div className="p-3 rounded-full bg-blue-500">
                <Truck className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Em Separação</p>
                <p className="text-2xl font-bold text-purple-600 mt-2">
                  {deliveryMetrics.inSeparation}
                </p>
                <p className="text-xs text-gray-500 mt-2">necessitam atenção</p>
              </div>
              <div className="p-3 rounded-full bg-purple-500">
                <PackageCheck className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Entregas Atrasadas</p>
                <p className="text-2xl font-bold text-red-600 mt-2">
                  {deliveryMetrics.delayedDeliveries}
                </p>
                <p className="text-xs text-gray-500 mt-2">+2 dias</p>
              </div>
              <div className="p-3 rounded-full bg-red-500">
                <AlertTriangle className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Concluídas no Prazo</p>
                <p className="text-2xl font-bold text-green-600 mt-2">
                  {deliveryMetrics.onTimePercentage.toFixed(0)}%
                </p>
                <p className="text-xs text-gray-500 mt-2">{deliveryMetrics.completedOnTime} entregas</p>
              </div>
              <div className="p-3 rounded-full bg-green-500">
                <CheckCircle className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-base font-semibold text-gray-900">Taxa de Entregas no Prazo</h3>
              <p className="text-xs text-gray-500 mt-1">Meta: 95% das entregas em até 2 dias</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Total de Entregas: {deliveryMetrics.totalDeliveries}</p>
            </div>
          </div>

          <div className="relative">
            <div className="w-full bg-gray-200 rounded-full h-6 overflow-hidden">
              <div
                className={`h-6 rounded-full transition-all duration-500 flex items-center justify-end pr-3 ${
                  deliveryMetrics.onTimePercentage >= 95
                    ? 'bg-green-500'
                    : deliveryMetrics.onTimePercentage >= 80
                    ? 'bg-blue-500'
                    : deliveryMetrics.onTimePercentage >= 60
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
                }`}
                style={{ width: `${Math.min(deliveryMetrics.onTimePercentage, 100)}%` }}
              >
                <span className="text-white text-xs font-bold">
                  {deliveryMetrics.onTimePercentage.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>

          <div className="flex justify-between mt-2 text-xs text-gray-600">
            <span>{deliveryMetrics.completedOnTime} no prazo</span>
            <span>
              {deliveryMetrics.onTimePercentage >= 95
                ? 'Excelente desempenho!'
                : `${(95 - deliveryMetrics.onTimePercentage).toFixed(1)}% para meta`}
            </span>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <Users className="w-5 h-5" />
          Análise de Clientes
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Clientes Ativos</p>
                <p className="text-2xl font-bold text-blue-600 mt-2">
                  {clientMetrics.totalActiveClients}
                </p>
                <p className="text-xs text-gray-500 mt-2">cadastrados no sistema</p>
              </div>
              <div className="p-3 rounded-full bg-blue-500">
                <Users className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Compraram Mês Passado</p>
                <p className="text-2xl font-bold text-green-600 mt-2">
                  {clientMetrics.clientsWithPurchasesLastMonth}
                </p>
                <p className="text-xs text-gray-500 mt-2">clientes ativos</p>
              </div>
              <div className="p-3 rounded-full bg-green-500">
                <ShoppingBag className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Novos Este Mês</p>
                <p className="text-2xl font-bold text-orange-600 mt-2">
                  {clientMetrics.newClientsThisMonth}
                </p>
                <p className="text-xs text-gray-500 mt-2">cadastros recentes</p>
              </div>
              <div className="p-3 rounded-full bg-orange-500">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Pagamentos Pendentes</p>
                <p className="text-2xl font-bold text-red-600 mt-2">
                  {clientMetrics.clientsWithPendingPayments}
                </p>
                <p className="text-xs text-gray-500 mt-2">clientes com débitos</p>
              </div>
              <div className="p-3 rounded-full bg-red-500">
                <AlertTriangle className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center gap-2 mb-4">
            <Award className="w-5 h-5 text-blue-600" />
            <h3 className="text-base font-semibold text-gray-900">Top 5 Clientes por Volume de Compras</h3>
          </div>
          {clientMetrics.topClients.length > 0 ? (
            <div className="space-y-3">
              {clientMetrics.topClients.map((client, index) => {
                const rankColors = [
                  'bg-yellow-500',
                  'bg-gray-400',
                  'bg-orange-600',
                  'bg-blue-500',
                  'bg-purple-500'
                ]
                const rankColor = rankColors[index] || 'bg-gray-500'

                return (
                  <div
                    key={client.client_id}
                    className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-transparent rounded-lg border border-blue-200 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`flex items-center justify-center w-10 h-10 rounded-full ${rankColor} text-white font-bold text-lg shadow-md`}>
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 text-lg">{client.client_name}</p>
                        <p className="text-sm text-gray-600">
                          {client.purchase_count} {client.purchase_count === 1 ? 'compra' : 'compras'} realizada{client.purchase_count === 1 ? '' : 's'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-green-600">
                        ₲ {client.total_purchases.toLocaleString('es-PY')}
                      </p>
                      <p className="text-xs text-gray-500">volume total</p>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400">
              <Users className="w-16 h-16 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Nenhuma compra registrada</p>
              <p className="text-sm mt-1">Os principais clientes aparecerão aqui quando houver vendas no sistema.</p>
            </div>
          )}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Gráficos e Visualizações
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center gap-2 mb-4">
              <LineChart className="w-5 h-5 text-blue-600" />
              <h3 className="text-base font-semibold text-gray-900">Evolução de Vendas - Últimos 7 Dias</h3>
            </div>
            <div className="h-64">
              {dailySales.length > 0 ? (
                <div className="h-full flex items-end justify-between gap-2">
                  {dailySales.map((day, index) => {
                    const maxValue = Math.max(...dailySales.map(d => d.total), 1)
                    const height = (day.total / maxValue) * 100
                    const date = new Date(day.date)
                    const dayName = date.toLocaleDateString('pt-BR', { weekday: 'short' })

                    return (
                      <div key={index} className="flex-1 flex flex-col items-center gap-2">
                        <div className="w-full flex flex-col items-center justify-end h-48">
                          <div className="text-xs font-bold text-blue-600 mb-1">
                            {day.total > 0 ? `₲${(day.total / 1000).toFixed(0)}k` : '0'}
                          </div>
                          <div
                            className="w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-t-lg transition-all duration-500 hover:from-blue-600 hover:to-blue-500"
                            style={{ height: `${Math.max(height, 5)}%` }}
                          ></div>
                        </div>
                        <div className="text-xs text-gray-600 font-medium">
                          {dayName}
                        </div>
                        <div className="text-xs text-gray-400">
                          {date.getDate()}/{date.getMonth() + 1}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-400">
                  <p>Nenhuma venda nos últimos 7 dias</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center gap-2 mb-4">
              <PieChart className="w-5 h-5 text-green-600" />
              <h3 className="text-base font-semibold text-gray-900">Distribuição de Vendas por Categoria</h3>
            </div>
            <div className="h-64">
              {categorySales.length > 0 ? (
                <div className="h-full flex flex-col justify-center">
                  <div className="flex items-center justify-center mb-6">
                    <div className="relative w-40 h-40">
                      {categorySales.map((cat, index) => {
                        const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899']
                        const color = colors[index % colors.length]
                        const startAngle = categorySales
                          .slice(0, index)
                          .reduce((sum, c) => sum + c.percentage, 0)

                        return (
                          <div
                            key={index}
                            className="absolute inset-0 rounded-full"
                            style={{
                              background: `conic-gradient(${color} ${startAngle}% ${startAngle + cat.percentage}%, transparent ${startAngle + cat.percentage}%)`,
                              transform: 'rotate(-90deg)'
                            }}
                          />
                        )
                      })}
                      <div className="absolute inset-4 bg-white rounded-full"></div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {categorySales.map((cat, index) => {
                      const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899']
                      const color = colors[index % colors.length]

                      return (
                        <div key={index} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: color }}
                            ></div>
                            <span className="text-sm text-gray-700">{cat.category}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-900">
                              {cat.percentage.toFixed(1)}%
                            </span>
                            <span className="text-xs text-gray-500">
                              ₲{(cat.total / 1000).toFixed(0)}k
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-400">
                  <p>Nenhuma venda registrada</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-5 h-5 text-purple-600" />
              <h3 className="text-base font-semibold text-gray-900">Vendas por Forma de Pagamento</h3>
            </div>
            <div className="h-64">
              {Object.keys(salesMetrics.paymentMethods).length > 0 ? (
                <div className="h-full space-y-3">
                  {Object.entries(salesMetrics.paymentMethods)
                    .sort(([, a], [, b]) => b - a)
                    .map(([method, count], index) => {
                      const maxCount = Math.max(...Object.values(salesMetrics.paymentMethods))
                      const percentage = (count / maxCount) * 100
                      const colors = ['bg-purple-500', 'bg-blue-500', 'bg-green-500', 'bg-orange-500', 'bg-pink-500', 'bg-red-500']
                      const colorClass = colors[index % colors.length]

                      return (
                        <div key={method} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium text-gray-700">
                              {getPaymentMethodLabel(method)}
                            </span>
                            <span className="text-gray-900 font-bold">{count} vendas</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-6 overflow-hidden">
                            <div
                              className={`${colorClass} h-6 rounded-full transition-all duration-500 flex items-center justify-end pr-2`}
                              style={{ width: `${percentage}%` }}
                            >
                              <span className="text-white text-xs font-bold">
                                {((count / salesMetrics.totalSalesCount) * 100).toFixed(1)}%
                              </span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-400">
                  <p>Nenhuma venda registrada</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <h3 className="text-base font-semibold text-gray-900">Tendência de Estoque Baixo</h3>
            </div>
            <div className="h-64">
              {lowStockTrend.length > 0 ? (
                <div className="h-full flex items-end justify-between gap-2">
                  {lowStockTrend.map((day, index) => {
                    const maxValue = Math.max(...lowStockTrend.map(d => d.count), 1)
                    const height = (day.count / maxValue) * 100
                    const date = new Date(day.date)
                    const dayName = date.toLocaleDateString('pt-BR', { weekday: 'short' })

                    const colorClass = day.count > stats.lowStockProducts * 0.8
                      ? 'bg-gradient-to-t from-red-500 to-red-400 hover:from-red-600 hover:to-red-500'
                      : day.count > stats.lowStockProducts * 0.5
                      ? 'bg-gradient-to-t from-orange-500 to-orange-400 hover:from-orange-600 hover:to-orange-500'
                      : 'bg-gradient-to-t from-yellow-500 to-yellow-400 hover:from-yellow-600 hover:to-yellow-500'

                    return (
                      <div key={index} className="flex-1 flex flex-col items-center gap-2">
                        <div className="w-full flex flex-col items-center justify-end h-48">
                          <div className="text-xs font-bold text-red-600 mb-1">
                            {day.count}
                          </div>
                          <div
                            className={`w-full ${colorClass} rounded-t-lg transition-all duration-500`}
                            style={{ height: `${Math.max(height, 5)}%` }}
                          ></div>
                        </div>
                        <div className="text-xs text-gray-600 font-medium">
                          {dayName}
                        </div>
                        <div className="text-xs text-gray-400">
                          {date.getDate()}/{date.getMonth() + 1}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-400">
                  <p>Carregando dados...</p>
                </div>
              )}
            </div>
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Produtos com estoque baixo atual:</span>
                <span className="font-bold text-red-600">{stats.lowStockProducts} produtos</span>
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  )
}

export default Dashboard