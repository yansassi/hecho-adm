import React, { useState, useEffect } from 'react'
import { Plus, Eye, Trash2, Search, DollarSign, Calendar, User, Truck, TruckIcon, Edit } from 'lucide-react'
import { supabase } from '../lib/supabase'
import SaleForm from './SaleForm'
import SaleEditForm from './SaleEditForm'

interface Client {
  id: string
  name: string
  email: string
  phone: string
  ruc: string
}

interface Sale {
  id: string
  sale_number: string
  client_id: string
  sale_date: string
  total_amount: number
  discount_amount: number
  final_amount: number
  payment_method: string
  payment_status: string
  notes: string
  marked_for_delivery: boolean
  delivery_status: string
  created_at: string
  updated_at: string
  clients?: Client
}

const Sales: React.FC = () => {
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterPaymentStatus, setFilterPaymentStatus] = useState<'all' | 'pending' | 'paid' | 'cancelled'>('all')
  const [showForm, setShowForm] = useState(false)
  const [viewingSale, setViewingSale] = useState<Sale | null>(null)
  const [editingSale, setEditingSale] = useState<Sale | null>(null)

  useEffect(() => {
    fetchSales()
  }, [])

  const fetchSales = async () => {
    try {
      const { data, error } = await supabase
        .from('sales')
        .select('*, clients(id, name, email, phone, ruc)')
        .order('created_at', { ascending: false })

      if (error) throw error
      setSales(data || [])
    } catch (error) {
      console.error('Erro ao buscar vendas:', error)
    } finally {
      setLoading(false)
    }
  }

  const deleteSale = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta venda?')) return

    try {
      const { error } = await supabase
        .from('sales')
        .delete()
        .eq('id', id)

      if (error) throw error
      await fetchSales()
    } catch (error) {
      console.error('Erro ao excluir venda:', error)
      alert('Erro ao excluir venda. Tente novamente.')
    }
  }

  const toggleMarkedForDelivery = async (id: string, currentStatus: boolean) => {
    try {
      const newStatus = !currentStatus
      const { error } = await supabase
        .from('sales')
        .update({
          marked_for_delivery: newStatus,
          delivery_status: newStatus ? 'unread' : 'unread',
          updated_at: new Date().toISOString()
        })
        .eq('id', id)

      if (error) throw error

      if (newStatus) {
        await supabase
          .from('delivery_status_history')
          .insert([{
            sale_id: id,
            status: 'unread',
            changed_by: 'Sistema',
            changed_at: new Date().toISOString(),
            notes: 'Pedido marcado para entrega'
          }])
      }

      await fetchSales()
    } catch (error) {
      console.error('Erro ao marcar para entrega:', error)
      alert('Erro ao marcar pedido para entrega.')
    }
  }

  const handleCloseForm = () => {
    setShowForm(false)
  }

  const handleSave = () => {
    fetchSales()
    handleCloseForm()
  }

  const filteredSales = sales.filter(sale => {
    const searchLower = searchTerm.toLowerCase()
    const matchesSearch = sale.sale_number.toLowerCase().includes(searchLower) ||
                         (sale.clients?.name || '').toLowerCase().includes(searchLower) ||
                         (sale.clients?.ruc || '').includes(searchTerm)

    const matchesPaymentStatus = filterPaymentStatus === 'all' ||
                         sale.payment_status === filterPaymentStatus

    return matchesSearch && matchesPaymentStatus
  })

  const getTotalSales = () => {
    return filteredSales.reduce((sum, sale) => sum + Number(sale.final_amount), 0)
  }

  const getPendingSales = () => {
    return sales.filter(s => s.payment_status === 'pending').length
  }

  const getPaymentStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'Pendente',
      paid: 'Pago',
      cancelled: 'Cancelado'
    }
    return labels[status] || status
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
          <h1 className="text-2xl font-bold text-gray-900">Vendas</h1>
          <p className="text-gray-600">Gerencie vendas para clientes</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Nova Venda
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Total de Vendas</p>
              <p className="text-2xl font-bold text-blue-600 mt-2">
                ₲ {getTotalSales().toLocaleString('es-PY')}
              </p>
            </div>
            <div className="p-3 rounded-full bg-blue-500">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Quantidade de Vendas</p>
              <p className="text-2xl font-bold text-green-600 mt-2">{filteredSales.length}</p>
            </div>
            <div className="p-3 rounded-full bg-green-500">
              <Calendar className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Pendentes</p>
              <p className="text-2xl font-bold text-orange-600 mt-2">{getPendingSales()}</p>
            </div>
            <div className="p-3 rounded-full bg-orange-500">
              <User className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Buscar vendas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <select
              value={filterPaymentStatus}
              onChange={(e) => setFilterPaymentStatus(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Todos os Status</option>
              <option value="pending">Pendente</option>
              <option value="paid">Pago</option>
              <option value="cancelled">Cancelado</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-3 px-6 font-medium text-gray-900">Número</th>
                <th className="text-left py-3 px-6 font-medium text-gray-900">Cliente</th>
                <th className="text-left py-3 px-6 font-medium text-gray-900">Data</th>
                <th className="text-left py-3 px-6 font-medium text-gray-900">Valor Total</th>
                <th className="text-left py-3 px-6 font-medium text-gray-900">Desconto</th>
                <th className="text-left py-3 px-6 font-medium text-gray-900">Valor Final</th>
                <th className="text-left py-3 px-6 font-medium text-gray-900">Pagamento</th>
                <th className="text-left py-3 px-6 font-medium text-gray-900">Status</th>
                <th className="text-center py-3 px-6 font-medium text-gray-900">Entrega</th>
                <th className="text-left py-3 px-6 font-medium text-gray-900">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredSales.map((sale) => (
                <tr key={sale.id} className="hover:bg-gray-50">
                  <td className="py-4 px-6">
                    <span className="font-mono text-sm font-medium text-gray-900">
                      {sale.sale_number}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <div>
                      <p className="font-medium text-gray-900">{sale.clients?.name || 'Cliente não informado'}</p>
                      {sale.clients?.ruc && (
                        <p className="text-xs text-gray-500">RUC: {sale.clients.ruc}</p>
                      )}
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <span className="text-sm text-gray-900">
                      {new Date(sale.sale_date).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                      })}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <span className="font-medium text-gray-900">
                      ₲ {Number(sale.total_amount).toLocaleString('es-PY')}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <span className="text-sm text-red-600">
                      ₲ {Number(sale.discount_amount).toLocaleString('es-PY')}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <span className="font-bold text-green-600">
                      ₲ {Number(sale.final_amount).toLocaleString('es-PY')}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <span className="text-sm text-gray-900">
                      {getPaymentMethodLabel(sale.payment_method)}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <span className={`px-2 py-1 rounded-full text-sm ${
                      sale.payment_status === 'paid'
                        ? 'bg-green-100 text-green-800'
                        : sale.payment_status === 'cancelled'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {getPaymentStatusLabel(sale.payment_status)}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center justify-center">
                      <button
                        onClick={() => toggleMarkedForDelivery(sale.id, sale.marked_for_delivery)}
                        className={`p-2 rounded-lg transition-colors ${
                          sale.marked_for_delivery
                            ? 'bg-green-100 text-green-600 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                        }`}
                        title={sale.marked_for_delivery ? 'Marcado para entrega' : 'Marcar para entrega'}
                      >
                        <Truck className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setViewingSale(sale)}
                        className="p-1 text-gray-600 hover:text-blue-600 transition-colors"
                        title="Ver detalhes"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setEditingSale(sale)}
                        className="p-1 text-gray-600 hover:text-orange-600 transition-colors"
                        title="Editar venda"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteSale(sale.id)}
                        className="p-1 text-gray-600 hover:text-red-600 transition-colors"
                        title="Excluir venda"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredSales.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-600">Nenhuma venda encontrada.</p>
          </div>
        )}
      </div>

      {showForm && (
        <SaleForm
          onClose={handleCloseForm}
          onSave={handleSave}
        />
      )}

      {viewingSale && (
        <SaleDetails
          sale={viewingSale}
          onClose={() => setViewingSale(null)}
        />
      )}

      {editingSale && (
        <SaleEditForm
          sale={editingSale}
          onClose={() => setEditingSale(null)}
          onSave={() => {
            fetchSales()
            setEditingSale(null)
          }}
        />
      )}
    </div>
  )
}

