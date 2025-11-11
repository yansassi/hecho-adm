import React, { useState, useEffect, useMemo } from 'react'
import { X, Search, Filter, Award, Tag, Sparkles, CheckSquare, Square, Plus } from 'lucide-react'
import { supabase, ProductWithCategory } from '../lib/supabase'

interface Category {
  id: string
  name: string
}

interface Promotion {
  product_id: string
  promotional_price: number
  discount_value: number
  discount_type: 'fixed' | 'percentage'
  active: boolean
}

interface BestSeller {
  product_id: string
  active: boolean
}

interface ProductGroup {
  id: string
  name: string
  isVariationGroup: boolean
  mainProduct: ProductWithCategory
  variations: ProductWithCategory[]
  category_id: string | null
  categories?: any
}

interface ProductCatalogModalProps {
  onClose: () => void
  onSelectProducts: (products: ProductWithCategory[]) => void
}

const isNewProduct = (createdAt: string): boolean => {
  const createdDate = new Date(createdAt)
  const threeWeeksAgo = new Date()
  threeWeeksAgo.setDate(threeWeeksAgo.getDate() - 21)
  return createdDate >= threeWeeksAgo
}

const groupProductsByName = (products: ProductWithCategory[]): ProductGroup[] => {
  const groupMap = new Map<string, ProductWithCategory[]>()

  products.forEach(product => {
    const normalizedName = product.nome.trim().toLowerCase()
    if (!groupMap.has(normalizedName)) {
      groupMap.set(normalizedName, [])
    }
    groupMap.get(normalizedName)!.push(product)
  })

  const groups: ProductGroup[] = []

  groupMap.forEach((groupProducts, name) => {
    const sortedProducts = groupProducts.sort((a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )

    const mainProduct = sortedProducts[0]
    const isVariationGroup = sortedProducts.length > 1

    groups.push({
      id: mainProduct.id,
      name: mainProduct.nome,
      isVariationGroup,
      mainProduct,
      variations: sortedProducts,
      category_id: mainProduct.category_id,
      categories: mainProduct.categories
    })
  })

  return groups
}

const ProductCatalogModal: React.FC<ProductCatalogModalProps> = ({ onClose, onSelectProducts }) => {
  const [products, setProducts] = useState<ProductWithCategory[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [bestSellers, setBestSellers] = useState<BestSeller[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set())
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all')
  const [specialFilter, setSpecialFilter] = useState<'all' | 'bestsellers' | 'new' | 'promotions'>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20
  const [showVariationsModal, setShowVariationsModal] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState<ProductGroup | null>(null)

  useEffect(() => {
    fetchProducts()
    fetchCategories()
    fetchPromotions()
    fetchBestSellers()
  }, [])

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name')
        .order('name', { ascending: true })

      if (error) throw error
      setCategories(data || [])
    } catch (error) {
      console.error('Erro ao buscar categorias:', error)
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

  const fetchBestSellers = async () => {
    try {
      const manualBestSellersResult = await supabase
        .from('best_sellers')
        .select('product_id, active')
        .eq('active', true)

      if (manualBestSellersResult.error) throw manualBestSellersResult.error

      const saleItemsResult = await supabase
        .from('sale_items')
        .select('product_id, quantity, sales(payment_status)')

      if (saleItemsResult.error) {
        setBestSellers(manualBestSellersResult.data || [])
        return
      }

      const filteredItems = (saleItemsResult.data || []).filter(
        (item: any) => item.sales?.payment_status !== 'cancelled'
      )

      const productSalesMap = new Map<string, number>()
      filteredItems.forEach((item: any) => {
        const currentQuantity = productSalesMap.get(item.product_id) || 0
        productSalesMap.set(item.product_id, currentQuantity + item.quantity)
      })

      const topSellingProducts = Array.from(productSalesMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
        .map(([product_id]) => ({ product_id, active: true }))

      const manualIds = new Set((manualBestSellersResult.data || []).map(bs => bs.product_id))
      const combinedBestSellers = [
        ...(manualBestSellersResult.data || []),
        ...topSellingProducts.filter(bs => !manualIds.has(bs.product_id))
      ]

      setBestSellers(combinedBestSellers)
    } catch (error) {
      console.error('Erro ao buscar mais vendidos:', error)
    }
  }

  const fetchProducts = async () => {
    try {
      let allProducts: ProductWithCategory[] = []
      let pageSize = 1000
      let pageNum = 0
      let hasMore = true

      while (hasMore) {
        const { data: productsData, error } = await supabase
          .from('products')
          .select('*, categories(id, name, description)')
          .eq('active', true)
          .order('nome', { ascending: true })
          .range(pageNum * pageSize, (pageNum + 1) * pageSize - 1)

        if (error) throw error

        const data = (productsData || []).map(product => ({
          ...product,
          categories: product.categories as any
        }))

        allProducts = [...allProducts, ...data]
        hasMore = data.length === pageSize
        pageNum++
      }

      setProducts(allProducts)
    } catch (error) {
      console.error('Erro ao buscar produtos:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleSelectProduct = (id: string, event?: React.MouseEvent) => {
    if (event) {
      event.stopPropagation()
    }
    const newSelected = new Set(selectedProducts)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedProducts(newSelected)
  }

  const productGroups = useMemo(() => groupProductsByName(products), [products])

  const filteredGroups = useMemo(() => {
    return productGroups.filter(group => {
      const searchLower = searchTerm.toLowerCase()

      const matchesSearch = group.variations.some(product => {
        const codigoSemHifen = product.codigo.replace(/-/g, '').toLowerCase()
        const searchSemHifen = searchLower.replace(/-/g, '')

        return product.nome.toLowerCase().includes(searchLower) ||
          product.codigo.toLowerCase().includes(searchLower) ||
          codigoSemHifen.includes(searchSemHifen) ||
          product.description.toLowerCase().includes(searchLower) ||
          (product.info || '').toLowerCase().includes(searchLower) ||
          (product.quantidade || '').toLowerCase().includes(searchLower) ||
          product.categories?.name.toLowerCase().includes(searchLower)
      })

      const matchesCategory = selectedCategoryFilter === 'all' ||
        (selectedCategoryFilter === 'uncategorized' && !group.category_id) ||
        group.category_id === selectedCategoryFilter

      const matchesSpecialFilter = (() => {
        if (specialFilter === 'all') return true

        if (specialFilter === 'bestsellers') {
          return group.variations.some(v =>
            bestSellers.some(bs => bs.product_id === v.id && bs.active)
          )
        }

        if (specialFilter === 'new') {
          return group.variations.some(v => isNewProduct(v.created_at))
        }

        if (specialFilter === 'promotions') {
          return group.variations.some(v =>
            promotions.some(p => p.product_id === v.id && p.active)
          )
        }

        return true
      })()

      return matchesSearch && matchesCategory && matchesSpecialFilter
    })
  }, [productGroups, searchTerm, selectedCategoryFilter, specialFilter, promotions, bestSellers])

  const totalPages = Math.ceil(filteredGroups.length / itemsPerPage)
  const paginatedGroups = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredGroups.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredGroups, currentPage, itemsPerPage])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, selectedCategoryFilter, specialFilter])

  const handleAddSelectedProducts = () => {
    const selectedProductsList = Array.from(selectedProducts)
      .map(id => products.find(p => p.id === id))
      .filter(Boolean) as ProductWithCategory[]

    onSelectProducts(selectedProductsList)
    onClose()
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-7xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b bg-gray-50">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Catálogo de Produtos</h2>
            <p className="text-sm text-gray-600">Selecione produtos para adicionar à venda</p>
            {selectedProducts.size > 0 && (
              <p className="text-sm text-blue-600 mt-1">
                {selectedProducts.size} produto(s) selecionado(s)
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <div className="space-y-4 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Buscar produtos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <Filter className="w-4 h-4 text-gray-600" />
                <h3 className="text-sm font-semibold text-gray-900">Filtros Especiais</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSpecialFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                    specialFilter === 'all'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Filter className="w-3 h-3" />
                  Todos
                </button>
                <button
                  onClick={() => setSpecialFilter('bestsellers')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                    specialFilter === 'bestsellers'
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Award className="w-3 h-3" />
                  Top Produtos
                </button>
                <button
                  onClick={() => setSpecialFilter('new')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                    specialFilter === 'new'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Sparkles className="w-3 h-3" />
                  Nuevos
                </button>
                <button
                  onClick={() => setSpecialFilter('promotions')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                    specialFilter === 'promotions'
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Tag className="w-3 h-3" />
                  Promociones
                </button>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <Filter className="w-4 h-4 text-gray-600" />
                <h3 className="text-sm font-semibold text-gray-900">Filtrar por Categoria</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedCategoryFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    selectedCategoryFilter === 'all'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Todos ({products.length})
                </button>
                {categories.map((category) => {
                  const categoryProductCount = products.filter(p => p.category_id === category.id).length
                  const isSelected = selectedCategoryFilter === category.id

                  return (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategoryFilter(category.id)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        isSelected
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {category.name} ({categoryProductCount})
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {filteredGroups.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p>Nenhum produto encontrado.</p>
            </div>
          ) : (
            <>
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Exibindo {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, filteredGroups.length)} de {filteredGroups.length} produtos
                </p>
                {totalPages > 1 && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                      Anterior
                    </button>
                    <span className="text-sm text-gray-600">
                      Página {currentPage} de {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                      Próxima
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {paginatedGroups.map((group) => {
                  const hasPromotion = group.variations.some(v => promotions.find(p => p.product_id === v.id && p.active))
                  const hasBestSeller = group.variations.some(v => bestSellers.some(bs => bs.product_id === v.id && bs.active))
                  const hasNew = group.variations.some(v => isNewProduct(v.created_at))
                  const displayImage = group.variations.find(v => v.image_url)?.image_url || group.mainProduct.image_url
                  const allVariationsSelected = group.variations.every(v => selectedProducts.has(v.id))
                  const someVariationsSelected = group.variations.some(v => selectedProducts.has(v.id))

                  return (
                    <div
                      key={group.id}
                      className={`transition-all rounded-lg border-2 overflow-hidden cursor-pointer ${
                        allVariationsSelected
                          ? 'border-blue-500 shadow-lg'
                          : someVariationsSelected
                          ? 'border-blue-300 shadow-md'
                          : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                      }`}
                      onClick={() => {
                        if (group.isVariationGroup) {
                          setSelectedGroup(group)
                          setShowVariationsModal(true)
                        } else {
                          toggleSelectProduct(group.mainProduct.id)
                        }
                      }}
                    >
                      <div className="relative bg-gray-50">
                        <div className="aspect-square relative">
                          {displayImage ? (
                            <img
                              src={displayImage}
                              alt={group.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                              Sin imagen
                            </div>
                          )}
                        </div>

                        <div className="absolute top-2 right-2">
                          {allVariationsSelected ? (
                            <div className="bg-blue-600 rounded-full p-1">
                              <CheckSquare className="w-5 h-5 text-white" />
                            </div>
                          ) : someVariationsSelected ? (
                            <div className="bg-blue-400 rounded-full p-1">
                              <CheckSquare className="w-5 h-5 text-white" />
                            </div>
                          ) : (
                            <div className="bg-white bg-opacity-90 rounded-full p-1 border border-gray-300">
                              <Square className="w-5 h-5 text-gray-400" />
                            </div>
                          )}
                        </div>

                        <div className="absolute top-2 left-2 flex flex-col gap-1">
                          {hasPromotion && (
                            <div className="bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded">
                              PROMO
                            </div>
                          )}
                          {hasBestSeller && (
                            <div className="bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded flex items-center gap-1">
                              <Award className="w-3 h-3 fill-white" />
                              TOP
                            </div>
                          )}
                          {hasNew && (
                            <div className="bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded">
                              NUEVO
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="p-3 bg-white">
                        <p className="font-mono text-xs text-gray-500 mb-1">{group.mainProduct.codigo}</p>
                        <h3 className="font-semibold text-sm text-gray-900 line-clamp-2 mb-2" style={{ minHeight: '2.5rem' }}>
                          {group.name}
                        </h3>

                        {group.mainProduct.quantidade && (
                          <p className="text-xs text-gray-600 mb-2">{group.mainProduct.quantidade}</p>
                        )}

                        {group.mainProduct.description && (
                          <p className="text-xs text-gray-500 line-clamp-2">
                            {group.mainProduct.description}
                          </p>
                        )}
                      </div>

                      {group.isVariationGroup && (
                        <div className="border-t bg-gray-50 px-3 py-2">
                          <p className="text-xs text-gray-600 text-center">
                            {group.variations.length} variações
                          </p>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {totalPages > 1 && (
                <div className="mt-6 flex items-center justify-center gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                  >
                    Anterior
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNumber
                      if (totalPages <= 5) {
                        pageNumber = i + 1
                      } else if (currentPage <= 3) {
                        pageNumber = i + 1
                      } else if (currentPage >= totalPages - 2) {
                        pageNumber = totalPages - 4 + i
                      } else {
                        pageNumber = currentPage - 2 + i
                      }
                      return (
                        <button
                          key={pageNumber}
                          onClick={() => setCurrentPage(pageNumber)}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            currentPage === pageNumber
                              ? 'bg-blue-600 text-white'
                              : 'border border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {pageNumber}
                        </button>
                      )
                    })}
                  </div>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                  >
                    Próxima
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex justify-between items-center p-6 border-t bg-gray-50">
          <p className="text-sm text-gray-600">
            {selectedProducts.size} produto(s) selecionado(s)
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleAddSelectedProducts}
              disabled={selectedProducts.size === 0}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" />
              Adicionar Selecionados
            </button>
          </div>
        </div>
      </div>

      {showVariationsModal && selectedGroup && (
        <VariationsSelectionModal
          group={selectedGroup}
          selectedProducts={selectedProducts}
          toggleSelectProduct={toggleSelectProduct}
          promotions={promotions}
          bestSellers={bestSellers}
          onClose={() => {
            setShowVariationsModal(false)
            setSelectedGroup(null)
          }}
        />
      )}
    </div>
  )
}

interface VariationsSelectionModalProps {
  group: ProductGroup
  selectedProducts: Set<string>
  toggleSelectProduct: (id: string) => void
  promotions: Promotion[]
  bestSellers: BestSeller[]
  onClose: () => void
}

const VariationsSelectionModal: React.FC<VariationsSelectionModalProps> = ({
  group,
  selectedProducts,
  toggleSelectProduct,
  promotions,
  bestSellers,
  onClose
}) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b bg-gray-50">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{group.name}</h2>
            <p className="text-sm text-gray-600">{group.variations.length} variações disponíveis</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <div className="flex gap-6 mb-6">
            <div className="flex-shrink-0">
              {group.mainProduct.image_url ? (
                <img
                  src={group.mainProduct.image_url}
                  alt={group.name}
                  className="w-48 h-48 object-cover rounded-lg border"
                />
              ) : (
                <div className="w-48 h-48 bg-gray-100 rounded-lg border flex items-center justify-center text-gray-400">
                  Sin imagen
                </div>
              )}
            </div>

            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{group.name}</h3>
              {group.mainProduct.description && (
                <p className="text-gray-600 mb-4">{group.mainProduct.description}</p>
              )}
              {group.categories && (
                <p className="text-sm text-gray-500">
                  <span className="font-medium">Categoria:</span> {group.categories.name}
                </p>
              )}
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-800">
              <span className="font-semibold">Dica:</span> Clique nas variações que deseja adicionar à venda. Você pode selecionar múltiplas variações.
            </p>
          </div>

          <div className="space-y-3">
            {group.variations.map((variation) => {
              const isSelected = selectedProducts.has(variation.id)
              const promotion = promotions.find(p => p.product_id === variation.id && p.active)
              const isBestSeller = bestSellers.some(bs => bs.product_id === variation.id && bs.active)
              const isNew = isNewProduct(variation.created_at)

              return (
                <button
                  key={variation.id}
                  onClick={() => toggleSelectProduct(variation.id)}
                  className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50 shadow-md'
                      : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0">
                      {isSelected ? (
                        <CheckSquare className="w-6 h-6 text-blue-600" />
                      ) : (
                        <Square className="w-6 h-6 text-gray-400" />
                      )}
                    </div>

                    {variation.image_url && (
                      <img
                        src={variation.image_url}
                        alt={variation.nome}
                        className="w-20 h-20 object-cover rounded-lg border"
                      />
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2 mb-2">
                        <p className="font-semibold text-gray-900">{variation.nome}</p>
                        {(promotion || isBestSeller || isNew) && (
                          <div className="flex gap-1">
                            {promotion && (
                              <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded font-bold">PROMO</span>
                            )}
                            {isBestSeller && (
                              <span className="text-xs bg-orange-100 text-orange-800 px-2 py-0.5 rounded font-bold">TOP</span>
                            )}
                            {isNew && (
                              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-bold">NUEVO</span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="space-y-1">
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">Código:</span> <span className="font-mono">{variation.codigo}</span>
                        </p>
                        {variation.description && (
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Descrição:</span> {variation.description}
                          </p>
                        )}
                        {variation.info && (
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Info:</span> {variation.info}
                          </p>
                        )}
                        {variation.quantidade && (
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Quantidade:</span> {variation.quantidade}
                          </p>
                        )}
                      </div>

                      {promotion ? (
                        <div className="mt-2 flex items-center gap-3">
                          <span className="text-lg font-bold text-red-600">
                            ₲ {promotion.promotional_price.toLocaleString('es-PY')}
                          </span>
                          <span className="text-sm text-gray-400 line-through">
                            ₲ {Number(variation.price).toLocaleString('es-PY')}
                          </span>
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded font-bold">
                            Ahorre ₲ {(Number(variation.price) - promotion.promotional_price).toLocaleString('es-PY')}
                          </span>
                        </div>
                      ) : (
                        <p className="text-lg font-bold text-blue-600 mt-2">
                          ₲ {Number(variation.price).toLocaleString('es-PY')}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex justify-between items-center p-6 border-t bg-gray-50">
          <p className="text-sm text-gray-600">
            {group.variations.filter(v => selectedProducts.has(v.id)).length} de {group.variations.length} variações selecionadas
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => {
                group.variations.forEach(v => {
                  if (!selectedProducts.has(v.id)) {
                    toggleSelectProduct(v.id)
                  }
                })
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Selecionar Todas
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProductCatalogModal
