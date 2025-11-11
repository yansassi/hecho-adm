import React, { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Search, CheckSquare, Square } from 'lucide-react'
import { supabase, ProductWithCategory } from '../lib/supabase'

interface Promotion {
  id: string
  product_id: string
  discount_type: 'fixed' | 'percentage'
  discount_value: number
  original_price: number
  promotional_price: number
  active: boolean
  created_at: string
  updated_at: string
}

interface PromotionWithProduct extends Promotion {
  product?: ProductWithCategory
}

const Promotions: React.FC = () => {
  const [promotions, setPromotions] = useState<PromotionWithProduct[]>([])
  const [products, setProducts] = useState<ProductWithCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingPromotion, setEditingPromotion] = useState<PromotionWithProduct | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set())
  const [formData, setFormData] = useState({
    product_id: '',
    discount_type: 'percentage' as 'fixed' | 'percentage',
    discount_value: 0,
    active: true
  })

  useEffect(() => {
    fetchPromotions()
    fetchProducts()
  }, [])

  const fetchPromotions = async () => {
    try {
      const { data, error } = await supabase
        .from('promotions')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      const promotionsData: PromotionWithProduct[] = data || []

      for (const promo of promotionsData) {
        const { data: product } = await supabase
          .from('products')
          .select('*, categories(id, name, description)')
          .eq('id', promo.product_id)
          .maybeSingle()

        if (product) {
          promo.product = {
            ...product,
            categories: product.categories as any
          }
        }
      }

      setPromotions(promotionsData)
    } catch (error) {
      console.error('Erro ao buscar promoções:', error)
    } finally {
      setLoading(false)
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

  const calculatePromotionalPrice = (price: number, discountType: string, discountValue: number) => {
    if (discountType === 'percentage') {
      return price - (price * discountValue / 100)
    } else {
      return Math.max(0, price - discountValue)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.product_id) {
      alert('Selecione um produto')
      return
    }

    if (formData.discount_value <= 0) {
      alert('O desconto deve ser maior que 0')
      return
    }

    const product = products.find(p => p.id === formData.product_id)
    if (!product) {
      alert('Produto não encontrado')
      return
    }

    const original_price = product.price
    const promotional_price = calculatePromotionalPrice(original_price, formData.discount_type, formData.discount_value)

    try {
      if (editingPromotion) {
        const { error } = await supabase
          .from('promotions')
          .update({
            discount_type: formData.discount_type,
            discount_value: formData.discount_value,
            original_price,
            promotional_price,
            active: formData.active,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingPromotion.id)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('promotions')
          .insert([{
            product_id: formData.product_id,
            discount_type: formData.discount_type,
            discount_value: formData.discount_value,
            original_price,
            promotional_price,
            active: formData.active
          }])

        if (error) throw error
      }

      await fetchPromotions()
      resetForm()
    } catch (error) {
      console.error('Erro ao salvar promoção:', error)
      alert('Erro ao salvar promoção. Verifique se o produto já não está em promoção.')
    }
  }

  const deletePromotion = async (id: string) => {
    if (!confirm('Tem certeza que deseja remover esta promoção?')) return

    try {
      const { error } = await supabase
        .from('promotions')
        .delete()
        .eq('id', id)

      if (error) throw error
      await fetchPromotions()
    } catch (error) {
      console.error('Erro ao excluir promoção:', error)
    }
  }

  const startEdit = (promotion: PromotionWithProduct) => {
    setEditingPromotion(promotion)
    setFormData({
      product_id: promotion.product_id,
      discount_type: promotion.discount_type,
      discount_value: promotion.discount_value,
      active: promotion.active
    })
    setShowForm(true)
  }

  const resetForm = () => {
    setEditingPromotion(null)
    setFormData({
      product_id: '',
      discount_type: 'percentage',
      discount_value: 0,
      active: true
    })
    setShowForm(false)
  }

  const toggleSelectProduct = (id: string) => {
    const newSelected = new Set(selectedProducts)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedProducts(newSelected)
  }

  const getProductsNotInPromotion = () => {
    const promotedProductIds = new Set(promotions.map(p => p.product_id))
    return products.filter(p => !promotedProductIds.has(p.id))
  }

  const filteredProducts = getProductsNotInPromotion().filter(product => {
    const searchLower = searchTerm.toLowerCase()
    return (
      product.nome.toLowerCase().includes(searchLower) ||
      product.codigo.toLowerCase().includes(searchLower)
    )
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Promoções</h1>
          <p className="text-gray-600">Gerencie produtos em promoção com desconto</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Adicionar Promoção
        </button>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-lg shadow-sm border space-y-6">
          <h3 className="text-lg font-semibold text-gray-900">
            {editingPromotion ? 'Editar Promoção' : 'Nova Promoção'}
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  {editingPromotion ? 'Produto' : 'Selecione um Produto'}
                </label>
                {editingPromotion ? (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-300">
                    {editingPromotion.product?.image_url && (
                      <img
                        src={editingPromotion.product.image_url}
                        alt={editingPromotion.product.nome}
                        className="w-12 h-12 rounded object-cover"
                      />
                    )}
                    <div>
                      <p className="font-medium text-gray-900">{editingPromotion.product?.nome}</p>
                      <p className="text-sm text-gray-500">{editingPromotion.product?.codigo}</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="text"
                        placeholder="Buscar produto..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <select
                      value={formData.product_id}
                      onChange={(e) => setFormData(prev => ({ ...prev, product_id: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      <option value="">Selecione um produto</option>
                      {filteredProducts.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.codigo} - {product.nome} (₲ {Number(product.price).toLocaleString('es-PY')})
                        </option>
                      ))}
                    </select>

                    {filteredProducts.length === 0 && !editingPromotion && (
                      <p className="text-sm text-gray-500">Todos os produtos já estão em promoção ou não há produtos disponíveis.</p>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de Desconto
                </label>
                <select
                  value={formData.discount_type}
                  onChange={(e) => setFormData(prev => ({ ...prev, discount_type: e.target.value as 'fixed' | 'percentage' }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="percentage">Porcentagem (%)</option>
                  <option value="fixed">Valor Fixo (₲)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Valor do Desconto
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.discount_value}
                  onChange={(e) => setFormData(prev => ({ ...prev, discount_value: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={formData.discount_type === 'percentage' ? 'Ex: 20' : 'Ex: 5000'}
                  required
                />
              </div>
            </div>

            {editingPromotion && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div>
                  <p className="text-xs text-gray-600 mb-1">Preço Original</p>
                  <p className="font-bold text-lg text-gray-900">
                    ₲ {Number(editingPromotion.original_price).toLocaleString('es-PY')}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 mb-1">Preço Promoção</p>
                  <p className="font-bold text-lg text-green-600">
                    ₲ {Number(editingPromotion.promotional_price).toLocaleString('es-PY')}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 mb-1">Economia</p>
                  <p className="font-bold text-lg text-green-700">
                    ₲ {Number(editingPromotion.original_price - editingPromotion.promotional_price).toLocaleString('es-PY')}
                  </p>
                </div>
              </div>
            )}

            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.active}
                  onChange={(e) => setFormData(prev => ({ ...prev, active: e.target.checked }))}
                  className="w-4 h-4 rounded border-gray-300"
                />
                <span className="text-sm font-medium text-gray-700">Ativar promoção</span>
              </label>
            </div>

            <div className="flex gap-3 pt-4 border-t">
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                {editingPromotion ? 'Atualizar' : 'Criar'} Promoção
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        {promotions.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 mb-4">Nenhuma promoção cadastrada.</p>
            <button
              onClick={() => setShowForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Criar Primeira Promoção
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left py-3 px-6 font-medium text-gray-900">Código</th>
                  <th className="text-left py-3 px-6 font-medium text-gray-900">Produto</th>
                  <th className="text-left py-3 px-6 font-medium text-gray-900">Preço Original</th>
                  <th className="text-left py-3 px-6 font-medium text-gray-900">Desconto</th>
                  <th className="text-left py-3 px-6 font-medium text-gray-900">Preço Promoção</th>
                  <th className="text-left py-3 px-6 font-medium text-gray-900">Economia</th>
                  <th className="text-left py-3 px-6 font-medium text-gray-900">Status</th>
                  <th className="text-left py-3 px-6 font-medium text-gray-900">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {promotions.map((promotion) => {
                  const savings = promotion.original_price - promotion.promotional_price
                  const savingsPercent = (savings / promotion.original_price * 100).toFixed(1)

                  return (
                    <tr key={promotion.id} className="hover:bg-gray-50">
                      <td className="py-4 px-6">
                        <span className="font-mono text-sm text-gray-900">
                          {promotion.product?.codigo || '-'}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          {promotion.product?.image_url && (
                            <img
                              src={promotion.product.image_url}
                              alt={promotion.product.nome}
                              className="w-10 h-10 rounded object-cover"
                            />
                          )}
                          <div>
                            <p className="font-medium text-gray-900">{promotion.product?.nome || 'Produto não encontrado'}</p>
                            {promotion.product?.categories && (
                              <p className="text-xs text-gray-500">{promotion.product.categories.name}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className="font-medium text-gray-900">
                          ₲ {Number(promotion.original_price).toLocaleString('es-PY')}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="font-medium text-orange-600">
                          {promotion.discount_type === 'percentage'
                            ? `${promotion.discount_value}%`
                            : `₲ ${Number(promotion.discount_value).toLocaleString('es-PY')}`}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="font-bold text-green-600 text-lg">
                          ₲ {Number(promotion.promotional_price).toLocaleString('es-PY')}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="text-sm">
                          <p className="font-medium text-green-700">₲ {Number(savings).toLocaleString('es-PY')}</p>
                          <p className="text-gray-500">{savingsPercent}%</p>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`px-2 py-1 rounded-full text-sm font-medium ${
                          promotion.active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {promotion.active ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => startEdit(promotion)}
                            className="p-1 text-gray-600 hover:text-blue-600 transition-colors"
                            title="Editar promoção"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deletePromotion(promotion.id)}
                            className="p-1 text-gray-600 hover:text-red-600 transition-colors"
                            title="Deletar promoção"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default Promotions
