import React, { useState, useEffect } from 'react'
import { X, Save, Plus, Trash2, Search, BookOpen } from 'lucide-react'
import { supabase, ProductWithCategory } from '../lib/supabase'
import ProductCatalogModal from './ProductCatalogModal'

interface Client {
  id: string
  name: string
  email: string
  phone: string
  ruc: string
}

interface SaleItem {
  product_id: string
  product_code: string
  product_name: string
  quantity: number
  unit_price: number
  subtotal: number
}

interface Promotion {
  product_id: string
  promotional_price: number
  discount_value: number
  discount_type: 'fixed' | 'percentage'
  active: boolean
}

interface SaleFormProps {
  onClose: () => void
  onSave: () => void
}

const SaleForm: React.FC<SaleFormProps> = ({ onClose, onSave }) => {
  const [clients, setClients] = useState<Client[]>([])
  const [products, setProducts] = useState<ProductWithCategory[]>([])
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [loading, setLoading] = useState(false)
  const [searchProduct, setSearchProduct] = useState('')
  const [selectedClient, setSelectedClient] = useState<string>('')
  const [saleItems, setSaleItems] = useState<SaleItem[]>([])
  const [discountAmount, setDiscountAmount] = useState(0)
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [paymentStatus, setPaymentStatus] = useState('pending')
  const [notes, setNotes] = useState('')
  const [showCatalogModal, setShowCatalogModal] = useState(false)

  useEffect(() => {
    fetchClients()
    fetchProducts()
    fetchPromotions()
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

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*, categories(id, name, description)')
        .eq('active', true)
        .order('nome')

      if (error) throw error

      const productsData = (data || []).map(product => ({
        ...product,
        categories: product.categories as any
      }))

      setProducts(productsData)
    } catch (error) {
      console.error('Erro ao buscar produtos:', error)
    }
  }

  const fetchPromotions = async () => {
    try {
      const { data, error } = await supabase
        .from('promotions')
        .select('product_id, promotional_price, discount_value, discount_type, active')
        .eq('active', true)

      if (error) throw error
      setPromotions(data || [])
    } catch (error) {
      console.error('Erro ao buscar promoções:', error)
    }
  }

  const getProductPrice = (product: ProductWithCategory): number => {
    const promotion = promotions.find(p => p.product_id === product.id && p.active)
    return promotion ? promotion.promotional_price : Number(product.price)
  }

  const addProduct = (product: ProductWithCategory) => {
    const existingItem = saleItems.find(item => item.product_id === product.id)

    if (existingItem) {
      updateItemQuantity(product.id, existingItem.quantity + 1)
    } else {
      const finalPrice = getProductPrice(product)
      const newItem: SaleItem = {
        product_id: product.id,
        product_code: product.codigo,
        product_name: product.nome,
        quantity: 1,
        unit_price: finalPrice,
        subtotal: finalPrice
      }
      setSaleItems([...saleItems, newItem])
    }
    setSearchProduct('')
  }

  const handleSelectProductsFromCatalog = (selectedProducts: ProductWithCategory[]) => {
    selectedProducts.forEach(product => {
      const existingItem = saleItems.find(item => item.product_id === product.id)

      if (!existingItem) {
        const finalPrice = getProductPrice(product)
        const newItem: SaleItem = {
          product_id: product.id,
          product_code: product.codigo,
          product_name: product.nome,
          quantity: 1,
          unit_price: finalPrice,
          subtotal: finalPrice
        }
        setSaleItems(prevItems => [...prevItems, newItem])
      }
    })
    setShowCatalogModal(false)
  }

  const updateItemQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(productId)
      return
    }

    setSaleItems(saleItems.map(item =>
      item.product_id === productId
        ? { ...item, quantity, subtotal: item.unit_price * quantity }
        : item
    ))
  }

  const updateItemPrice = (productId: string, price: number) => {
    setSaleItems(saleItems.map(item =>
      item.product_id === productId
        ? { ...item, unit_price: price, subtotal: price * item.quantity }
        : item
    ))
  }

  const removeItem = (productId: string) => {
    setSaleItems(saleItems.filter(item => item.product_id !== productId))
  }

  const calculateTotal = () => {
    return saleItems.reduce((sum, item) => sum + item.subtotal, 0)
  }

  const calculateFinalAmount = () => {
    return Math.max(0, calculateTotal() - discountAmount)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (saleItems.length === 0) {
      alert('Adicione pelo menos um produto à venda.')
      return
    }

    setLoading(true)

    try {
      const { data: saleNumberData } = await supabase
        .rpc('generate_sale_number')

      const saleNumber = saleNumberData || `VENDA-${Date.now()}`

      const totalAmount = calculateTotal()
      const finalAmount = calculateFinalAmount()

      const { data: saleData, error: saleError } = await supabase
        .from('sales')
        .insert([{
          sale_number: saleNumber,
          client_id: selectedClient || null,
          sale_date: new Date().toISOString(),
          total_amount: totalAmount,
          discount_amount: discountAmount,
          final_amount: finalAmount,
          payment_method: paymentMethod,
          payment_status: paymentStatus,
          notes: notes || null
        }])
        .select()
        .single()

      if (saleError) throw saleError

      const itemsToInsert = saleItems.map(item => ({
        sale_id: saleData.id,
        product_id: item.product_id,
        product_code: item.product_code,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        subtotal: item.subtotal
      }))

      const { error: itemsError } = await supabase
        .from('sale_items')
        .insert(itemsToInsert)

      if (itemsError) throw itemsError

      onSave()
      onClose()
    } catch (error) {
      console.error('Erro ao salvar venda:', error)
      alert('Erro ao salvar venda. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const filteredProducts = products.filter(product => {
    const searchLower = searchProduct.toLowerCase()
    const codigoSemHifen = product.codigo.replace(/-/g, '').toLowerCase()
    const searchSemHifen = searchLower.replace(/-/g, '')

    return (
      product.nome.toLowerCase().includes(searchLower) ||
      product.codigo.toLowerCase().includes(searchLower) ||
      codigoSemHifen.includes(searchSemHifen)
    )
  })

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">Nova Venda</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cliente
              </label>
              <select
                value={selectedClient}
                onChange={(e) => setSelectedClient(e.target.value)}
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
                Método de Pagamento
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
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
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value)}
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
                step="0.01"
                value={discountAmount}
                onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Observações
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Observações sobre a venda"
            />
          </div>

          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Produtos da Venda</h3>

            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Buscar Produto
                </label>
                <button
                  type="button"
                  onClick={() => setShowCatalogModal(true)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <BookOpen className="w-4 h-4" />
                  Ver Catálogo
                </button>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  value={searchProduct}
                  onChange={(e) => setSearchProduct(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Digite o nome ou código do produto..."
                />
              </div>

              {searchProduct && (
                <div className="mt-2 border border-gray-300 rounded-lg max-h-48 overflow-y-auto">
                  {filteredProducts.map((product) => {
                    const promotion = promotions.find(p => p.product_id === product.id && p.active)
                    const finalPrice = promotion ? promotion.promotional_price : Number(product.price)
                    return (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => addProduct(product)}
                        className="w-full text-left px-4 py-2 hover:bg-gray-100 transition-colors flex items-center justify-between"
                      >
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{product.nome}</p>
                          <p className="text-xs text-gray-500">
                            Código: {product.codigo} | Estoque: {product.stock}
                          </p>
                        </div>
                        <div className="text-right ml-2">
                          {promotion ? (
                            <div>
                              <span className="text-xs text-red-600 font-bold block">PROMOÇÃO</span>
                              <span className="text-xs text-gray-400 line-through block">
                                ₲ {Number(product.price).toLocaleString('es-PY')}
                              </span>
                              <span className="text-sm font-bold text-red-600">
                                ₲ {finalPrice.toLocaleString('es-PY')}
                              </span>
                            </div>
                          ) : (
                            <span className="text-sm font-medium text-blue-600">
                              ₲ {finalPrice.toLocaleString('es-PY')}
                            </span>
                          )}
                        </div>
                      </button>
                    )
                  })}
                  {filteredProducts.length === 0 && (
                    <div className="px-4 py-3 text-gray-500 text-sm">
                      Nenhum produto encontrado.
                    </div>
                  )}
                </div>
              )}
            </div>

            {saleItems.length > 0 ? (
              <div className="overflow-x-auto border border-gray-300 rounded-lg">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left py-2 px-4 text-sm font-medium text-gray-900">Código</th>
                      <th className="text-left py-2 px-4 text-sm font-medium text-gray-900">Produto</th>
                      <th className="text-center py-2 px-4 text-sm font-medium text-gray-900">Qtd.</th>
                      <th className="text-right py-2 px-4 text-sm font-medium text-gray-900">Preço Unit.</th>
                      <th className="text-right py-2 px-4 text-sm font-medium text-gray-900">Subtotal</th>
                      <th className="text-center py-2 px-4 text-sm font-medium text-gray-900">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {saleItems.map((item) => (
                      <tr key={item.product_id}>
                        <td className="py-2 px-4 text-sm font-mono">{item.product_code}</td>
                        <td className="py-2 px-4 text-sm">{item.product_name}</td>
                        <td className="py-2 px-4">
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateItemQuantity(item.product_id, parseInt(e.target.value) || 1)}
                            className="w-20 px-2 py-1 text-center border border-gray-300 rounded"
                          />
                        </td>
                        <td className="py-2 px-4">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unit_price}
                            onChange={(e) => updateItemPrice(item.product_id, parseFloat(e.target.value) || 0)}
                            className="w-28 px-2 py-1 text-right border border-gray-300 rounded"
                          />
                        </td>
                        <td className="py-2 px-4 text-sm text-right font-medium">
                          ₲ {item.subtotal.toLocaleString('es-PY')}
                        </td>
                        <td className="py-2 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => removeItem(item.product_id)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Remover produto"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 border border-gray-300 rounded-lg">
                Nenhum produto adicionado. Use o campo de busca acima para adicionar produtos.
              </div>
            )}
          </div>

          <div className="border-t pt-6 space-y-3">
            <div className="flex justify-between text-lg">
              <span className="text-gray-700">Subtotal:</span>
              <span className="font-semibold">₲ {calculateTotal().toLocaleString('es-PY')}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-lg">
                <span className="text-gray-700">Desconto:</span>
                <span className="font-semibold text-red-600">- ₲ {discountAmount.toLocaleString('es-PY')}</span>
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
              disabled={loading || saleItems.length === 0}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <Save className="w-4 h-4" />
              )}
              Finalizar Venda
            </button>
          </div>
        </form>
      </div>

      {showCatalogModal && (
        <ProductCatalogModal
          onClose={() => setShowCatalogModal(false)}
          onSelectProducts={handleSelectProductsFromCatalog}
        />
      )}
    </div>
  )
}

export default SaleForm
