import React, { useState, useEffect } from 'react'
import { X, CheckSquare, Square, Package, Minus, Plus } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface Client {
  id: string
  name: string
  address: string
  city: string
  phone: string
}

interface Sale {
  id: string
  sale_number: string
  clients?: Client
  delivery_notes: string
}

interface Product {
  id: string
  codigo: string
  nome: string
  description: string
  image_url: string
  price: number
  info: string
  quantidade: string
}

interface DeliveryItem {
  id: string
  sale_id: string
  sale_item_id: string
  product_id: string
  product_code: string
  product_name: string
  quantity: number
  checked_quantity: number
  is_completed: boolean
  checked_at: string
  product?: Product
}

interface DeliveryChecklistProps {
  sale: Sale
  onClose: () => void
}

const DeliveryChecklist: React.FC<DeliveryChecklistProps> = ({ sale, onClose }) => {
  const [items, setItems] = useState<DeliveryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [deliveryNotes, setDeliveryNotes] = useState(sale.delivery_notes || '')
  const [savingNotes, setSavingNotes] = useState(false)

  useEffect(() => {
    fetchChecklistItems()
  }, [sale.id])

  const fetchChecklistItems = async () => {
    try {
      const { data, error } = await supabase
        .from('delivery_items_check')
        .select('*')
        .eq('sale_id', sale.id)
        .order('product_name')

      if (error) throw error

      const itemsWithProducts = data || []

      for (const item of itemsWithProducts) {
        const { data: productData } = await supabase
          .from('products')
          .select('id, codigo, nome, description, image_url, price, info, quantidade')
          .eq('id', item.product_id)
          .maybeSingle()

        if (productData) {
          item.product = productData
        }
      }

      setItems(itemsWithProducts)
    } catch (error) {
      console.error('Erro ao buscar itens do checklist:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateCheckedQuantity = async (itemId: string, newQuantity: number, totalQuantity: number) => {
    try {
      const clampedQuantity = Math.max(0, Math.min(newQuantity, totalQuantity))
      const isCompleted = clampedQuantity === totalQuantity

      const { error } = await supabase
        .from('delivery_items_check')
        .update({
          checked_quantity: clampedQuantity,
          is_completed: isCompleted,
          checked_at: isCompleted ? new Date().toISOString() : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', itemId)

      if (error) throw error
      await fetchChecklistItems()
    } catch (error) {
      console.error('Erro ao atualizar quantidade checada:', error)
    }
  }

  const toggleItemComplete = async (item: DeliveryItem) => {
    const newQuantity = item.is_completed ? 0 : item.quantity
    await updateCheckedQuantity(item.id, newQuantity, item.quantity)
  }

  const incrementChecked = async (item: DeliveryItem) => {
    await updateCheckedQuantity(item.id, item.checked_quantity + 1, item.quantity)
  }

  const decrementChecked = async (item: DeliveryItem) => {
    await updateCheckedQuantity(item.id, item.checked_quantity - 1, item.quantity)
  }

  const saveDeliveryNotes = async () => {
    setSavingNotes(true)
    try {
      const { error } = await supabase
        .from('sales')
        .update({
          delivery_notes: deliveryNotes,
          updated_at: new Date().toISOString()
        })
        .eq('id', sale.id)

      if (error) throw error
    } catch (error) {
      console.error('Erro ao salvar observações:', error)
      alert('Erro ao salvar observações.')
    } finally {
      setSavingNotes(false)
    }
  }

  const getProgressPercentage = () => {
    if (items.length === 0) return 0
    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)
    const checkedItems = items.reduce((sum, item) => sum + item.checked_quantity, 0)
    return Math.round((checkedItems / totalItems) * 100)
  }

  const getCompletedItemsCount = () => {
    return items.filter(item => item.is_completed).length
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl p-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b bg-blue-50">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Checklist de Entrega</h2>
            <p className="text-sm text-gray-600">Pedido: {sale.sale_number}</p>
            {sale.clients && (
              <div className="mt-2 text-sm">
                <p className="font-medium text-gray-900">{sale.clients.name}</p>
                {sale.clients.address && (
                  <p className="text-gray-600">{sale.clients.address}, {sale.clients.city}</p>
                )}
                {sale.clients.phone && (
                  <p className="text-gray-600">Tel: {sale.clients.phone}</p>
                )}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-white border rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-gray-900">Progresso da Entrega</h3>
              <span className="text-2xl font-bold text-blue-600">{getProgressPercentage()}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4 mb-2">
              <div
                className="bg-blue-600 h-4 rounded-full transition-all duration-300"
                style={{ width: `${getProgressPercentage()}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-600">
              {getCompletedItemsCount()} de {items.length} produtos completamente checados
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Package className="w-5 h-5" />
              Produtos para Entrega
            </h3>

            <div className="space-y-3">
              {items.map((item) => (
                <div
                  key={item.id}
                  className={`border rounded-lg p-4 transition-all ${
                    item.is_completed
                      ? 'bg-green-50 border-green-300'
                      : 'bg-white border-gray-300 hover:border-blue-400'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <button
                      onClick={() => toggleItemComplete(item)}
                      className="flex-shrink-0"
                    >
                      {item.is_completed ? (
                        <CheckSquare className="w-6 h-6 text-green-600" />
                      ) : (
                        <Square className="w-6 h-6 text-gray-400" />
                      )}
                    </button>

                    {item.product?.image_url && (
                      <img
                        src={item.product.image_url}
                        alt={item.product_name}
                        className="w-20 h-20 rounded-lg object-cover border border-gray-200 flex-shrink-0"
                      />
                    )}

                    <div className="flex-1 min-w-0">
                      <p className={`font-semibold text-lg ${item.is_completed ? 'text-green-900 line-through' : 'text-gray-900'}`}>
                        {item.product_name}
                      </p>
                      <div className="mt-1 space-y-1">
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">Código:</span> {item.product_code}
                        </p>
                        {item.product?.description && (
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Descrição:</span> {item.product.description}
                          </p>
                        )}
                        {item.product?.info && (
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Info:</span> {item.product.info}
                          </p>
                        )}
                        {item.product?.quantidade && (
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Quantidade:</span> {item.product.quantidade}
                          </p>
                        )}
                        {item.product?.price && (
                          <p className="text-sm font-semibold text-blue-600">
                            Preço: ₲ {Number(item.product.price).toLocaleString('es-PY')}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="text-right">
                        <p className="text-sm text-gray-600">Quantidade</p>
                        <p className="text-lg font-bold text-gray-900">
                          <span className={item.is_completed ? 'text-green-600' : 'text-blue-600'}>
                            {item.checked_quantity}
                          </span>
                          <span className="text-gray-400"> / {item.quantity}</span>
                        </p>
                      </div>

                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => incrementChecked(item)}
                          disabled={item.checked_quantity >= item.quantity}
                          className="p-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          title="Aumentar quantidade checada"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => decrementChecked(item)}
                          disabled={item.checked_quantity <= 0}
                          className="p-1 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          title="Diminuir quantidade checada"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {items.length === 0 && (
              <div className="text-center py-8 text-gray-500 border border-gray-300 rounded-lg">
                <Package className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <p>Nenhum produto encontrado neste pedido.</p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Observações da Entrega
            </label>
            <textarea
              value={deliveryNotes}
              onChange={(e) => setDeliveryNotes(e.target.value)}
              onBlur={saveDeliveryNotes}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Digite observações sobre a entrega..."
            />
            {savingNotes && (
              <p className="text-xs text-gray-500 mt-1">Salvando...</p>
            )}
          </div>
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

export default DeliveryChecklist