interface SaleDetailsProps {
  sale: Sale
  onClose: () => void
}

const SaleDetails: React.FC<SaleDetailsProps> = ({ sale, onClose }) => {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSaleItems()
  }, [sale.id])

  const fetchSaleItems = async () => {
    try {
      const { data, error } = await supabase
        .from('sale_items')
        .select('*')
        .eq('sale_id', sale.id)

      if (error) throw error
      setItems(data || [])
    } catch (error) {
      console.error('Erro ao buscar itens da venda:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Detalhes da Venda</h2>
            <p className="text-sm text-gray-600">{sale.sale_number}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            ×
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Cliente</p>
              <p className="font-medium text-gray-900">{sale.clients?.name || 'Não informado'}</p>
              {sale.clients?.ruc && (
                <p className="text-xs text-gray-500">RUC: {sale.clients.ruc}</p>
              )}
            </div>
            <div>
              <p className="text-sm text-gray-600">Data da Venda</p>
              <p className="font-medium text-gray-900">
                {new Date(sale.sale_date).toLocaleString('pt-BR')}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Método de Pagamento</p>
              <p className="font-medium text-gray-900">
                {sale.payment_method === 'cash' ? 'Dinheiro' :
                 sale.payment_method === 'card' ? 'Cartão' :
                 sale.payment_method === 'transfer' ? 'Transferência' :
                 sale.payment_method}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Status do Pagamento</p>
              <span className={`inline-block px-2 py-1 rounded-full text-sm ${
                sale.payment_status === 'paid'
                  ? 'bg-green-100 text-green-800'
                  : sale.payment_status === 'cancelled'
                  ? 'bg-red-100 text-red-800'
                  : 'bg-yellow-100 text-yellow-800'
              }`}>
                {sale.payment_status === 'paid' ? 'Pago' :
                 sale.payment_status === 'cancelled' ? 'Cancelado' :
                 'Pendente'}
              </span>
            </div>
          </div>

          {sale.notes && (
            <div>
              <p className="text-sm text-gray-600">Observações</p>
              <p className="text-gray-900">{sale.notes}</p>
            </div>
          )}

          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Itens da Venda</h3>
            {loading ? (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left py-2 px-4 text-sm font-medium text-gray-900">Código</th>
                      <th className="text-left py-2 px-4 text-sm font-medium text-gray-900">Produto</th>
                      <th className="text-right py-2 px-4 text-sm font-medium text-gray-900">Qtd.</th>
                      <th className="text-right py-2 px-4 text-sm font-medium text-gray-900">Preço Unit.</th>
                      <th className="text-right py-2 px-4 text-sm font-medium text-gray-900">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {items.map((item) => (
                      <tr key={item.id}>
                        <td className="py-2 px-4 text-sm font-mono">{item.product_code}</td>
                        <td className="py-2 px-4 text-sm">{item.product_name}</td>
                        <td className="py-2 px-4 text-sm text-right">{item.quantity}</td>
                        <td className="py-2 px-4 text-sm text-right">
                          ₲ {Number(item.unit_price).toLocaleString('es-PY')}
                        </td>
                        <td className="py-2 px-4 text-sm text-right font-medium">
                          ₲ {Number(item.subtotal).toLocaleString('es-PY')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="border-t pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal:</span>
              <span className="font-medium">₲ {Number(sale.total_amount).toLocaleString('es-PY')}</span>
            </div>
            {sale.discount_amount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Desconto:</span>
                <span className="font-medium text-red-600">- ₲ {Number(sale.discount_amount).toLocaleString('es-PY')}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold">
              <span>Total:</span>
              <span className="text-green-600">₲ {Number(sale.final_amount).toLocaleString('es-PY')}</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 p-6 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}

export default Sales
