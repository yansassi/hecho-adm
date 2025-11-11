import React, { useState, useEffect } from 'react'
import { X, Save, Plus } from 'lucide-react'
import { supabase, ProductWithCategory, Category } from '../lib/supabase'

interface ProductFormProps {
  product?: ProductWithCategory
  onClose: () => void
  onSave: () => void
}

const ProductForm: React.FC<ProductFormProps> = ({ product, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    codigo: '',
    nome: '',
    info: '',
    quantidade: '',
    codigo_barra: '',
    description: '',
    price: 0,
    price_atacado: 0,
    price_interior: 0,
    price_mayorista: 0,
    price_super_mayorista: 0,
    category_id: null as string | null,
    image_url: '',
    stock: 0,
    active: true
  })
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<{[key: string]: string}>({})
  const [showNewCategoryForm, setShowNewCategoryForm] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newCategoryDesc, setNewCategoryDesc] = useState('')
  const [savingCategory, setSavingCategory] = useState(false)

  const isEditing = product && product.id

  useEffect(() => {
    fetchCategories()
    if (product && product.id) {
      setFormData({
        codigo: product.codigo || '',
        nome: product.nome || '',
        info: product.info || '',
        quantidade: product.quantidade || '',
        codigo_barra: product.codigo_barra || '',
        description: product.description || '',
        price: Number(product.price) || 0,
        price_atacado: Number(product.price_atacado) || 0,
        price_interior: Number(product.price_interior) || 0,
        price_mayorista: Number(product.price_mayorista) || 0,
        price_super_mayorista: Number(product.price_super_mayorista) || 0,
        category_id: product.category_id || null,
        image_url: product.image_url || '',
        stock: Number(product.stock) || 0,
        active: Boolean(product.active)
      })
    }
  }, [product])

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name')

      if (error) throw error
      setCategories(data || [])
    } catch (error) {
      console.error('Erro ao buscar categorias:', error)
    }
  }

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {}

    if (!formData.codigo.trim()) {
      newErrors.codigo = 'Código é obrigatório'
    }

    if (!formData.nome.trim()) {
      newErrors.nome = 'Nome é obrigatório'
    }

    if (formData.price < 0) {
      newErrors.price = 'Preço deve ser positivo'
    }

    if (formData.price_atacado < 0) {
      newErrors.price_atacado = 'Preço Atacado deve ser positivo'
    }

    if (formData.price_interior < 0) {
      newErrors.price_interior = 'Preço Interior deve ser positivo'
    }

    if (formData.price_mayorista < 0) {
      newErrors.price_mayorista = 'Preço Mayorista deve ser positivo'
    }

    if (formData.price_super_mayorista < 0) {
      newErrors.price_super_mayorista = 'Preço Super Mayorista deve ser positivo'
    }

    if (formData.stock < 0) {
      newErrors.stock = 'Estoque não pode ser negativo'
    }

    if (!formData.category_id) {
      console.warn('Aviso: Nenhuma categoria foi selecionada para este produto')
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setLoading(true)

    try {
      const categoryIdValue = formData.category_id && typeof formData.category_id === 'string' && formData.category_id.trim() !== ''
        ? formData.category_id.trim()
        : null

      if (categoryIdValue) {
        const { data: categoryExists, error: categoryError } = await supabase
          .from('categories')
          .select('id')
          .eq('id', categoryIdValue)
          .maybeSingle()

        if (categoryError) {
          throw new Error('Erro ao verificar categoria')
        }

        if (!categoryExists) {
          alert('Categoria selecionada não existe. Por favor, selecione uma categoria válida.')
          setLoading(false)
          return
        }
      }

      const productData: any = {
        codigo: formData.codigo,
        nome: formData.nome,
        info: formData.info,
        quantidade: formData.quantidade,
        codigo_barra: formData.codigo_barra.trim() || ' ',
        description: formData.description,
        price: formData.price,
        price_atacado: formData.price_atacado,
        price_interior: formData.price_interior,
        price_mayorista: formData.price_mayorista,
        price_super_mayorista: formData.price_super_mayorista,
        category_id: categoryIdValue,
        image_url: formData.image_url,
        stock: formData.stock,
        active: formData.active,
        updated_at: new Date().toISOString()
      }

      if (isEditing) {
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', product.id)

        if (error) {
          throw error
        }
      } else {
        const { error } = await supabase
          .from('products')
          .insert([productData])

        if (error) {
          throw error
        }
      }

      onSave()
      onClose()
    } catch (error) {
      console.error('Erro ao salvar produto:', error)
      alert(`Erro ao salvar produto: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const generateImageUrl = (codigo: string, categoryId: string) => {
    if (!codigo || !categoryId) return ''

    const category = categories.find(cat => cat.id === categoryId)
    if (!category) return ''

    const categorySlug = category.name.toLowerCase()
    const codigoLimpo = codigo.replace(/-/g, '')

    return `https://hechopy.com/img/${categorySlug}/${codigoLimpo}.webp`
  }

  const handleInputChange = (field: string, value: any) => {
    console.log(`handleInputChange - field: ${field}, value:`, value)
    setFormData(prev => {
      const newData = { ...prev, [field]: value }
      console.log(`formData atualizado - ${field}:`, newData[field])

      if (field === 'category_id' || field === 'codigo') {
        const codigo = field === 'codigo' ? value : prev.codigo
        const categoryId = field === 'category_id' ? value : prev.category_id

        console.log(`Gerando URL - codigo: ${codigo}, categoryId: ${categoryId}`)
        if (codigo && categoryId) {
          newData.image_url = generateImageUrl(codigo, categoryId)
          console.log(`URL gerada: ${newData.image_url}`)
        }
      }

      return newData
    })

    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) {
      alert('Digite o nome da categoria')
      return
    }

    setSavingCategory(true)
    try {
      const { data, error } = await supabase
        .from('categories')
        .insert([{ name: newCategoryName, description: newCategoryDesc }])
        .select()

      if (error) throw error

      setNewCategoryName('')
      setNewCategoryDesc('')
      setShowNewCategoryForm(false)

      await fetchCategories()

      if (data && data[0]) {
        const newCategoryId = data[0].id
        setFormData(prev => {
          const newImageUrl = formData.codigo ? generateImageUrl(formData.codigo, newCategoryId) : ''
          return {
            ...prev,
            category_id: newCategoryId,
            image_url: newImageUrl || prev.image_url
          }
        })
      }
    } catch (error) {
      console.error('Erro ao criar categoria:', error)
      alert(`Erro ao criar categoria: ${error.message}`)
    } finally {
      setSavingCategory(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">
            {isEditing ? 'Editar Produto' : 'Novo Produto'}
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
                Código do Produto *
              </label>
              <input
                type="text"
                value={formData.codigo}
                onChange={(e) => handleInputChange('codigo', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.codigo ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Digite o código do produto"
              />
              {errors.codigo && <p className="text-red-600 text-sm mt-1">{errors.codigo}</p>}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nome do Produto *
              </label>
              <input
                type="text"
                value={formData.nome}
                onChange={(e) => handleInputChange('nome', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.nome ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Digite o nome do produto"
              />
              {errors.nome && <p className="text-red-600 text-sm mt-1">{errors.nome}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Informações Adicionais
              </label>
              <input
                type="text"
                value={formData.info}
                onChange={(e) => handleInputChange('info', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Informações extras do produto"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quantidade/Unidade
              </label>
              <input
                type="text"
                value={formData.quantidade}
                onChange={(e) => handleInputChange('quantidade', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ex: 1 Unid., 500g, 1L"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Código de Barras
              </label>
              <input
                type="text"
                value={formData.codigo_barra}
                onChange={(e) => handleInputChange('codigo_barra', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Digite o código de barras"
              />
            </div>


            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Descrição
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Descreva o produto"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Preços (Guaranis) *
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Preço Varejo
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price}
                    onChange={(e) => handleInputChange('price', parseFloat(e.target.value) || 0)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.price ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="0.00"
                  />
                  {errors.price && <p className="text-red-600 text-xs mt-1">{errors.price}</p>}
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Precio Atacado
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price_atacado}
                    onChange={(e) => handleInputChange('price_atacado', parseFloat(e.target.value) || 0)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.price_atacado ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="0.00"
                  />
                  {errors.price_atacado && <p className="text-red-600 text-xs mt-1">{errors.price_atacado}</p>}
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Precio Interior
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price_interior}
                    onChange={(e) => handleInputChange('price_interior', parseFloat(e.target.value) || 0)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.price_interior ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="0.00"
                  />
                  {errors.price_interior && <p className="text-red-600 text-xs mt-1">{errors.price_interior}</p>}
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Precio Mayorista
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price_mayorista}
                    onChange={(e) => handleInputChange('price_mayorista', parseFloat(e.target.value) || 0)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.price_mayorista ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="0.00"
                  />
                  {errors.price_mayorista && <p className="text-red-600 text-xs mt-1">{errors.price_mayorista}</p>}
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Precio Super Mayorista
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price_super_mayorista}
                    onChange={(e) => handleInputChange('price_super_mayorista', parseFloat(e.target.value) || 0)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.price_super_mayorista ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="0.00"
                  />
                  {errors.price_super_mayorista && <p className="text-red-600 text-xs mt-1">{errors.price_super_mayorista}</p>}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Estoque
              </label>
              <input
                type="number"
                min="0"
                value={formData.stock}
                onChange={(e) => handleInputChange('stock', parseInt(e.target.value) || 0)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.stock ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="0"
              />
              {errors.stock && <p className="text-red-600 text-sm mt-1">{errors.stock}</p>}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Categoria (Relacional)
              </label>
              <div className="space-y-3">
                {formData.category_id && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-sm text-blue-900">
                      <span className="font-medium">Categoria selecionada:</span> {categories.find(cat => cat.id === formData.category_id)?.name || 'Carregando...'}
                    </p>
                  </div>
                )}
                {!showNewCategoryForm ? (
                  <div className="flex gap-2">
                    <select
                      value={formData.category_id || ''}
                      onChange={(e) => {
                        const value = e.target.value === '' ? null : e.target.value
                        handleInputChange('category_id', value)
                        const selectedCategory = categories.find(cat => cat.id === value)
                        if (selectedCategory) {
                          console.log('Categoria selecionada:', selectedCategory.name, 'ID:', value)
                        }
                      }}
                      className={`flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        formData.category_id ? 'border-green-300 bg-green-50' : 'border-gray-300'
                      }`}
                    >
                      <option value="">Selecione uma categoria</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setShowNewCategoryForm(true)}
                      className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors flex items-center gap-2 whitespace-nowrap"
                    >
                      <Plus className="w-4 h-4" />
                      Nova
                    </button>
                    {formData.category_id && (
                      <button
                        type="button"
                        onClick={() => handleInputChange('category_id', null)}
                        className="px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm whitespace-nowrap"
                      >
                        Limpar
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="border border-blue-200 bg-blue-50 p-4 rounded-lg space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Nome da Categoria
                      </label>
                      <input
                        type="text"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        placeholder="Digite o nome"
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Descrição (opcional)
                      </label>
                      <textarea
                        value={newCategoryDesc}
                        onChange={(e) => setNewCategoryDesc(e.target.value)}
                        placeholder="Descrição da categoria"
                        rows={2}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleCreateCategory}
                        disabled={savingCategory}
                        className="flex-1 px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
                      >
                        {savingCategory ? 'Criando...' : 'Criar'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowNewCategoryForm(false)
                          setNewCategoryName('')
                          setNewCategoryDesc('')
                        }}
                        className="flex-1 px-3 py-1 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300 transition-colors"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
                {categories.length === 0 && !showNewCategoryForm && (
                  <p className="text-xs text-gray-500">Nenhuma categoria. Clique em "Nova" para criar.</p>
                )}
              </div>
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

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                URL da Imagem
              </label>
              <div className="space-y-2">
                <input
                  type="url"
                  value={formData.image_url}
                  onChange={(e) => handleInputChange('image_url', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="https://exemplo.com/imagem.jpg"
                />
                <p className="text-xs text-gray-500">
                  A URL será gerada automaticamente com base no código e categoria do produto.
                  Você pode editá-la manualmente se necessário.
                </p>
              </div>
              {formData.image_url && (
                <div className="mt-3">
                  <img
                    src={formData.image_url}
                    alt="Preview"
                    className="w-32 h-32 object-cover rounded-lg border"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none'
                    }}
                  />
                </div>
              )}
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
              {isEditing ? 'Atualizar' : 'Criar'} Produto
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ProductForm