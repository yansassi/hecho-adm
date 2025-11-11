import React, { useState, useEffect } from 'react'
import { Package, Search, AlertTriangle, ShoppingCart, Plus, Eye, Filter, X } from 'lucide-react'
import { supabase, Product, Category } from '../lib/supabase'

type ProductsGridProps = {
  onAddToOrder: (product: Product) => void
  selectedProducts: Set<string>
  selectedSupplierId?: string
}

const ProductsGridForOrders: React.FC<ProductsGridProps> = ({ 
  onAddToOrder, 
  selectedProducts,
  selectedSupplierId 
}) => {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [filterStock, setFilterStock] = useState<'all' | 'low' | 'out'>('all')

  useEffect(() => {
    fetchData()
  }, [selectedSupplierId])

  const fetchData = async () => {
    setLoading(true)
    await Promise.all([fetchProducts(), fetchCategories()])
    setLoading(false)
  }

  const fetchProducts = async () => {
    try {
      if (selectedSupplierId) {
        // Buscar apenas produtos associados ao fornecedor selecionado
        const { data: supplierProducts, error: supplierError } = await supabase
          .from('fornecedor_produtos')
          .select('product_id')
          .eq('fornecedor_id', selectedSupplierId)

        if (supplierError) throw supplierError

        const productIds = supplierProducts.map(sp => sp.product_id)

        if (productIds.length === 0) {
          setProducts([])
          return
        }

        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('active', true)
          .in('id', productIds)
          .order('nome', { ascending: true })

        if (error) throw error
        setProducts(data || [])
      } else {
        // Buscar todos os produtos ativos
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('active', true)
          .order('nome', { ascending: true })

        if (error) throw error
        setProducts(data || [])
      }
    } catch (error) {
      console.error('Erro ao buscar produtos:', error)
    }
  }

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name', { ascending: true })

      if (error) throw error
      setCategories(data || [])
    } catch (error) {
      console.error('Erro ao buscar categorias:', error)
    }
  }

  const filteredProducts = products.filter(product => {
    const matchesSearch = 
      product.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.codigo_barra?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesCategory = 
      filterCategory === 'all' || 
      product.category_id === filterCategory

    const matchesStock = 
      filterStock === 'all' ||
      (filterStock === 'low' && product.stock <= 5 && product.stock > 0) ||
      (filterStock === 'out' && product.stock === 0)

    return matchesSearch && matchesCategory && matchesStock
  })

  const getStockStatus = (stock: number) => {
    if (stock === 0) return { label: 'Sem Estoque', color: 'text-red-600 bg-red-50', icon: '❌' }
    if (stock <= 5) return { label: 'Estoque Baixo', color: 'text-orange-600 bg-orange-50', icon: '⚠️' }
    return { label: 'Em Estoque', color: 'text-green-600 bg-green-50', icon: '✅' }
  }

  const lowStockCount = products.filter(p => p.stock <= 5 && p.stock > 0).length
  const outOfStockCount = products.filter(p => p.stock === 0).length

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // Mensagem quando fornecedor selecionado não tem produtos
  if (selectedSupplierId && products.length === 0 && !searchTerm && filterCategory === 'all' && filterStock === 'all') {
    return (
      <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-8 text-center">
        <AlertTriangle className="w-16 h-16 text-yellow-600 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Nenhum produto associado a este fornecedor
        </h3>
        <p className="text-gray-600 mb-4">
          Este fornecedor ainda não possui produtos vinculados. 
          Vá para a aba "Fornecedores" para associar produtos.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Alertas de Estoque */}
      {(lowStockCount > 0 || outOfStockCount > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {lowStockCount > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-semibold text-orange-900">{lowStockCount} produtos com estoque baixo</p>
                  <p className="text-sm text-orange-700">5 ou menos unidades disponíveis</p>
                </div>
                <button
                  onClick={() => setFilterStock('low')}
                  className="px-3 py-1.5 bg-orange-600 text-white text-sm rounded-lg hover:bg-orange-700 transition-colors"
                >
                  Ver
                </button>
              </div>
            </div>
          )}
          
          {outOfStockCount > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <Package className="w-5 h-5 text-red-600 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-semibold text-red-900">{outOfStockCount} produtos sem estoque</p>
                  <p className="text-sm text-red-700">Necessário reabastecer urgentemente</p>
                </div>
                <button
                  onClick={() => setFilterStock('out')}
                  className="px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors"
                >
                  Ver
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filtros e Busca */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Busca */}
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Buscar por nome, código ou código de barras..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Filtro de Categoria */}
          <div>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Todas as Categorias</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro de Estoque */}
          <div>
            <select
              value={filterStock}
              onChange={(e) => setFilterStock(e.target.value as 'all' | 'low' | 'out')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Todos os Estoques</option>
              <option value="low">Estoque Baixo (≤5)</option>
              <option value="out">Sem Estoque</option>
            </select>
          </div>
        </div>

        {/* Botão para limpar filtros */}
        {(searchTerm || filterCategory !== 'all' || filterStock !== 'all') && (
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={() => {
                setSearchTerm('')
                setFilterCategory('all')
                setFilterStock('all')
              }}
              className="text-sm text-gray-600 hover:text-gray-800 flex items-center gap-1"
            >
              <X className="w-3 h-3" />
              Limpar filtros
            </button>
            <span className="text-sm text-gray-500">
              {filteredProducts.length} produto(s) encontrado(s)
            </span>
          </div>
        )}
      </div>

      {/* Grid de Produtos */}
      {filteredProducts.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
          <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 mb-2">Nenhum produto encontrado</p>
          <p className="text-sm text-gray-500">Tente ajustar os filtros de busca</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredProducts.map((product) => {
            const stockStatus = getStockStatus(product.stock)
            const isSelected = selectedProducts.has(product.id)
            
            return (
              <div
                key={product.id}
                className={`bg-white rounded-lg shadow-sm border-2 transition-all hover:shadow-md ${
                  isSelected 
                    ? 'border-green-500 bg-green-50' 
                    : product.stock === 0
                    ? 'border-red-200'
                    : product.stock <= 5
                    ? 'border-orange-200'
                    : 'border-gray-200'
                }`}
              >
                {/* Imagem do Produto */}
                <div className="relative h-48 bg-gray-100 rounded-t-lg overflow-hidden">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.nome}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"%3E%3Crect fill="%23f3f4f6" width="100" height="100"/%3E%3Ctext x="50" y="50" font-family="Arial" font-size="14" fill="%239ca3af" text-anchor="middle" dominant-baseline="middle"%3ESem imagem%3C/text%3E%3C/svg%3E'
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-12 h-12 text-gray-300" />
                    </div>
                  )}
                  
                  {/* Badge de Status */}
                  <div className={`absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-medium ${stockStatus.color}`}>
                    <span className="mr-1">{stockStatus.icon}</span>
                    {stockStatus.label}
                  </div>

                  {/* Badge de Adicionado */}
                  {isSelected && (
                    <div className="absolute top-2 left-2 px-2 py-1 bg-green-600 text-white rounded-full text-xs font-medium flex items-center gap-1">
                      <ShoppingCart className="w-3 h-3" />
                      Adicionado
                    </div>
                  )}
                </div>

                {/* Informações do Produto */}
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 min-h-[3rem]">
                    {product.nome}
                  </h3>
                  
                  <div className="space-y-1.5 mb-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Código:</span>
                      <span className="font-medium text-gray-900">{product.codigo}</span>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Estoque:</span>
                      <span className={`font-bold ${
                        product.stock === 0 ? 'text-red-600' :
                        product.stock <= 5 ? 'text-orange-600' :
                        'text-green-600'
                      }`}>
                        {product.stock} {product.quantidade}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Preço:</span>
                      <span className="font-semibold text-blue-600">
                        Gs. {product.price.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Botão de Adicionar */}
                  <button
                    onClick={() => onAddToOrder(product)}
                    disabled={isSelected}
                    className={`w-full py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                      isSelected
                        ? 'bg-green-100 text-green-700 cursor-default'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {isSelected ? (
                      <>
                        <ShoppingCart className="w-4 h-4" />
                        Já Adicionado
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        Adicionar ao Pedido
                      </>
                    )}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Rodapé com totais */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-6">
            <div>
              <span className="text-gray-600">Total de produtos: </span>
              <span className="font-semibold text-gray-900">{products.length}</span>
            </div>
            <div>
              <span className="text-gray-600">Filtrados: </span>
              <span className="font-semibold text-blue-600">{filteredProducts.length}</span>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-gray-600 text-xs">Em estoque</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-orange-500"></div>
              <span className="text-gray-600 text-xs">Baixo ({lowStockCount})</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span className="text-gray-600 text-xs">Sem estoque ({outOfStockCount})</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProductsGridForOrders
