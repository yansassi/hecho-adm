import React, { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Star, Search } from 'lucide-react'
import { supabase, ProductWithCategory } from '../lib/supabase'

interface FeaturedProduct {
  id: string
  product_code: string
  display_order: number
  active: boolean
  created_at: string
  updated_at: string
}

const FeaturedProducts: React.FC = () => {
  const [featuredProducts, setFeaturedProducts] = useState<FeaturedProduct[]>([])
  const [products, setProducts] = useState<ProductWithCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingFeatured, setEditingFeatured] = useState<FeaturedProduct | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [formData, setFormData] = useState({
    product_code: '',
    display_order: 1,
    active: true
  })

  useEffect(() => {
    fetchFeaturedProducts()
    fetchProducts()
  }, [])

  const fetchFeaturedProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('featured_products')
        .select('*')
        .order('display_order')

      if (error) throw error
      setFeaturedProducts(data || [])
    } catch (error) {
      console.error('Erro ao buscar produtos em destaque:', error)
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

    if (!formData.product_code) {
      alert('Selecione um produto')
      return
    }

    try {
      if (editingFeatured) {
        const { error } = await supabase
          .from('featured_products')
          .update({
            product_code: formData.product_code,
            display_order: formData.display_order,
            active: formData.active,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingFeatured.id)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('featured_products')
          .insert([{
            product_code: formData.product_code,
            display_order: formData.display_order,
            active: formData.active
          }])

        if (error) throw error
      }

      await fetchFeaturedProducts()
      resetForm()
    } catch (error) {
      console.error('Erro ao salvar produto em destaque:', error)
      alert('Erro ao salvar. Verifique se o código do produto já não está em uso.')
    }
  }

  const deleteFeatured = async (id: string) => {
    if (!confirm('Tem certeza que deseja remover este produto dos destaques?')) return

    try {
      const { error } = await supabase
        .from('featured_products')
        .delete()
        .eq('id', id)

      if (error) throw error
      await fetchFeaturedProducts()
    } catch (error) {
      console.error('Erro ao excluir produto em destaque:', error)
    }
  }

  const startEdit = (featured: FeaturedProduct) => {
    setEditingFeatured(featured)
    setFormData({
      product_code: featured.product_code,
      display_order: featured.display_order,
      active: featured.active
    })
    setShowForm(true)
  }

  const resetForm = () => {
    setEditingFeatured(null)
    setFormData({
      product_code: '',
      display_order: 1,
      active: true
    })
    setShowForm(false)
  }

  const getProductByCode = (code: string) => {
    return products.find(p => p.codigo === code)
  }

  const filteredProducts = products.filter(product => {
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
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <p className="text-sm text-gray-600">Selecione até 6 produtos para aparecer em destaque no site</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Adicionar Destaque
        </button>
      </div>

      {showForm && (
        <div className="bg-gray-50 p-6 rounded-lg border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {editingFeatured ? 'Editar Produto em Destaque' : 'Novo Produto em Destaque'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Produto
              </label>
              <div className="space-y-2">
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
                  value={formData.product_code}
                  onChange={(e) => setFormData(prev => ({ ...prev, product_code: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Selecione um produto</option>
                  {filteredProducts.map((product) => (
                    <option key={product.id} value={product.codigo}>
                      {product.codigo} - {product.nome}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ordem de Exibição (1-6)
              </label>
              <input
                type="number"
                min="1"
                max="6"
                value={formData.display_order}
                onChange={(e) => setFormData(prev => ({ ...prev, display_order: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            <div>
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
            <div className="flex gap-3">
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                {editingFeatured ? 'Atualizar' : 'Adicionar'}
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
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-100">
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
              {featuredProducts.map((featured) => {
                const product = getProductByCode(featured.product_code)
                return (
                  <tr key={featured.id} className="hover:bg-gray-50">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        <span className="font-medium text-gray-900">{featured.display_order}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="font-mono text-sm text-gray-900">
                        {featured.product_code}
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
                        featured.active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {featured.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => startEdit(featured)}
                          className="p-1 text-gray-600 hover:text-blue-600 transition-colors"
                          title="Editar destaque"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteFeatured(featured.id)}
                          className="p-1 text-gray-600 hover:text-red-600 transition-colors"
                          title="Remover destaque"
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

        {featuredProducts.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-600">Nenhum produto em destaque.</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default FeaturedProducts
