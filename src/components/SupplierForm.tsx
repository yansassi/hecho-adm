import React, { useState, useEffect } from 'react'
import { X, Save } from 'lucide-react'
import { supabase, Fornecedor, Product } from '../lib/supabase'

interface SupplierFormProps {
  supplier?: Fornecedor
  onClose: () => void
  onSave: () => void
}

const SupplierForm: React.FC<SupplierFormProps> = ({ supplier, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    nome: '',
    razao_social: '',
    ruc: '',
    email: '',
    telefone: '',
    endereco: '',
    cidade: '',
    estado: '',
    observacoes: '',
    active: true
  })

  const [products, setProducts] = useState<Product[]>([])
  const [selectedProducts, setSelectedProducts] = useState<{ [key: string]: { product_id: string; preco_fornecedor: number } }>({})
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<{[key: string]: string}>({})
  const [searchProduct, setSearchProduct] = useState('')
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])

  const isEditing = supplier && supplier.id

  useEffect(() => {
    fetchProducts()
    if (supplier && supplier.id) {
      setFormData({
        nome: supplier.nome || '',
        razao_social: supplier.razao_social || '',
        ruc: supplier.ruc || '',
        email: supplier.email || '',
        telefone: supplier.telefone || '',
        endereco: supplier.endereco || '',
        cidade: supplier.cidade || '',
        estado: supplier.estado || '',
        observacoes: supplier.observacoes || '',
        active: supplier.active ?? true
      })
      if (isEditing) {
        fetchSupplierProducts()
      }
    }
  }, [supplier])

  useEffect(() => {
    if (searchProduct.trim()) {
      const filtered = products.filter(p =>
        p.nome.toLowerCase().includes(searchProduct.toLowerCase()) ||
        p.codigo.toLowerCase().includes(searchProduct.toLowerCase())
      )
      setFilteredProducts(filtered)
    } else {
      setFilteredProducts([])
    }
  }, [searchProduct, products])

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('active', true)
        .order('nome')

      if (error) throw error
      setProducts(data || [])
    } catch (error) {
      console.error('Erro ao buscar produtos:', error)
    }
  }

  const fetchSupplierProducts = async () => {
    if (!supplier?.id) return
    try {
      const { data, error } = await supabase
        .from('fornecedor_produtos')
        .select('*')
        .eq('fornecedor_id', supplier.id)

      if (error) throw error
      if (data) {
        const selected: { [key: string]: { product_id: string; preco_fornecedor: number } } = {}
        data.forEach(item => {
          selected[item.product_id] = {
            product_id: item.product_id,
            preco_fornecedor: item.preco_fornecedor
          }
        })
        setSelectedProducts(selected)
      }
    } catch (error) {
      console.error('Erro ao buscar produtos do fornecedor:', error)
    }
  }

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {}

    if (!formData.nome.trim()) {
      newErrors.nome = 'Nome é obrigatório'
    }

    if (!formData.ruc.trim()) {
      newErrors.ruc = 'RUC é obrigatório'
    }

    if (!formData.telefone.trim()) {
      newErrors.telefone = 'Telefone é obrigatório'
    }

    if (!formData.cidade.trim()) {
      newErrors.cidade = 'Cidade é obrigatória'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setLoading(true)

    try {
      const supplierData = {
        nome: formData.nome,
        razao_social: formData.razao_social,
        ruc: formData.ruc,
        email: formData.email,
        telefone: formData.telefone,
        endereco: formData.endereco,
        cidade: formData.cidade,
        estado: formData.estado,
        observacoes: formData.observacoes,
        active: formData.active,
        updated_at: new Date().toISOString()
      }

      let supplierId = supplier?.id

      if (isEditing) {
        const { error } = await supabase
          .from('fornecedores')
          .update(supplierData)
          .eq('id', supplierId)

        if (error) throw error
      } else {
        const { data, error } = await supabase
          .from('fornecedores')
          .insert([supplierData])
          .select()

        if (error) throw error
        if (data && data[0]) {
          supplierId = data[0].id
        }
      }

      if (supplierId) {
        await deleteRemovedProducts(supplierId)
        await insertOrUpdateProducts(supplierId)
      }

      onSave()
      onClose()
    } catch (error) {
      console.error('Erro ao salvar fornecedor:', error)
      alert(`Erro ao salvar fornecedor: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const deleteRemovedProducts = async (supplierId: string) => {
    try {
      const { data: currentProducts, error: fetchError } = await supabase
        .from('fornecedor_produtos')
        .select('product_id')
        .eq('fornecedor_id', supplierId)

      if (fetchError) throw fetchError

      if (currentProducts) {
        const productsToDelete = currentProducts.filter(
          p => !selectedProducts[p.product_id]
        )

        for (const product of productsToDelete) {
          const { error: deleteError } = await supabase
            .from('fornecedor_produtos')
            .delete()
            .eq('fornecedor_id', supplierId)
            .eq('product_id', product.product_id)

          if (deleteError) throw deleteError
        }
      }
    } catch (error) {
      console.error('Erro ao deletar produtos removidos:', error)
    }
  }

  const insertOrUpdateProducts = async (supplierId: string) => {
    try {
      for (const [productId, data] of Object.entries(selectedProducts)) {
        const { data: existing, error: checkError } = await supabase
          .from('fornecedor_produtos')
          .select('id')
          .eq('fornecedor_id', supplierId)
          .eq('product_id', productId)
          .maybeSingle()

        if (checkError) throw checkError

        if (existing) {
          const { error: updateError } = await supabase
            .from('fornecedor_produtos')
            .update({
              preco_fornecedor: data.preco_fornecedor,
              updated_at: new Date().toISOString()
            })
            .eq('id', existing.id)

          if (updateError) throw updateError
        } else {
          const { error: insertError } = await supabase
            .from('fornecedor_produtos')
            .insert([{
              fornecedor_id: supplierId,
              product_id: productId,
              preco_fornecedor: data.preco_fornecedor
            }])

          if (insertError) throw insertError
        }
      }
    } catch (error) {
      console.error('Erro ao inserir/atualizar produtos:', error)
      throw error
    }
  }

  const handleAddProduct = (product: Product) => {
    setSelectedProducts(prev => ({
      ...prev,
      [product.id]: {
        product_id: product.id,
        preco_fornecedor: 0
      }
    }))
    setSearchProduct('')
    setFilteredProducts([])
  }

  const handleRemoveProduct = (productId: string) => {
    setSelectedProducts(prev => {
      const newSelected = { ...prev }
      delete newSelected[productId]
      return newSelected
    })
  }

  const handleUpdatePrice = (productId: string, price: number) => {
    setSelectedProducts(prev => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        preco_fornecedor: price
      }
    }))
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">
            {isEditing ? 'Editar Fornecedor' : 'Novo Fornecedor'}
          </h2>
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
                Nome *
              </label>
              <input
                type="text"
                value={formData.nome}
                onChange={(e) => handleInputChange('nome', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.nome ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Nome do fornecedor"
              />
              {errors.nome && <p className="text-red-600 text-sm mt-1">{errors.nome}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Razão Social
              </label>
              <input
                type="text"
                value={formData.razao_social}
                onChange={(e) => handleInputChange('razao_social', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Razão social"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                RUC *
              </label>
              <input
                type="text"
                value={formData.ruc}
                onChange={(e) => handleInputChange('ruc', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.ruc ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Registro Único del Contribuyente"
              />
              {errors.ruc && <p className="text-red-600 text-sm mt-1">{errors.ruc}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="email@fornecedor.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Telefone *
              </label>
              <input
                type="tel"
                value={formData.telefone}
                onChange={(e) => handleInputChange('telefone', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.telefone ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="(XX) XXXXX-XXXX"
              />
              {errors.telefone && <p className="text-red-600 text-sm mt-1">{errors.telefone}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Estado
              </label>
              <input
                type="text"
                value={formData.estado}
                onChange={(e) => handleInputChange('estado', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ex: Asunción, Central"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cidade *
              </label>
              <input
                type="text"
                value={formData.cidade}
                onChange={(e) => handleInputChange('cidade', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.cidade ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Cidade"
              />
              {errors.cidade && <p className="text-red-600 text-sm mt-1">{errors.cidade}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Endereço
              </label>
              <input
                type="text"
                value={formData.endereco}
                onChange={(e) => handleInputChange('endereco', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Rua, número, complemento"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Observações
              </label>
              <textarea
                value={formData.observacoes}
                onChange={(e) => handleInputChange('observacoes', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Observações adicionais sobre o fornecedor"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={formData.active.toString()}
                onChange={(e) => handleInputChange('active', e.target.value === 'true')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="true">Ativo</option>
                <option value="false">Inativo</option>
              </select>
            </div>
          </div>

          <div className="border-t pt-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Produtos Oferecidos</h3>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Buscar Produto
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={searchProduct}
                  onChange={(e) => setSearchProduct(e.target.value)}
                  placeholder="Digite nome ou código do produto"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {filteredProducts.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10">
                    <div className="max-h-48 overflow-y-auto">
                      {filteredProducts.map(product => (
                        <button
                          key={product.id}
                          type="button"
                          onClick={() => handleAddProduct(product)}
                          className="w-full text-left px-4 py-2 hover:bg-blue-50 transition-colors"
                        >
                          <div className="font-medium text-gray-900">{product.nome}</div>
                          <div className="text-sm text-gray-600">{product.codigo}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {Object.keys(selectedProducts).length > 0 ? (
              <div className="bg-gray-50 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-gray-100">
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Produto</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Código</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Preço Fornecedor</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(selectedProducts).map(([productId, data]) => {
                      const product = products.find(p => p.id === productId)
                      return (
                        <tr key={productId} className="border-b hover:bg-gray-100">
                          <td className="px-4 py-3">{product?.nome || 'Produto não encontrado'}</td>
                          <td className="px-4 py-3 text-gray-600">{product?.codigo}</td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={data.preco_fornecedor}
                              onChange={(e) => handleUpdatePrice(productId, parseFloat(e.target.value) || 0)}
                              className="w-24 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveProduct(productId)}
                              className="text-red-600 hover:text-red-800 text-sm font-medium"
                            >
                              Remover
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500 text-sm">Nenhum produto selecionado. Use a busca acima para adicionar.</p>
            )}
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
              {isEditing ? 'Atualizar' : 'Criar'} Fornecedor
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default SupplierForm
