import React, { useState, useEffect } from 'react'
import { X, Plus, Minus, ShoppingCart, AlertCircle, Trash2 } from 'lucide-react'
import { supabase, Product, Fornecedor } from '../lib/supabase'
import ProductsGridForOrders from './ProductsGridForOrders'

type PurchaseOrderItem = {
  product: Product
  quantity: number
  unit_price: number
  subtotal: number
}

type PurchaseOrderFormProps = {
  onClose: () => void
  onSave: () => void
  suppliers: Fornecedor[]
  lowStockProducts: Product[]
}

const PurchaseOrderForm: React.FC<PurchaseOrderFormProps> = ({
  onClose,
  onSave,
  suppliers,
  lowStockProducts
}) => {
  const [selectedSupplier, setSelectedSupplier] = useState<string>('')
  const [orderItems, setOrderItems] = useState<PurchaseOrderItem[]>([])
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  const addProductToOrder = (product: Product) => {
    const existingItem = orderItems.find(item => item.product.id === product.id)
    
    if (existingItem) {
      updateQuantity(product.id, existingItem.quantity + 1)
    } else {
      const newItem: PurchaseOrderItem = {
        product,
        quantity: 1,
        unit_price: product.price,
        subtotal: product.price
      }
      setOrderItems([...orderItems, newItem])
    }
  }

  const updateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeItem(productId)
      return
    }

    setOrderItems(orderItems.map(item => {
      if (item.product.id === productId) {
        return {
          ...item,
          quantity: newQuantity,
          subtotal: newQuantity * item.unit_price
        }
      }
      return item
    }))
  }

  const updateUnitPrice = (productId: string, newPrice: number) => {
    setOrderItems(orderItems.map(item => {
      if (item.product.id === productId) {
        return {
          ...item,
          unit_price: newPrice,
          subtotal: item.quantity * newPrice
        }
      }
      return item
    }))
  }

  const removeItem = (productId: string) => {
    setOrderItems(orderItems.filter(item => item.product.id !== productId))
  }

  const getTotalAmount = () => {
    return orderItems.reduce((sum, item) => sum + item.subtotal, 0)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedSupplier) {
      alert('Selecione um fornecedor')
      return
    }

    if (orderItems.length === 0) {
      alert('Adicione pelo menos um produto ao pedido')
      return
    }

    setLoading(true)

    try {
      // Criar o pedido de compra
      const { data: purchaseOrder, error: orderError } = await supabase
        .from('pedidos_compra')
        .insert({
          fornecedor_id: selectedSupplier,
          total_amount: getTotalAmount(),
          status: 'pendente',
          observacoes: notes
        })
        .select()
        .single()

      if (orderError) throw orderError

      // Criar os itens do pedido
      const orderItemsData = orderItems.map(item => ({
        pedido_compra_id: purchaseOrder.id,
        product_id: item.product.id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        subtotal: item.subtotal
      }))

      const { error: itemsError } = await supabase
        .from('pedido_compra_items')
        .insert(orderItemsData)

      if (itemsError) throw itemsError

      alert('Pedido de compra criado com sucesso!')
      onSave()
      onClose()
    } catch (error) {
      console.error('Erro ao criar pedido:', error)
      alert('Erro ao criar pedido de compra')
    } finally {
      setLoading(false)
    }
  }

  const addLowStockProducts = () => {
    lowStockProducts.forEach(product => {
      const existingItem = orderItems.find(item => item.product.id === product.id)
      if (!existingItem) {
        const suggestedQuantity = Math.max(10 - product.stock, 1)
        const newItem: PurchaseOrderItem = {
          product,
          quantity: suggestedQuantity,
          unit_price: product.price,
          subtotal: suggestedQuantity * product.price
        }
        setOrderItems(prev => [...prev, newItem])
      }
    })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-[95vw] my-8">
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="p-6 border-b flex items-center justify-between bg-blue-50 sticky top-0 z-10">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <ShoppingCart className="w-6 h-6 text-blue-600" />
                Novo Pedido de Compra
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Selecione o fornecedor e adicione os produtos ao pedido
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content - Com scroll independente */}
          <div className="p-6 space-y-6 max-h-[calc(100vh-300px)] overflow-y-auto">
            {/* Seleção de Fornecedor e Botão de Estoque Baixo */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fornecedor *
                </label>
                <select
                  value={selectedSupplier}
                  onChange={(e) => setSelectedSupplier(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Selecione um fornecedor</option>
                  {suppliers.filter(s => s.active).map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.nome}
                    </option>
                  ))}
                </select>
              </div>

              {/* Botão para adicionar produtos com estoque baixo */}
              {lowStockProducts.length > 0 && (
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={addLowStockProducts}
                    className="w-full py-2 px-4 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors flex items-center justify-center gap-2"
                  >
                    <AlertCircle className="w-4 h-4" />
                    Adicionar produtos com estoque baixo ({lowStockProducts.length})
                  </button>
                </div>
              )}
            </div>

            {/* Carrinho de Compras - Fixo no topo */}
            {orderItems.length > 0 && (
              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 sticky top-0 z-20">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5 text-blue-600" />
                    Carrinho ({orderItems.length} {orderItems.length === 1 ? 'item' : 'itens'})
                  </h3>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Total do Pedido</p>
                    <p className="text-2xl font-bold text-blue-600">
                      Gs. {getTotalAmount().toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {orderItems.map((item) => (
                    <div key={item.product.id} className="bg-white rounded-lg p-3 border border-blue-200">
                      <div className="flex items-start gap-3">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 text-sm">{item.product.nome}</p>
                          <p className="text-xs text-gray-500">Cód: {item.product.codigo}</p>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="flex items-center border rounded-lg overflow-hidden">
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                              className="px-2 py-1 bg-gray-100 hover:bg-gray-200"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => updateQuantity(item.product.id, parseInt(e.target.value) || 0)}
                              className="w-16 text-center border-0 focus:ring-0 py-1 text-sm"
                              min="1"
                            />
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                              className="px-2 py-1 bg-gray-100 hover:bg-gray-200"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>

                          <div className="text-right min-w-[80px]">
                            <p className="text-xs text-gray-500">Subtotal</p>
                            <p className="font-semibold text-sm">{item.subtotal.toLocaleString()}</p>
                          </div>

                          <button
                            type="button"
                            onClick={() => removeItem(item.product.id)}
                            className="text-red-600 hover:text-red-800 p-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Grid de Produtos */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {selectedSupplier ? 'Produtos deste Fornecedor' : 'Selecione um fornecedor para ver os produtos'}
              </h3>
              {selectedSupplier ? (
                <ProductsGridForOrders
                  onAddToOrder={addProductToOrder}
                  selectedProducts={new Set(orderItems.map(item => item.product.id))}
                  selectedSupplierId={selectedSupplier}
                />
              ) : (
                <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-8 text-center">
                  <ShoppingCart className="w-16 h-16 text-blue-300 mx-auto mb-4" />
                  <p className="text-gray-600">
                    Selecione um fornecedor acima para visualizar os produtos disponíveis
                  </p>
                </div>
              )}
            </div>

            {/* Observações */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Observações
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
                placeholder="Informações adicionais sobre o pedido..."
              />
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t bg-gray-50 flex items-center justify-between sticky bottom-0">
            <div className="text-sm text-gray-600">
              {orderItems.length > 0 ? (
                <span>
                  {orderItems.length} {orderItems.length === 1 ? 'produto' : 'produtos'} no carrinho
                </span>
              ) : (
                <span>Nenhum produto adicionado</span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading || orderItems.length === 0 || !selectedSupplier}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Criando...
                  </>
                ) : (
                  <>
                    <ShoppingCart className="w-4 h-4" />
                    Criar Pedido (Gs. {getTotalAmount().toLocaleString()})
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

export default PurchaseOrderForm
