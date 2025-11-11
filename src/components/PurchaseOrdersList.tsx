import React, { useState, useEffect } from 'react'
import { FileText, Package, Calendar, DollarSign, CheckCircle, Clock, XCircle, Eye, Trash2, AlertCircle } from 'lucide-react'
import { supabase, Fornecedor } from '../lib/supabase'

type PurchaseOrderStatus = 'pendente' | 'aprovado' | 'recebido' | 'cancelado'

type PurchaseOrderItem = {
  id: string
  product_id: string
  quantity: number
  unit_price: number
  subtotal: number
  products?: {
    nome: string
    codigo: string
  }
}

type PurchaseOrder = {
  id: string
  fornecedor_id: string
  total_amount: number
  status: PurchaseOrderStatus
  observacoes: string
  created_at: string
  updated_at: string
  fornecedores?: Fornecedor
  pedido_compra_items?: PurchaseOrderItem[]
}

type PurchaseOrdersListProps = {
  suppliers: Fornecedor[]
  onRefresh: () => void
}

const PurchaseOrdersList: React.FC<PurchaseOrdersListProps> = ({ suppliers, onRefresh }) => {
  const [orders, setOrders] = useState<PurchaseOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<'all' | PurchaseOrderStatus>('all')
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null)
  const [showDetails, setShowDetails] = useState(false)

  useEffect(() => {
    fetchOrders()
  }, [])

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('pedidos_compra')
        .select(`
          *,
          fornecedores (*),
          pedido_compra_items (
            *,
            products (nome, codigo)
          )
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setOrders(data || [])
    } catch (error) {
      console.error('Erro ao buscar pedidos:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateOrderStatus = async (orderId: string, newStatus: PurchaseOrderStatus) => {
    try {
      const { error } = await supabase
        .from('pedidos_compra')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId)

      if (error) throw error

      // Se o pedido foi recebido, atualizar o estoque
      if (newStatus === 'recebido') {
        const order = orders.find(o => o.id === orderId)
        if (order?.pedido_compra_items) {
          for (const item of order.pedido_compra_items) {
            // Buscar o produto atual
            const { data: product, error: productError } = await supabase
              .from('products')
              .select('stock')
              .eq('id', item.product_id)
              .single()

            if (productError) throw productError

            // Atualizar o estoque
            const { error: updateError } = await supabase
              .from('products')
              .update({
                stock: product.stock + item.quantity,
                updated_at: new Date().toISOString()
              })
              .eq('id', item.product_id)

            if (updateError) throw updateError
          }
        }
      }

      await fetchOrders()
      onRefresh()
      alert('Status do pedido atualizado com sucesso!')
    } catch (error) {
      console.error('Erro ao atualizar status:', error)
      alert('Erro ao atualizar status do pedido')
    }
  }

  const deleteOrder = async (orderId: string) => {
    if (!confirm('Tem certeza que deseja excluir este pedido?')) return

    try {
      // Primeiro deletar os itens
      const { error: itemsError } = await supabase
        .from('pedido_compra_items')
        .delete()
        .eq('pedido_compra_id', orderId)

      if (itemsError) throw itemsError

      // Depois deletar o pedido
      const { error: orderError } = await supabase
        .from('pedidos_compra')
        .delete()
        .eq('id', orderId)

      if (orderError) throw orderError

      await fetchOrders()
      alert('Pedido excluído com sucesso!')
    } catch (error) {
      console.error('Erro ao excluir pedido:', error)
      alert('Erro ao excluir pedido')
    }
  }

  const getStatusBadge = (status: PurchaseOrderStatus) => {
    const badges = {
      pendente: { color: 'bg-yellow-100 text-yellow-800', icon: Clock, label: 'Pendente' },
      aprovado: { color: 'bg-blue-100 text-blue-800', icon: CheckCircle, label: 'Aprovado' },
      recebido: { color: 'bg-green-100 text-green-800', icon: Package, label: 'Recebido' },
      cancelado: { color: 'bg-red-100 text-red-800', icon: XCircle, label: 'Cancelado' }
    }
    const badge = badges[status]
    const Icon = badge.icon
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium inline-flex items-center gap-1 ${badge.color}`}>
        <Icon className="w-3.5 h-3.5" />
        {badge.label}
      </span>
    )
  }

  const filteredOrders = filterStatus === 'all'
    ? orders
    : orders.filter(order => order.status === filterStatus)

  const getTotalsByStatus = () => {
    return {
      all: orders.length,
      pendente: orders.filter(o => o.status === 'pendente').length,
      aprovado: orders.filter(o => o.status === 'aprovado').length,
      recebido: orders.filter(o => o.status === 'recebido').length,
      cancelado: orders.filter(o => o.status === 'cancelado').length
    }
  }

  const totals = getTotalsByStatus()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilterStatus('all')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filterStatus === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Todos ({totals.all})
        </button>
        <button
          onClick={() => setFilterStatus('pendente')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filterStatus === 'pendente'
              ? 'bg-yellow-600 text-white'
              : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
          }`}
        >
          Pendentes ({totals.pendente})
        </button>
        <button
          onClick={() => setFilterStatus('aprovado')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filterStatus === 'aprovado'
              ? 'bg-blue-600 text-white'
              : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
          }`}
        >
          Aprovados ({totals.aprovado})
        </button>
        <button
          onClick={() => setFilterStatus('recebido')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filterStatus === 'recebido'
              ? 'bg-green-600 text-white'
              : 'bg-green-100 text-green-700 hover:bg-green-200'
          }`}
        >
          Recebidos ({totals.recebido})
        </button>
        <button
          onClick={() => setFilterStatus('cancelado')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filterStatus === 'cancelado'
              ? 'bg-red-600 text-white'
              : 'bg-red-100 text-red-700 hover:bg-red-200'
          }`}
        >
          Cancelados ({totals.cancelado})
        </button>
      </div>

      {/* Lista de Pedidos */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600">Nenhum pedido encontrado</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredOrders.map((order) => (
            <div key={order.id} className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow">
              <div className="p-5">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="w-5 h-5 text-blue-600" />
                      <h3 className="font-semibold text-gray-900">
                        Pedido #{order.id.slice(0, 8)}
                      </h3>
                    </div>
                    <p className="text-sm text-gray-600">
                      {order.fornecedores?.nome || 'Fornecedor não encontrado'}
                    </p>
                  </div>
                  {getStatusBadge(order.status)}
                </div>

                {/* Info */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">
                      {new Date(order.created_at).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Package className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">
                      {order.pedido_compra_items?.length || 0} itens
                    </span>
                  </div>
                </div>

                {/* Total */}
                <div className="bg-blue-50 rounded-lg p-3 mb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Total:</span>
                    <span className="text-lg font-bold text-blue-600">
                      Gs. {order.total_amount.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Observações */}
                {order.observacoes && (
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">Observações:</p>
                    <p className="text-sm text-gray-700">{order.observacoes}</p>
                  </div>
                )}

                {/* Ações */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setSelectedOrder(order)
                      setShowDetails(true)
                    }}
                    className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium flex items-center justify-center gap-1"
                  >
                    <Eye className="w-4 h-4" />
                    Detalhes
                  </button>

                  {order.status === 'pendente' && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'aprovado')}
                      className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                    >
                      Aprovar
                    </button>
                  )}

                  {order.status === 'aprovado' && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'recebido')}
                      className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                    >
                      Marcar Recebido
                    </button>
                  )}

                  {(order.status === 'pendente' || order.status === 'aprovado') && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'cancelado')}
                      className="px-3 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                      title="Cancelar pedido"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  )}

                  {order.status === 'cancelado' && (
                    <button
                      onClick={() => deleteOrder(order.id)}
                      className="px-3 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                      title="Excluir pedido"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Detalhes */}
      {showDetails && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b bg-blue-50">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <FileText className="w-6 h-6 text-blue-600" />
                    Detalhes do Pedido #{selectedOrder.id.slice(0, 8)}
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {selectedOrder.fornecedores?.nome}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowDetails(false)
                    setSelectedOrder(null)
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
              {/* Info Geral */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Status</p>
                  {getStatusBadge(selectedOrder.status)}
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Data do Pedido</p>
                  <p className="font-medium">
                    {new Date(selectedOrder.created_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>

              {/* Itens do Pedido */}
              <div className="mb-6">
                <h3 className="font-semibold text-gray-900 mb-3">Itens do Pedido</h3>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left py-2 px-4 text-sm font-medium text-gray-700">Produto</th>
                        <th className="text-center py-2 px-4 text-sm font-medium text-gray-700">Qtd</th>
                        <th className="text-right py-2 px-4 text-sm font-medium text-gray-700">Preço Unit.</th>
                        <th className="text-right py-2 px-4 text-sm font-medium text-gray-700">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {selectedOrder.pedido_compra_items?.map((item) => (
                        <tr key={item.id}>
                          <td className="py-3 px-4">
                            <p className="font-medium text-gray-900">{item.products?.nome}</p>
                            <p className="text-xs text-gray-500">Cód: {item.products?.codigo}</p>
                          </td>
                          <td className="py-3 px-4 text-center">{item.quantity}</td>
                          <td className="py-3 px-4 text-right">
                            Gs. {item.unit_price.toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-right font-medium">
                            Gs. {item.subtotal.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-blue-50">
                      <tr>
                        <td colSpan={3} className="py-3 px-4 text-right font-semibold">
                          Total:
                        </td>
                        <td className="py-3 px-4 text-right text-lg font-bold text-blue-600">
                          Gs. {selectedOrder.total_amount.toLocaleString()}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Observações */}
              {selectedOrder.observacoes && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Observações</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-gray-700">{selectedOrder.observacoes}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PurchaseOrdersList
