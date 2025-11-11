import React, { useState, useEffect } from 'react'
import { X, Save } from 'lucide-react'
import { supabase } from '../lib/supabase'

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

interface SaleEditFormProps {
  sale: Sale
  onClose: () => void
  onSave: () => void
}

const SaleEditForm: React.FC<SaleEditFormProps> = ({ sale, onClose, onSave }) => {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    client_id: sale.client_id || '',
    sale_date: sale.sale_date.split('T')[0],
    discount_amount: sale.discount_amount,
    payment_method: sale.payment_method,
    payment_status: sale.payment_status,
    notes: sale.notes || ''
  })

  useEffect(() => {
    fetchClients()
  }, [])

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('active', true)
        .order('name')

      if (error) throw error
      setClients(data || [])
    } catch (error) {
      console.error('Erro ao buscar clientes:', error)
    }
  }

  const calculateFinalAmount = () => {
    return Math.max(0, sale.total_amount - formData.discount_amount)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const finalAmount = calculateFinalAmount()

      const { error } = await supabase
        .from('sales')
        .update({
          client_id: formData.client_id || null,
          sale_date: new Date(formData.sale_date).toISOString(),
          discount_amount: formData.discount_amount,
          final_amount: finalAmount,
          payment_method: formData.payment_method,
          payment_status: formData.payment_status,
          notes: formData.notes || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', sale.id)

      if (error) throw error

      onSave()
    } catch (error) {
      console.error('Erro ao atualizar venda:', error)
      alert('Erro ao atualizar venda. Tente novamente.')
    } finally {
      setLoading(false)
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

  const getPaymentStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'Pendente',
      paid: 'Pago',
      cancelled: 'Cancelado'
    }
    return labels[status] || status
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Editar Venda</h2>
            <p className="text-sm text-gray-600">{sale.sale_number}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Importante:</strong> Esta ação editará apenas os dados da venda (cliente, data, desconto, pagamento, observações). Os produtos da venda não podem ser alterados.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cliente
              </label>
              <select
                value={formData.client_id}
                onChange={(e) => setFormData(prev => ({ ...prev, client_id: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Selecione um cliente (opcional)</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name} {client.ruc ? `- ${client.ruc}` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data da Venda
              </label>
              <input
                type="date"
                value={formData.sale_date}
                onChange={(e) => setFormData(prev => ({ ...prev, sale_date: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Método de Pagamento
              </label>
              <select
                value={formData.payment_method}
                onChange={(e) => setFormData(prev => ({ ...prev, payment_method: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="cash">Dinheiro</option>
                <option value="card">Cartão</option>
                <option value="transfer">Transferência</option>
                <option value="pix">PIX</option>
                <option value="check">Cheque</option>
                <option value="credit">Crédito</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status do Pagamento
              </label>
              <select
                value={formData.payment_status}
                onChange={(e) => setFormData(prev => ({ ...prev, payment_status: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="pending">Pendente</option>
                <option value="paid">Pago</option>
                <option value="cancelled">Cancelado</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Desconto (₲)
              </label>
              <input
                type="number"
                min="0"
                max={sale.total_amount}
                step="0.01"
                value={formData.discount_amount}
                onChange={(e) => setFormData(prev => ({ ...prev, discount_amount: parseFloat(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0"
              />
              <p className="text-xs text-gray-500 mt-1">
                Máximo: ₲ {sale.total_amount.toLocaleString('es-PY')}
              </p>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Observações
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Observações sobre a venda"
              />
            </div>
          </div>

          <div className="border-t pt-4 space-y-3">
            <div className="flex justify-between text-lg">
              <span className="text-gray-700">Subtotal:</span>
              <span className="font-semibold">₲ {sale.total_amount.toLocaleString('es-PY')}</span>
            </div>
            {formData.discount_amount > 0 && (
              <div className="flex justify-between text-lg">
                <span className="text-gray-700">Desconto:</span>
                <span className="font-semibold text-red-600">- ₲ {formData.discount_amount.toLocaleString('es-PY')}</span>
              </div>
            )}
            <div className="flex justify-between text-2xl">
              <span className="font-bold text-gray-900">Total:</span>
              <span className="font-bold text-green-600">₲ {calculateFinalAmount().toLocaleString('es-PY')}</span>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <Save className="w-4 h-4" />
              )}
              Salvar Alterações
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default SaleEditForm
