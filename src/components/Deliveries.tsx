import React, { useState, useEffect } from 'react'
import { Truck, Package, CheckSquare, Square, Eye, Calendar, User, MapPin, Clock, History, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import DeliveryChecklist from './DeliveryChecklist'

interface Client {
  id: string
  name: string
  email: string
  phone: string
  ruc: string
  address: string
  city: string
  latitude: number | null
  longitude: number | null
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
  delivery_notes: string
  created_at: string
  updated_at: string
  clients?: Client
}

interface DeliveryStatusHistory {
  id: string
  sale_id: string
  status: string
  changed_by: string
  changed_at: string
  notes: string
}

const Deliveries: React.FC = () => {
  const [deliveries, setDeliveries] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<'all' | 'unread' | 'preparing' | 'out_for_delivery' | 'delivered' | 'cancelled' | 'out_of_stock'>('all')
  const [selectedDelivery, setSelectedDelivery] = useState<Sale | null>(null)
  const [showChecklist, setShowChecklist] = useState(false)
  const [showStatusHistory, setShowStatusHistory] = useState(false)
  const [statusHistory, setStatusHistory] = useState<DeliveryStatusHistory[]>([])

  useEffect(() => {
    fetchDeliveries()
  }, [])

  const fetchDeliveries = async () => {
    try {
      const { data, error } = await supabase
        .from('sales')
        .select('*, clients(id, name, email, phone, ruc, address, city, latitude, longitude)')
        .eq('marked_for_delivery', true)
        .order('created_at', { ascending: false })

      if (error) throw error
      setDeliveries(data || [])
    } catch (error) {
      console.error('Erro ao buscar entregas:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateDeliveryStatus = async (saleId: string, status: string) => {
    try {
      const { error: updateError } = await supabase
        .from('sales')
        .update({
          delivery_status: status,
          updated_at: new Date().toISOString()
        })
        .eq('id', saleId)

      if (updateError) throw updateError

      await fetchDeliveries()
    } catch (error) {
      console.error('Erro ao atualizar status:', error)
      alert('Erro ao atualizar status da entrega.')
    }
  }

  const handleViewChecklist = (delivery: Sale) => {
    setSelectedDelivery(delivery)
    setShowChecklist(true)
  }

  const handleCloseChecklist = () => {
    setShowChecklist(false)
    setSelectedDelivery(null)
    fetchDeliveries()
  }

  const handleViewStatusHistory = async (delivery: Sale) => {
    setSelectedDelivery(delivery)
    try {
      const { data, error } = await supabase
        .from('delivery_status_history')
        .select('*')
        .eq('sale_id', delivery.id)
        .order('changed_at', { ascending: false })

      if (error) throw error
      setStatusHistory(data || [])
      setShowStatusHistory(true)
    } catch (error) {
      console.error('Erro ao buscar histórico:', error)
      alert('Erro ao buscar histórico de status.')
    }
  }

  const handleCloseStatusHistory = () => {
    setShowStatusHistory(false)
    setSelectedDelivery(null)
    setStatusHistory([])
  }

  const getDeliveryStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      unread: 'Não Lida',
      preparing: 'Em Separação',
      out_for_delivery: 'Saiu para Entrega',
      delivered: 'Entregue',
      cancelled: 'Cancelado',
      out_of_stock: 'Falta de Stock'
    }
    return labels[status] || status
  }

  const getDeliveryStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      unread: 'bg-gray-100 text-gray-800',
      preparing: 'bg-yellow-100 text-yellow-800',
      out_for_delivery: 'bg-blue-100 text-blue-800',
      delivered: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
      out_of_stock: 'bg-orange-100 text-orange-800'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  const openMapsLink = (client: Client) => {
    if (!client) return

    let url = ''

    if (client.latitude && client.longitude) {
      url = `https://www.google.com/maps/dir/?api=1&destination=${client.latitude},${client.longitude}`
    } else if (client.address) {
      const fullAddress = `${client.address}${client.city ? ', ' + client.city : ''}, Paraguay`
      url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(fullAddress)}`
    } else {
      alert('Endereço não disponível para este cliente.')
      return
    }

    window.open(url, '_blank')
  }

  const filteredDeliveries = deliveries.filter(delivery => {
    if (filterStatus === 'all') return true
    return delivery.delivery_status === filterStatus
  })

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
          <h1 className="text-2xl font-bold text-gray-900">Entregas</h1>
          <p className="text-gray-600">Gerencie pedidos marcados para entrega</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Total de Entregas</p>
              <p className="text-2xl font-bold text-blue-600 mt-2">{deliveries.length}</p>
            </div>
            <div className="p-3 rounded-full bg-blue-500">
              <Truck className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Não Lidas</p>
              <p className="text-2xl font-bold text-gray-600 mt-2">
                {deliveries.filter(d => d.delivery_status === 'unread').length}
              </p>
            </div>
            <div className="p-3 rounded-full bg-gray-500">
              <Package className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Em Separação</p>
              <p className="text-2xl font-bold text-yellow-600 mt-2">
                {deliveries.filter(d => d.delivery_status === 'preparing').length}
              </p>
            </div>
            <div className="p-3 rounded-full bg-yellow-500">
              <Package className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Saiu p/ Entrega</p>
              <p className="text-2xl font-bold text-blue-600 mt-2">
                {deliveries.filter(d => d.delivery_status === 'out_for_delivery').length}
              </p>
            </div>
            <div className="p-3 rounded-full bg-blue-500">
              <Truck className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Entregues</p>
              <p className="text-2xl font-bold text-green-600 mt-2">
                {deliveries.filter(d => d.delivery_status === 'delivered').length}
              </p>
            </div>
            <div className="p-3 rounded-full bg-green-500">
              <CheckSquare className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b">
          <div className="flex flex-col sm:flex-row gap-4">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Todos os Status</option>
              <option value="unread">Não Lida</option>
              <option value="preparing">Em Separação</option>
              <option value="out_for_delivery">Saiu para Entrega</option>
              <option value="delivered">Entregue</option>
              <option value="cancelled">Cancelado</option>
              <option value="out_of_stock">Falta de Stock</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-3 px-6 font-medium text-gray-900">Pedido</th>
                <th className="text-left py-3 px-6 font-medium text-gray-900">Cliente</th>
                <th className="text-left py-3 px-6 font-medium text-gray-900">Endereço</th>
                <th className="text-left py-3 px-6 font-medium text-gray-900">Data</th>
                <th className="text-left py-3 px-6 font-medium text-gray-900">Valor</th>
                <th className="text-left py-3 px-6 font-medium text-gray-900">Status</th>
                <th className="text-center py-3 px-6 font-medium text-gray-900">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredDeliveries.map((delivery) => (
                <tr key={delivery.id} className="hover:bg-gray-50">
                  <td className="py-4 px-6">
                    <span className="font-mono text-sm font-medium text-gray-900">
                      {delivery.sale_number}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="font-medium text-gray-900">
                          {delivery.clients?.name || 'Cliente não informado'}
                        </p>
                        {delivery.clients?.phone && (
                          <p className="text-xs text-gray-500">{delivery.clients.phone}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    {delivery.clients?.address || delivery.clients?.latitude ? (
                      <button
                        onClick={() => delivery.clients && openMapsLink(delivery.clients)}
                        className="flex items-start gap-2 hover:bg-blue-50 p-2 rounded-lg transition-colors group"
                        title="Abrir rota no Google Maps"
                      >
                        <MapPin className="w-4 h-4 text-blue-500 mt-0.5 group-hover:text-blue-700" />
                        <div className="text-left">
                          <p className="text-sm text-blue-600 group-hover:text-blue-800 font-medium underline">
                            {delivery.clients?.address || 'Ver no mapa'}
                          </p>
                          {delivery.clients?.city && (
                            <p className="text-xs text-gray-500">{delivery.clients.city}</p>
                          )}
                          {delivery.clients?.latitude && delivery.clients?.longitude && (
                            <p className="text-xs text-gray-400">
                              GPS: {delivery.clients.latitude.toFixed(6)}, {delivery.clients.longitude.toFixed(6)}
                            </p>
                          )}
                        </div>
                      </button>
                    ) : (
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-gray-300 mt-0.5" />
                        <p className="text-sm text-gray-400">Endereço não informado</p>
                      </div>
                    )}
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-900">
                        {new Date(delivery.sale_date).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric'
                        })}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <span className="font-bold text-green-600">
                      ₲ {Number(delivery.final_amount).toLocaleString('es-PY')}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <select
                      value={delivery.delivery_status}
                      onChange={(e) => updateDeliveryStatus(delivery.id, e.target.value)}
                      className={`px-2 py-1 rounded-full text-sm font-medium ${getDeliveryStatusColor(delivery.delivery_status)} border-0 cursor-pointer`}
                    >
                      <option value="unread">Não Lida</option>
                      <option value="preparing">Em Separação</option>
                      <option value="out_for_delivery">Saiu para Entrega</option>
                      <option value="delivered">Entregue</option>
                      <option value="cancelled">Cancelado</option>
                      <option value="out_of_stock">Falta de Stock</option>
                    </select>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleViewChecklist(delivery)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Ver checklist de produtos"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleViewStatusHistory(delivery)}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="Ver histórico de status"
                      >
                        <History className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredDeliveries.length === 0 && (
          <div className="text-center py-12">
            <Truck className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">Nenhuma entrega encontrada.</p>
            <p className="text-sm text-gray-500">
              Marque pedidos na aba Vendas para aparecerem aqui.
            </p>
          </div>
        )}
      </div>

      {showChecklist && selectedDelivery && (
        <DeliveryChecklist
          sale={selectedDelivery}
          onClose={handleCloseChecklist}
        />
      )}

      {showStatusHistory && selectedDelivery && (
        <StatusHistoryModal
          sale={selectedDelivery}
          history={statusHistory}
          onClose={handleCloseStatusHistory}
          getStatusLabel={getDeliveryStatusLabel}
          getStatusColor={getDeliveryStatusColor}
        />
      )}
    </div>
  )
}

interface StatusHistoryModalProps {
  sale: Sale
  history: DeliveryStatusHistory[]
  onClose: () => void
  getStatusLabel: (status: string) => string
  getStatusColor: (status: string) => string
}

const StatusHistoryModal: React.FC<StatusHistoryModalProps> = ({
  sale,
  history,
  onClose,
  getStatusLabel,
  getStatusColor
}) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b bg-green-50">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <History className="w-5 h-5" />
              Histórico de Status
            </h2>
            <p className="text-sm text-gray-600">Pedido: {sale.sale_number}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {history.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">Nenhum histórico de mudanças registrado.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((item, index) => (
                <div
                  key={item.id}
                  className="relative pl-8 pb-4 border-l-2 border-gray-200 last:border-l-0 last:pb-0"
                >
                  <div className="absolute left-[-9px] top-0 w-4 h-4 rounded-full bg-white border-2 border-blue-500"></div>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="flex-1">
                        <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(item.status)}`}>
                          {getStatusLabel(item.status)}
                        </span>
                      </div>
                      <div className="text-right text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>
                            {new Date(item.changed_at).toLocaleDateString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric'
                            })}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(item.changed_at).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit'
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="text-sm text-gray-600 mt-2">
                      <div className="flex items-center gap-2">
                        <User className="w-3 h-3" />
                        <span className="font-medium">Alterado por:</span>
                        <span>{item.changed_by}</span>
                      </div>
                    </div>

                    {item.notes && (
                      <div className="mt-2 text-sm text-gray-600 bg-white p-2 rounded border border-gray-200">
                        <span className="font-medium">Observações:</span> {item.notes}
                      </div>
                    )}

                    {index === 0 && (
                      <div className="mt-2">
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          Status Atual
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}

export default Deliveries
