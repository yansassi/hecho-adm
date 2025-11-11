import React, { useState, useEffect } from 'react'
import { TrendingUp, Package, DollarSign } from 'lucide-react'
import { supabase, ProductWithCategory } from '../lib/supabase'

interface ProductSalesData {
  product_id: string
  product_code: string
  product_name: string
  total_quantity: number
  total_revenue: number
  sale_count: number
  product?: ProductWithCategory
}

const BestSellersByData: React.FC = () => {
  const [salesData, setSalesData] = useState<ProductSalesData[]>([])
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState<'7days' | '30days' | 'all'>('30days')

  useEffect(() => {
    fetchSalesData()
  }, [dateRange])

  const fetchSalesData = async () => {
    try {
      setLoading(true)

      let query = supabase
        .from('sale_items')
        .select('product_id, product_code, product_name, quantity, unit_price, sales(sale_date, payment_status)')

      if (dateRange !== 'all') {
        const daysAgo = dateRange === '7days' ? 7 : 30
        const startDate = new Date()
        startDate.setDate(startDate.getDate() - daysAgo)

        query = query.gte('sales.sale_date', startDate.toISOString())
      }

      const { data: saleItems, error } = await query

      if (error) throw error

      const filteredItems = (saleItems || []).filter(
        (item: any) => item.sales?.payment_status !== 'cancelled'
      )

      const productMap = new Map<string, ProductSalesData>()

      filteredItems.forEach((item: any) => {
        const productId = item.product_id

        if (!productMap.has(productId)) {
          productMap.set(productId, {
            product_id: productId,
            product_code: item.product_code,
            product_name: item.product_name,
            total_quantity: 0,
            total_revenue: 0,
            sale_count: 0
          })
        }

        const productData = productMap.get(productId)!
        productData.total_quantity += item.quantity
        productData.total_revenue += item.quantity * item.unit_price
        productData.sale_count += 1
      })

      const sortedData = Array.from(productMap.values()).sort(
        (a, b) => b.total_quantity - a.total_quantity
      )

      for (const item of sortedData) {
        const { data: product } = await supabase
          .from('products')
          .select('*, categories(id, name, description)')
          .eq('id', item.product_id)
          .maybeSingle()

        if (product) {
          item.product = {
            ...product,
            categories: product.categories as any
          }
        }
      }

      setSalesData(sortedData)
    } catch (error) {
      console.error('Erro ao buscar dados de vendas:', error)
    } finally {
      setLoading(false)
    }
  }

  const getTotalQuantity = () => {
    return salesData.reduce((sum, item) => sum + item.total_quantity, 0)
  }

  const getTotalRevenue = () => {
    return salesData.reduce((sum, item) => sum + item.total_revenue, 0)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <p className="text-sm text-gray-600">
            Ranking baseado nas vendas realizadas no sistema
          </p>
        </div>
        <div>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="7days">Últimos 7 dias</option>
            <option value="30days">Últimos 30 dias</option>
            <option value="all">Todo o período</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-lg border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Produtos Vendidos</p>
              <p className="text-2xl font-bold text-blue-600 mt-2">{salesData.length}</p>
            </div>
            <div className="p-3 rounded-full bg-blue-500">
              <Package className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Unidades Vendidas</p>
              <p className="text-2xl font-bold text-green-600 mt-2">{getTotalQuantity()}</p>
            </div>
            <div className="p-3 rounded-full bg-green-500">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Receita Total</p>
              <p className="text-2xl font-bold text-orange-600 mt-2">
                ₲ {getTotalRevenue().toLocaleString('es-PY')}
              </p>
            </div>
            <div className="p-3 rounded-full bg-orange-500">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {salesData.length === 0 ? (
        <div className="bg-white rounded-lg border p-12 text-center">
          <TrendingUp className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 text-lg mb-2">Nenhuma venda registrada</p>
          <p className="text-gray-500 text-sm">
            Os produtos mais vendidos aparecerão aqui quando houver vendas registradas no sistema.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-3 px-6 font-medium text-gray-900">Ranking</th>
                  <th className="text-left py-3 px-6 font-medium text-gray-900">Código</th>
                  <th className="text-left py-3 px-6 font-medium text-gray-900">Produto</th>
                  <th className="text-center py-3 px-6 font-medium text-gray-900">Qtd. Vendida</th>
                  <th className="text-center py-3 px-6 font-medium text-gray-900">Nº Vendas</th>
                  <th className="text-right py-3 px-6 font-medium text-gray-900">Receita Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {salesData.map((item, index) => {
                  const rankingColor =
                    index === 0 ? 'bg-yellow-500' :
                    index === 1 ? 'bg-gray-400' :
                    index === 2 ? 'bg-orange-600' :
                    'bg-blue-500'

                  return (
                    <tr key={item.product_id} className="hover:bg-gray-50">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-full ${rankingColor} flex items-center justify-center`}
                          >
                            <span className="text-white font-bold text-sm">
                              {index + 1}
                            </span>
                          </div>
                          {index < 3 && (
                            <TrendingUp className="w-5 h-5 text-orange-500" />
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className="font-mono text-sm text-gray-900">
                          {item.product_code}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          {item.product?.image_url && (
                            <img
                              src={item.product.image_url}
                              alt={item.product_name}
                              className="w-12 h-12 rounded-lg object-cover"
                            />
                          )}
                          <div>
                            <p className="font-medium text-gray-900">{item.product_name}</p>
                            {item.product?.categories && (
                              <p className="text-xs text-gray-500">{item.product.categories.name}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <span className="font-bold text-lg text-blue-600">
                          {item.total_quantity}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <span className="text-gray-900">{item.sale_count}</span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <span className="font-bold text-green-600">
                          ₲ {item.total_revenue.toLocaleString('es-PY')}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export default BestSellersByData
