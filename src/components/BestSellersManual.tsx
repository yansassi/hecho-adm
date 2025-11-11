import React, { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Award, Search, CheckSquare, Square } from 'lucide-react'
import { supabase, ProductWithCategory } from '../lib/supabase'

interface BestSeller {
  id: string
  product_id: string
  display_order: number
  active: boolean
  created_at: string
  updated_at: string
}

const BestSellersManual: React.FC = () => {
  const [bestSellers, setBestSellers] = useState<BestSeller[]>([])
  const [products, setProducts] = useState<ProductWithCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingBestSeller, setEditingBestSeller] = useState<BestSeller | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [formData, setFormData] = useState({
    product_id: '',
    display_order: 1,
    active: true
  })

  useEffect(() => {
    fetchBestSellers()
    fetchProducts()
  }, [])

  const fetchBestSellers = async () => {
    try {
      const { data, error } = await supabase
        .from('best_sellers')
        .select('*')
        .order('display_order')

      if (error) throw error
      setBestSellers(data || [])
    } catch (error) {
      console.error('Erro ao buscar mais vendidos:', error)
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.product_id) {
      alert('Selecione um produto')
      return
    }

    try {
      if (editingBestSeller) {
        const { error } = await supabase
          .from('best_sellers')
          .update({
            display_order: formData.display_order,
            active: formData.active,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingBestSeller.id)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('best_sellers')
          .insert([{
            product_id: formData.product_id,
            display_order: formData.display_order,
            active: formData.active
          }])

        if (error) throw error
      }

      await fetchBestSellers()
      resetForm()
    } catch (error) {
      console.error('Erro ao salvar mais vendido:', error)
      alert('Erro ao salvar. Verifique se o produto já não está marcado como mais vendido.')
    }
  }

  const deleteBestSeller = async (id: string) => {
    if (!confirm('Tem certeza que deseja remover este produto dos mais vendidos?')) return

    try {
      const { error } = await supabase
        .from('best_sellers')
        .delete()
        .eq('id', id)

      if (error) throw error
      await fetchBestSellers()
    } catch (error) {
      console.error('Erro ao excluir mais vendido:', error)
    }
  }

  const startEdit = (bestSeller: BestSeller) => {
    setEditingBestSeller(bestSeller)
    setFormData({
      product_id: bestSeller.product_id,
      display_order: bestSeller.display_order,
      active: bestSeller.active
    })
    setShowForm(true)
  }

  const resetForm = () => {
    setEditingBestSeller(null)
    setFormData({
      product_id: '',
      display_order: 1,
      active: true
    })
    setShowForm(false)
  }

  const getProductById = (id: string) => {
    return products.find(p => p.id === id)
  }

  const filteredProducts = products.filter(product => {
    const searchLower = searchTerm.toLowerCase()
    return (
      product.nome.toLowerCase().includes(searchLower) ||
      product.codigo.toLowerCase().includes(searchLower)
    )
  })

  const getProductsNotInBestSellers = () => {
    const bestSellerProductIds = new Set(bestSellers.map(bs => bs.product_id))
    return products.filter(p => !bestSellerProductIds.has(p.id))
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
      <div className="flex justify-between items-center">
        <div>
          <p className="text-sm text-gray-600">
            Selecione manualmente produtos para marcar como mais vendidos
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Adicionar Produto
        </button>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-lg shadow-sm border space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">
            {editingBestSeller ? 'Editar Mais Vendido' : 'Novo Mais Vendido'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {editingBestSeller ? 'Produto' : 'Selecione um Produto'}
                </label>
                {editingBestSeller ? (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-300">
                    {(() => {
                      const product = getProductById(editingBestSeller.product_id)
                      return product ? (
                        <>
                          {product.image_url && (
                            <img
                              src={product.image_url}
                              alt={product.nome}
                              className="w-12 h-12 rounded object-cover"
                            />
                          )}
                          <div>
                            <p className="font-medium text-gray-900">{product.nome}</p>
                            <p className="text-sm text-gray-500">{product.codigo}</p>
                          </div>
                        </>
                      ) : (
                        <p className="text-gray-500">Produto não encontrado</p>
                      )
                    })()}
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
                      {filteredProducts
                        .filter(p => !bestSellers.find(bs => bs.product_id === p.id))
                        .map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.codigo} - {product.nome}
                          </option>
                        ))}
                    </select>

                    {getProductsNotInBestSellers().length === 0 && (
                      <p className="text-sm text-gray-500">
                        Todos os produtos disponíveis já estão marcados como mais vendidos.
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ordem de Exibição
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.display_order}
                  onChange={(e) => setFormData(prev => ({ ...prev, display_order: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div className="flex items-center">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.active}
                    onChange={(e) => setFormData(prev => ({ ...prev, active: e.target.checked }))}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <span className="text-sm font-medium text-gray-700">Ativo</span>
                </label>
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t">
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                {editingBestSeller ? 'Atualizar' : 'Adicionar'}
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

      <div className="bg-white rounded-lg border overflow-hidden">
        {bestSellers.length === 0 ? (
          <div className="text-center py-12">
            <Award className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">Nenhum produto marcado como mais vendido.</p>
            <button
              onClick={() => setShowForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Adicionar Primeiro Produto
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-3 px-6 font-medium text-gray-900">Ordem</th>
                  <th className="text-left py-3 px-6 font-medium text-gray-900">Código</th>
                  <th className="text-left py-3 px-6 font-medium text-gray-900">Produto</th>
                  <th className="text-left py-3 px-6 font-medium text-gray-900">Imagem</th>
                  <th className="text-left py-3 px-6 font-medium text-gray-900">Status</th>
                  <th className="text-left py-3 px-6 font-medium text-gray-900">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {bestSellers.map((bestSeller) => {
                  const product = getProductById(bestSeller.product_id)
                  return (
                    <tr key={bestSeller.id} className="hover:bg-gray-50">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <Award className="w-4 h-4 text-orange-500 fill-orange-500" />
                          <span className="font-medium text-gray-900">{bestSeller.display_order}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className="font-mono text-sm text-gray-900">
                          {product?.codigo || '-'}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        {product ? (
                          <div>
                            <p className="font-medium text-gray-900">{product.nome}</p>
                            <p className="text-sm text-gray-600">
                              ₲ {Number(product.price).toLocaleString('es-PY')}
                            </p>
                          </div>
                        ) : (
                          <span className="text-red-600 text-sm">Produto não encontrado</span>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        {product?.image_url && (
                          <img
                            src={product.image_url}
                            alt={product.nome}
                            className="w-16 h-16 rounded-lg object-cover"
                          />
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <span className={`px-2 py-1 rounded-full text-sm ${
                          bestSeller.active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {bestSeller.active ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => startEdit(bestSeller)}
                            className="p-1 text-gray-600 hover:text-blue-600 transition-colors"
                            title="Editar"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteBestSeller(bestSeller.id)}
                            className="p-1 text-gray-600 hover:text-red-600 transition-colors"
                            title="Remover"
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

export default BestSellersManual
