import React, { useState, useEffect, useMemo } from 'react'
import { Search, CheckSquare, Square, Download, Settings as SettingsIcon, ChevronDown, Filter, X, Award, ChevronRight, Tag, TrendingUp, Sparkles } from 'lucide-react'
import { supabase, ProductWithCategory } from '../lib/supabase'
import { generateCatalogPDF } from '../lib/pdfGenerator'

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

const Catalog: React.FC = () => {
  const [products, setProducts] = useState<ProductWithCategory[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [bestSellers, setBestSellers] = useState<BestSeller[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set())
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [generatingPDF, setGeneratingPDF] = useState(false)
  const [generatingCategoryPDF, setGeneratingCategoryPDF] = useState<string | null>(null)
  const [generatingAllPDF, setGeneratingAllPDF] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showCategoryMenu, setShowCategoryMenu] = useState(false)
  const [pdfLayout, setPdfLayout] = useState<'single' | 'grid'>('grid')
  const [includePrice, setIncludePrice] = useState(true)
  const [catalogTitle, setCatalogTitle] = useState('Catálogo de Produtos')
  const [sortBy, setSortBy] = useState<'name' | 'code' | 'category'>('name')
  const [priceType, setPriceType] = useState<'price' | 'price_atacado' | 'price_interior' | 'price_mayorista' | 'price_super_mayorista'>('price')
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all')
  const [specialFilter, setSpecialFilter] = useState<'all' | 'bestsellers' | 'new' | 'promotions'>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 50
  const [selectedGroup, setSelectedGroup] = useState<ProductGroup | null>(null)
  const [showVariationsModal, setShowVariationsModal] = useState(false)

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
        const { data: productsData, error, count } = await supabase
          .from('products')
          .select('*, categories(id, name, description)', { count: 'exact' })
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

  const toggleGroupExpansion = (groupId: string) => {
    const newExpanded = new Set(expandedGroups)
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId)
    } else {
      newExpanded.add(groupId)
    }
    setExpandedGroups(newExpanded)
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
          (product.codigo_barra || '').toLowerCase().includes(searchLower) ||
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

  const sortedGroups = useMemo(() => {
    let sorted = [...filteredGroups]

    switch (sortBy) {
      case 'code':
        sorted.sort((a, b) => a.mainProduct.codigo.localeCompare(b.mainProduct.codigo))
        break
      case 'category':
        sorted.sort((a, b) =>
          (a.categories?.name || '').localeCompare(b.categories?.name || '')
        )
        break
      default:
        sorted.sort((a, b) => a.name.localeCompare(b.name))
    }

    return sorted
  }, [filteredGroups, sortBy])

  const totalPages = Math.ceil(sortedGroups.length / itemsPerPage)
  const paginatedGroups = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return sortedGroups.slice(startIndex, startIndex + itemsPerPage)
  }, [sortedGroups, currentPage, itemsPerPage])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, selectedCategoryFilter, specialFilter])

  const toggleSelectAll = () => {
    const allVariationIds = sortedGroups.flatMap(group => group.variations.map(v => v.id))
    if (selectedProducts.size === allVariationIds.length) {
      setSelectedProducts(new Set())
    } else {
      setSelectedProducts(new Set(allVariationIds))
    }
  }

  const selectAllInCategory = (categoryId: string) => {
    const categoryProducts = products.filter(p => p.category_id === categoryId)
    const newSelected = new Set(selectedProducts)
    categoryProducts.forEach(p => newSelected.add(p.id))
    setSelectedProducts(newSelected)
  }

  const deselectAllInCategory = (categoryId: string) => {
    const categoryProducts = products.filter(p => p.category_id === categoryId)
    const newSelected = new Set(selectedProducts)
    categoryProducts.forEach(p => newSelected.delete(p.id))
    setSelectedProducts(newSelected)
  }

  const isCategoryFullySelected = (categoryId: string) => {
    const categoryProducts = products.filter(p => p.category_id === categoryId)
    return categoryProducts.length > 0 && categoryProducts.every(p => selectedProducts.has(p.id))
  }

  const handleGeneratePDF = async () => {
    if (selectedProducts.size === 0) {
      alert('Selecione pelo menos um produto para gerar o catálogo.')
      return
    }

    setGeneratingPDF(true)
    try {
      const selectedProductsList = Array.from(selectedProducts)
        .map(id => products.find(p => p.id === id))
        .filter(Boolean) as ProductWithCategory[]

      await generateCatalogPDF(
        selectedProductsList,
        {
          layout: pdfLayout,
          includePrice,
          title: catalogTitle,
          priceType,
          promotions,
          bestSellers
        }
      )
    } catch (error) {
      console.error('Erro ao gerar PDF:', error)
      alert('Erro ao gerar o catálogo PDF. Tente novamente.')
    } finally {
      setGeneratingPDF(false)
    }
  }

  const handleGenerateCategoryPDF = async (categoryId: string, categoryName: string) => {
    setGeneratingCategoryPDF(categoryId)
    try {
      const categoryProducts = products.filter(p => p.category_id === categoryId)

      if (categoryProducts.length === 0) {
        alert(`Nenhum produto ativo encontrado na categoria "${categoryName}".`)
        setGeneratingCategoryPDF(null)
        return
      }

      await generateCatalogPDF(
        categoryProducts,
        {
          layout: pdfLayout,
          includePrice,
          title: `Catálogo - ${categoryName}`,
          priceType,
          promotions,
          bestSellers
        }
      )
    } catch (error) {
      console.error('Erro ao gerar PDF da categoria:', error)
      alert('Erro ao gerar o catálogo PDF. Tente novamente.')
    } finally {
      setGeneratingCategoryPDF(null)
    }
  }

  const handleGenerateAllProductsPDF = async () => {
    if (products.length === 0) {
      alert('Nenhum produto disponível para gerar o catálogo.')
      return
    }

    setGeneratingAllPDF(true)
    try {
      await generateCatalogPDF(
        products,
        {
          layout: pdfLayout,
          includePrice,
          title: catalogTitle,
          priceType,
          promotions,
          bestSellers
        }
      )
    } catch (error) {
      console.error('Erro ao gerar PDF de todos os produtos:', error)
      alert('Erro ao gerar o catálogo PDF. Tente novamente.')
    } finally {
      setGeneratingAllPDF(false)
    }
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Catálogo</h1>
          <p className="text-gray-600">Selecione produtos para gerar catálogo em PDF</p>
          {selectedProducts.size > 0 && (
            <p className="text-sm text-blue-600 mt-1">
              {selectedProducts.size} produto(s) selecionado(s)
            </p>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
          >
            <SettingsIcon className="w-4 h-4" />
            Configurações
          </button>
          <button
            onClick={handleGenerateAllProductsPDF}
            disabled={generatingAllPDF || products.length === 0}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generatingAllPDF ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <Download className="w-4 h-4" />
            )}
            {generatingAllPDF ? 'Gerando...' : 'Todos os Produtos'}
          </button>
          <div className="relative">
            <button
              onClick={() => setShowCategoryMenu(!showCategoryMenu)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Por Categoria
              <ChevronDown className="w-4 h-4" />
            </button>
            {showCategoryMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border z-10 max-h-64 overflow-y-auto">
                {categories.length === 0 ? (
                  <div className="p-3 text-gray-500 text-sm">Nenhuma categoria disponível</div>
                ) : (
                  categories.map(category => {
                    const productCount = products.filter(p => p.category_id === category.id).length
                    const isGenerating = generatingCategoryPDF === category.id
                    return (
                      <button
                        key={category.id}
                        onClick={() => {
                          handleGenerateCategoryPDF(category.id, category.name)
                          setShowCategoryMenu(false)
                        }}
                        disabled={isGenerating || productCount === 0}
                        className="w-full text-left px-4 py-2 hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between"
                      >
                        <span>
                          {category.name}
                          <span className="text-xs text-gray-500 ml-2">({productCount})</span>
                        </span>
                        {isGenerating && (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                        )}
                      </button>
                    )
                  })
                )}
              </div>
            )}
          </div>
          <button
            onClick={handleGeneratePDF}
            disabled={generatingPDF || selectedProducts.size === 0}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generatingPDF ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <Download className="w-4 h-4" />
            )}
            {generatingPDF ? 'Gerando...' : 'Gerar PDF'}
          </button>
        </div>
      </div>

      {showSettings && (
        <div className="bg-white p-6 rounded-lg shadow-sm border space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Configurações do Catálogo</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Título do Catálogo
              </label>
              <input
                type="text"
                value={catalogTitle}
                onChange={(e) => setCatalogTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Layout
              </label>
              <select
                value={pdfLayout}
                onChange={(e) => setPdfLayout(e.target.value as 'single' | 'grid')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="grid">Múltiplos produtos por página</option>
                <option value="single">Um produto por página</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ordenar por
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'name' | 'code' | 'category')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="name">Nome do Produto</option>
                <option value="code">Código</option>
                <option value="category">Categoria</option>
              </select>
            </div>

            <div className="flex items-center">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includePrice}
                  onChange={(e) => setIncludePrice(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300"
                />
                <span className="text-sm font-medium text-gray-700">Incluir Preço no Catálogo</span>
              </label>
            </div>

            {includePrice && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de Preço
                </label>
                <select
                  value={priceType}
                  onChange={(e) => setPriceType(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="price">Preço Varejo</option>
                  <option value="price_atacado">Precio Atacado</option>
                  <option value="price_interior">Precio Interior</option>
                  <option value="price_mayorista">Precio Mayorista</option>
                  <option value="price_super_mayorista">Precio Super Mayorista</option>
                </select>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Buscar produtos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-3">
              <Filter className="w-4 h-4 text-gray-600" />
              <h3 className="text-sm font-semibold text-gray-900">Filtros Especiais</h3>
              {specialFilter !== 'all' && (
                <button
                  onClick={() => setSpecialFilter('all')}
                  className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  <X className="w-3 h-3" />
                  Limpar filtro
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2 mb-4">
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
            <div className="flex items-center gap-2 mb-3">
              <Filter className="w-4 h-4 text-gray-600" />
              <h3 className="text-sm font-semibold text-gray-900">Filtrar por Categoria</h3>
              {selectedCategoryFilter !== 'all' && (
                <button
                  onClick={() => setSelectedCategoryFilter('all')}
                  className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  <X className="w-3 h-3" />
                  Limpar filtro
                </button>
              )}
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
                const isFullySelected = isCategoryFullySelected(category.id)

                return (
                  <div key={category.id} className="relative">
                    <button
                      onClick={() => setSelectedCategoryFilter(category.id)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        isSelected
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {category.name} ({categoryProductCount})
                    </button>
                    {isSelected && categoryProductCount > 0 && (
                      <div className="absolute top-full left-0 mt-1 flex gap-1 z-10">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            selectAllInCategory(category.id)
                          }}
                          className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 whitespace-nowrap"
                        >
                          Selecionar Todos
                        </button>
                        {isFullySelected && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              deselectAllInCategory(category.id)
                            }}
                            className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 whitespace-nowrap"
                          >
                            Desmarcar Todos
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <div className="p-6">
          {sortedGroups.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600">Nenhum produto encontrado.</p>
            </div>
          ) : (
            <>
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Exibindo {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, sortedGroups.length)} de {sortedGroups.length} produtos
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
                      className={`transition-all rounded-lg border-2 overflow-hidden ${
                        allVariationsSelected
                          ? 'border-blue-500 shadow-lg'
                          : someVariationsSelected
                          ? 'border-blue-300 shadow-md'
                          : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                      }`}
                    >
                      <div
                        onClick={() => {
                          if (group.isVariationGroup) {
                            setSelectedGroup(group)
                            setShowVariationsModal(true)
                          } else {
                            toggleSelectProduct(group.mainProduct.id)
                          }
                        }}
                        className="cursor-pointer"
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

                          {group.isVariationGroup && (
                            <div className="absolute bottom-2 right-2">
                              <div className="bg-black bg-opacity-75 text-white text-xs font-bold px-2 py-1 rounded flex items-center gap-1">
                                <ChevronRight className="w-3 h-3" />
                                {group.variations.length} variações
                              </div>
                            </div>
                          )}
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
                            <p className="text-xs text-gray-500 line-clamp-2 mb-2">
                              {group.mainProduct.description}
                            </p>
                          )}
                        </div>
                      </div>

                      {group.isVariationGroup && (
                        <div className="border-t bg-gray-50 p-2">
                          <div className="flex items-center justify-between">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                const newSelected = new Set(selectedProducts)
                                group.variations.forEach(v => {
                                  if (allVariationsSelected) {
                                    newSelected.delete(v.id)
                                  } else {
                                    newSelected.add(v.id)
                                  }
                                })
                                setSelectedProducts(newSelected)
                              }}
                              className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                            >
                              {allVariationsSelected ? (
                                <>
                                  <CheckSquare className="w-3 h-3" />
                                  Desmarcar todas
                                </>
                              ) : (
                                <>
                                  <Square className="w-3 h-3" />
                                  Selecionar todas
                                </>
                              )}
                            </button>
                            <span className="text-xs text-gray-500">
                              {group.variations.filter(v => selectedProducts.has(v.id)).length}/{group.variations.length}
                            </span>
                          </div>
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
      </div>

      {showVariationsModal && selectedGroup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b bg-gray-50">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{selectedGroup.name}</h2>
                <p className="text-sm text-gray-600">{selectedGroup.variations.length} variações disponíveis</p>
              </div>
              <button
                onClick={() => {
                  setShowVariationsModal(false)
                  setSelectedGroup(null)
                }}
                className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              <div className="flex gap-6 mb-6">
                <div className="flex-shrink-0">
                  {selectedGroup.mainProduct.image_url ? (
                    <img
                      src={selectedGroup.mainProduct.image_url}
                      alt={selectedGroup.name}
                      className="w-48 h-48 object-cover rounded-lg border"
                    />
                  ) : (
                    <div className="w-48 h-48 bg-gray-100 rounded-lg border flex items-center justify-center text-gray-400">
                      Sin imagen
                    </div>
                  )}
                </div>

                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{selectedGroup.name}</h3>
                  {selectedGroup.mainProduct.description && (
                    <p className="text-gray-600 mb-4">{selectedGroup.mainProduct.description}</p>
                  )}
                  {selectedGroup.categories && (
                    <p className="text-sm text-gray-500">
                      <span className="font-medium">Categoria:</span> {selectedGroup.categories.name}
                    </p>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-lg border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left py-3 px-4 font-medium text-gray-900">Selecionar</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-900">Código</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-900">Descrição</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-900">Info</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-900">Quantidade</th>
                        <th className="text-center py-3 px-4 font-medium text-gray-900">Imagem</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {selectedGroup.variations.map((variation) => {
                        const isSelected = selectedProducts.has(variation.id)
                        const hasPromotion = promotions.find(p => p.product_id === variation.id && p.active)
                        const isBestSeller = bestSellers.some(bs => bs.product_id === variation.id && bs.active)
                        const isNew = isNewProduct(variation.created_at)

                        return (
                          <tr key={variation.id} className={`hover:bg-gray-50 ${isSelected ? 'bg-blue-50' : ''}`}>
                            <td className="py-3 px-4">
                              <button
                                onClick={() => toggleSelectProduct(variation.id)}
                                className="flex items-center justify-center"
                              >
                                {isSelected ? (
                                  <CheckSquare className="w-5 h-5 text-blue-600" />
                                ) : (
                                  <Square className="w-5 h-5 text-gray-400" />
                                )}
                              </button>
                            </td>
                            <td className="py-3 px-4">
                              <span className="font-mono text-sm text-gray-900">{variation.codigo}</span>
                            </td>
                            <td className="py-3 px-4">
                              <div>
                                <p className="text-sm text-gray-900">{variation.description || '-'}</p>
                                {(hasPromotion || isBestSeller || isNew) && (
                                  <div className="flex gap-1 mt-1">
                                    {hasPromotion && (
                                      <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded">PROMO</span>
                                    )}
                                    {isBestSeller && (
                                      <span className="text-xs bg-orange-100 text-orange-800 px-2 py-0.5 rounded">TOP</span>
                                    )}
                                    {isNew && (
                                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">NUEVO</span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <span className="text-sm text-gray-600">{variation.info || '-'}</span>
                            </td>
                            <td className="py-3 px-4">
                              <span className="text-sm text-gray-600">{variation.quantidade || '-'}</span>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex justify-center">
                                {variation.image_url ? (
                                  <img
                                    src={variation.image_url}
                                    alt={variation.nome}
                                    className="w-12 h-12 object-cover rounded border"
                                  />
                                ) : (
                                  <div className="w-12 h-12 bg-gray-100 rounded border flex items-center justify-center text-xs text-gray-400">
                                    Sin img
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center p-6 border-t bg-gray-50">
              <div className="text-sm text-gray-600">
                {selectedGroup.variations.filter(v => selectedProducts.has(v.id)).length} de {selectedGroup.variations.length} variações selecionadas
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    const newSelected = new Set(selectedProducts)
                    selectedGroup.variations.forEach(v => newSelected.add(v.id))
                    setSelectedProducts(newSelected)
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Selecionar Todas
                </button>
                <button
                  onClick={() => {
                    setShowVariationsModal(false)
                    setSelectedGroup(null)
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Catalog
