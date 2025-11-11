import React, { useState, useEffect, useImperativeHandle, forwardRef, useMemo } from 'react'
import { Edit, Trash2, Plus, Search, Eye, EyeOff, Upload, CheckSquare, Square, Tag, Trash, ChevronDown, X, AlertTriangle, Filter, Award, Sparkles, ChevronRight } from 'lucide-react'
import { supabase, ProductWithCategory, Category } from '../lib/supabase'
import * as XLSX from 'xlsx'

interface ProductsListProps {
  onEditProduct: (product: ProductWithCategory) => void
  initialFilter?: 'all' | 'active' | 'lowStock'
}

export interface ProductsListHandle {
  refresh: () => void
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

const ProductsList = forwardRef<ProductsListHandle, ProductsListProps>(({ onEditProduct, initialFilter = 'all' }, ref) => {
  const [products, setProducts] = useState<ProductWithCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all')
  const [filterStockStatus, setFilterStockStatus] = useState<'all' | 'lowStock'>(initialFilter === 'lowStock' ? 'lowStock' : 'all')
  const [filterCategory, setFilterCategory] = useState<string>('all')

  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadMessage, setUploadMessage] = useState('')
  const [categoriesMap, setCategoriesMap] = useState<Map<string, string>>(new Map())

  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set())
  const [showBulkActions, setShowBulkActions] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [bulkAction, setBulkAction] = useState<'category' | 'status' | 'delete' | null>(null)
  const [bulkCategory, setBulkCategory] = useState('')
  const [bulkStatus, setBulkStatus] = useState<boolean>(true)
  const [applyingBulk, setApplyingBulk] = useState(false)

  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 50
  const [showFormatInfo, setShowFormatInfo] = useState(false)
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false)
  const [bulkDeleteCodes, setBulkDeleteCodes] = useState('')
  const [deletingBulk, setDeletingBulk] = useState(false)
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [bestSellers, setBestSellers] = useState<BestSeller[]>([])
  const [specialFilter, setSpecialFilter] = useState<'all' | 'bestsellers' | 'new' | 'promotions'>('all')
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [selectedGroup, setSelectedGroup] = useState<ProductGroup | null>(null)
  const [showVariationsModal, setShowVariationsModal] = useState(false)

  useEffect(() => {
    fetchProducts()
    fetchCategoriesMap()
    fetchCategories()
    fetchPromotions()
    fetchBestSellers()
    if (initialFilter === 'lowStock') {
      setFilterStockStatus('lowStock')
    } else if (initialFilter === 'active') {
      setFilterActive('active')
    }
  }, [initialFilter])

  useImperativeHandle(ref, () => ({
    refresh: () => {
      fetchProducts()
    }
  }), [])

  const fetchProducts = async () => {
    try {
      console.log('=== INICIANDO BUSCA DE PRODUTOS ===')

      console.log('Buscando produtos com join de categorias...')

      let allProducts: ProductWithCategory[] = []
      let pageNumber = 0
      const pageSize = 500
      let hasMore = true
      const seenIds = new Set<string>()

      while (hasMore) {
        const { data: productsData, error: productsError } = await supabase
          .from('products')
          .select('*, categories(id, name, description)', { count: 'exact' })
          .order('created_at', { ascending: false })
          .range(pageNumber * pageSize, (pageNumber + 1) * pageSize - 1)

        if (productsError) {
          console.error('Erro ao buscar produtos:', productsError)
          throw productsError
        }

        if (!productsData || productsData.length === 0) {
          hasMore = false
        } else {
          const data = (productsData || [])
            .filter(product => {
              if (seenIds.has(product.id)) {
                console.warn(`Produto duplicado encontrado: ${product.id} - ${product.codigo}`)
                return false
              }
              seenIds.add(product.id)
              return true
            })
            .map(product => ({
              ...product,
              categories: product.categories as any
            }))

          allProducts = [...allProducts, ...data]
          pageNumber++

          if (productsData.length < pageSize) {
            hasMore = false
          }
        }
      }

      console.log('Produtos encontrados:', allProducts.length)
      console.log('=== DADOS FINAIS ===')
      console.log('Total de produtos:', allProducts.length)
      if (allProducts.length > 0) {
        console.log('Primeiro produto completo:', allProducts[0])
        console.log('Categoria do primeiro produto:', allProducts[0].categories?.name || 'Sem categoria')
      }

      setProducts(allProducts)
    } catch (error) {
      console.error('Erro geral ao buscar produtos:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchCategoriesMap = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name')

      if (error) throw error

      const map = new Map<string, string>()
      data?.forEach(category => {
        map.set(category.name.toLowerCase(), category.id)
      })
      setCategoriesMap(map)
    } catch (error) {
      console.error('Erro ao buscar categorias para mapeamento:', error)
    }
  }

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

  const toggleSelectAll = () => {
    if (selectedProducts.size === paginatedProducts.length && paginatedProducts.every(p => selectedProducts.has(p.id))) {
      paginatedProducts.forEach(p => selectedProducts.delete(p.id))
      setSelectedProducts(new Set(selectedProducts))
    } else {
      const newSelected = new Set(selectedProducts)
      paginatedProducts.forEach(p => newSelected.add(p.id))
      setSelectedProducts(newSelected)
    }
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

  const applyBulkAction = async () => {
    if (selectedProducts.size === 0) return

    if (bulkAction === 'delete') {
      if (!confirm(`Tem certeza que deseja excluir ${selectedProducts.size} produto(s)?`)) return
    }

    setApplyingBulk(true)

    try {
      const productIds = Array.from(selectedProducts)

      if (bulkAction === 'category') {
        if (!bulkCategory) {
          alert('Por favor, selecione uma categoria.')
          setApplyingBulk(false)
          return
        }

        const selectedCategory = categories.find(cat => cat.id === bulkCategory)
        if (!selectedCategory) {
          alert('Categoria não encontrada.')
          setApplyingBulk(false)
          return
        }

        const productsToUpdate = products.filter(p => productIds.includes(p.id))

        const updatesData = {
          category_id: bulkCategory,
          updated_at: new Date().toISOString()
        }

        const { error: updateError } = await supabase
          .from('products')
          .update(updatesData)
          .in('id', productIds)

        if (updateError) {
          console.error('Erro ao atualizar categoria:', updateError)
          throw updateError
        }
      } else if (bulkAction === 'status') {
        const { error } = await supabase
          .from('products')
          .update({ active: bulkStatus, updated_at: new Date().toISOString() })
          .in('id', productIds)

        if (error) throw error
      } else if (bulkAction === 'delete') {
        const { error } = await supabase
          .from('products')
          .delete()
          .in('id', productIds)

        if (error) throw error
      }

      await fetchProducts()
      setSelectedProducts(new Set())
      setShowBulkActions(false)
      setBulkAction(null)
      setBulkCategory('')
    } catch (error) {
      console.error('Erro ao aplicar ação em massa:', error)
      alert('Erro ao aplicar ação em massa. Tente novamente.')
    } finally {
      setApplyingBulk(false)
    }
  }

  const deleteProduct = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este produto?')) return

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id)

      if (error) throw error
      await fetchProducts()
    } catch (error) {
      console.error('Erro ao excluir produto:', error)
    }
  }

  const toggleProductStatus = async (id: string, active: boolean) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({ active: !active })
        .eq('id', id)

      if (error) throw error
      await fetchProducts()
    } catch (error) {
      console.error('Erro ao atualizar status do produto:', error)
    }
  }

  const handleBulkDeleteByCodes = async () => {
    if (!bulkDeleteCodes.trim()) {
      alert('Digite os códigos dos produtos para excluir.')
      return
    }

    const codes = bulkDeleteCodes
      .split(',')
      .map(code => code.trim())
      .filter(code => code.length > 0)

    if (codes.length === 0) {
      alert('Nenhum código válido encontrado.')
      return
    }

    if (!confirm(`Tem certeza que deseja excluir ${codes.length} produto(s) com os códigos informados?`)) {
      return
    }

    setDeletingBulk(true)

    try {
      const { data: productsToDelete, error: fetchError } = await supabase
        .from('products')
        .select('id, codigo, nome')
        .in('codigo', codes)

      if (fetchError) throw fetchError

      if (!productsToDelete || productsToDelete.length === 0) {
        alert('Nenhum produto encontrado com os códigos informados.')
        setDeletingBulk(false)
        return
      }

      const productIds = productsToDelete.map(p => p.id)

      const { error: deleteError } = await supabase
        .from('products')
        .delete()
        .in('id', productIds)

      if (deleteError) throw deleteError

      alert(`${productsToDelete.length} produto(s) excluído(s) com sucesso!`)
      setBulkDeleteCodes('')
      setShowBulkDeleteModal(false)
      await fetchProducts()
    } catch (error) {
      console.error('Erro ao excluir produtos em massa:', error)
      alert('Erro ao excluir produtos. Tente novamente.')
    } finally {
      setDeletingBulk(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      setUploadMessage('')
    }
  }

  const handleUpload = async () => {
    if (!file) {
      setUploadMessage('Por favor, selecione um arquivo .xlsx para upload.')
      return
    }

    setUploading(true)
    
    try {
      const reader = new FileReader()
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer)
          const workbook = XLSX.read(data, { type: 'array' })
          const sheetName = workbook.SheetNames[0]
          const worksheet = workbook.Sheets[sheetName]
          const json = XLSX.utils.sheet_to_json(worksheet)

          if (json.length === 0) {
            setUploadMessage('O arquivo está vazio ou não contém dados válidos.')
            setUploading(false)
            return
          }

          const productsToUpsert = json.map((row: any, index: number) => {
            // Parse price fields - convert to numbers
            const parsePrice = (value: any) => {
              if (!value) return 0
              const num = parseFloat(String(value).replace(/[^\d.]/g, ''))
              return isNaN(num) ? 0 : num
            }

            // Mapeamento exato das colunas da planilha
            const codigo = String(row['Código'] || '').trim()
            const referencia = String(row['Referência'] || '').trim()
            const nome = String(row['Nome'] || '').trim()
            const info = String(row['Info'] || '').trim()
            const quantidade = String(row['Quantidade'] || '').trim()
            const codigoBarras = String(row['Código de Barras'] || '').trim()
            const descricao = String(row['Descrição'] || '').trim()
            const categoriaStrRaw = String(row['Categoria'] || '').trim()
            const categoriaStr = categoriaStrRaw.toLowerCase()

            // Preços
            const precoVarejo = parsePrice(row['Preço Varejo'] || 0)
            const precoMinimo = parsePrice(row['Preço Mínimo'] || 0)
            const precioAtacado = parsePrice(row['Precio Atacado'] || 0)
            const precioInterior = parsePrice(row['Precio Interior'] || 0)
            const precioMayorista = parsePrice(row['Precio Mayorista'] || 0)
            const precioSuperMayorista = parsePrice(row['Precio Super Mayorista'] || 0)

            // Estoque e Status
            const estoqueStr = String(row['Estoque'] || '0')
            const stock = parseInt(estoqueStr.replace(/[^\d]/g, ''), 10)
            const ativoStr = String(row['Status'] || '').toLowerCase()
            const active = ['s', 'si', 'sim', 'yes', 'y', '1', 'true', 'ativo', 'active', 'activo'].includes(ativoStr)

            // URL da imagem
            const urlImagem = String(row['URL Imagem'] || '').trim()

            // Buscar o category_id pelo nome da categoria
            const categoryId = categoriaStr ? categoriesMap.get(categoriaStr) || null : null

            // Log para debug - mostra apenas os primeiros 3 produtos
            if (index < 3) {
              console.log(`Produto ${index + 1}:`, {
                codigo,
                nome,
                info,
                quantidade,
                descricao,
                categoriaOriginal: categoriaStrRaw,
                categoriaLowercase: categoriaStr,
                categoryIdEncontrado: categoryId,
                precoVarejo,
                precioAtacado,
                stock,
                active
              })
            }

            // Gerar URL da imagem automaticamente se não houver URL ou for N/D
            let imageUrl = ''
            if (urlImagem && urlImagem !== 'N/D' && urlImagem !== '') {
              imageUrl = urlImagem
            } else if (categoryId && codigo) {
              const codigoLimpo = codigo.replace(/-/g, '')
              imageUrl = `https://hechopy.com/img/${categoriaStr}/${codigoLimpo}.webp`
            }

            return {
              codigo,
              nome,
              info,
              quantidade,
              codigo_barra: codigoBarras || ' ',
              description: descricao,
              price: precoVarejo,
              price_atacado: precioAtacado,
              price_interior: precioInterior,
              price_mayorista: precioMayorista,
              price_super_mayorista: precioSuperMayorista,
              stock: isNaN(stock) ? 0 : stock,
              active,
              image_url: imageUrl,
              category_id: categoryId || null,
              updated_at: new Date().toISOString()
            }
          }).filter(product => product.codigo && product.nome)

          if (productsToUpsert.length === 0) {
            setUploadMessage('Nenhum produto válido encontrado. Verifique se as colunas "Código" e "Nome" estão preenchidas.')
            setUploading(false)
            return
          }

          // Contar produtos sem categoria
          const produtosSemCategoria = productsToUpsert.filter(p => !p.category_id).length
          const produtosComCategoria = productsToUpsert.filter(p => p.category_id).length

          console.log('=== RESUMO DO UPLOAD ===')
          console.log(`Total de produtos: ${productsToUpsert.length}`)
          console.log(`Produtos com categoria: ${produtosComCategoria}`)
          console.log(`Produtos SEM categoria: ${produtosSemCategoria}`)

          if (produtosSemCategoria > 0) {
            console.log('Categorias disponíveis no mapa:', Array.from(categoriesMap.keys()))
            console.log('Exemplos de produtos sem categoria:',
              productsToUpsert
                .filter(p => !p.category_id)
                .slice(0, 5)
                .map(p => ({ codigo: p.codigo, nome: p.nome }))
            )
          }

          // Processar em lotes para evitar sobrecarga
          const batchSize = 100
          let processedCount = 0

          for (let i = 0; i < productsToUpsert.length; i += batchSize) {
            const batch = productsToUpsert.slice(i, i + batchSize)

            const { error } = await supabase
              .from('products')
              .upsert(batch, { onConflict: 'codigo' })

            if (error) {
              console.error('Supabase error:', error)
              throw new Error(`Erro ao salvar produtos: ${error.message}`)
            }
            processedCount += batch.length

            setUploadMessage(`Processando... ${processedCount}/${productsToUpsert.length} produtos`)
          }

          const mensagemCategoria = produtosSemCategoria > 0
            ? ` ⚠️ ${produtosSemCategoria} produto(s) não tiveram categoria reconhecida - verifique os nomes no console.`
            : ''

          setUploadMessage(`✅ Sucesso! ${productsToUpsert.length} produtos foram adicionados/atualizados.${mensagemCategoria}`)
          await fetchProducts()
          
          // Limpar o input de arquivo
          const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
          if (fileInput) fileInput.value = ''
          
        } catch (error: any) {
          console.error('Erro ao processar dados:', error)
          if (error.message?.includes('row-level security policy')) {
            setUploadMessage('❌ Erro de permissão: Você não tem autorização para adicionar/editar produtos. Verifique se está logado com uma conta autorizada.')
          } else {
            setUploadMessage(`❌ Erro ao processar dados: ${error.message}`)
          }
        } finally {
          setUploading(false)
          setFile(null)
        }
      }
      
      reader.onerror = () => {
        setUploadMessage('❌ Erro ao ler o arquivo. Verifique se é um arquivo Excel válido.')
        setUploading(false)
        setFile(null)
      }
      
      reader.readAsArrayBuffer(file)
    } catch (error: any) {
      console.error('Erro ao processar arquivo:', error)
      setUploadMessage(`❌ Erro ao processar arquivo: ${error.message}`)
      setUploading(false)
      setFile(null)
    }
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

  const filteredProducts = products.filter(product => {
    const searchLower = searchTerm.toLowerCase()
    const codigoSemHifen = product.codigo.replace(/-/g, '').toLowerCase()
    const searchSemHifen = searchLower.replace(/-/g, '')

    const matchesSearch = product.nome.toLowerCase().includes(searchLower) ||
                         product.description.toLowerCase().includes(searchLower) ||
                         product.codigo.toLowerCase().includes(searchLower) ||
                         codigoSemHifen.includes(searchSemHifen)

    const matchesStatusFilter = filterActive === 'all' ||
                         (filterActive === 'active' && product.active) ||
                         (filterActive === 'inactive' && !product.active)

    const matchesStockFilter = filterStockStatus === 'all' ||
                         (filterStockStatus === 'lowStock' && product.stock <= 5)

    const matchesCategoryFilter = filterCategory === 'all' ||
                         (filterCategory === 'uncategorized' && !product.category_id) ||
                         (product.category_id === filterCategory)

    return matchesSearch && matchesStatusFilter && matchesStockFilter && matchesCategoryFilter
  })

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

      const matchesStatusFilter = filterActive === 'all' ||
        (filterActive === 'active' && group.variations.some(v => v.active)) ||
        (filterActive === 'inactive' && group.variations.some(v => !v.active))

      const matchesStockFilter = filterStockStatus === 'all' ||
        (filterStockStatus === 'lowStock' && group.variations.some(v => v.stock <= 5))

      const matchesCategory = filterCategory === 'all' ||
        (filterCategory === 'uncategorized' && !group.category_id) ||
        group.category_id === filterCategory

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

      return matchesSearch && matchesStatusFilter && matchesStockFilter && matchesCategory && matchesSpecialFilter
    })
  }, [productGroups, searchTerm, filterActive, filterStockStatus, filterCategory, specialFilter, promotions, bestSellers])

  const totalPages = Math.ceil(filteredGroups.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedGroups = useMemo(() => {
    return filteredGroups.slice(startIndex, endIndex)
  }, [filteredGroups, currentPage, itemsPerPage])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, filterActive, filterStockStatus, filterCategory, specialFilter])

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
          {selectedProducts.size > 0 && (
            <p className="text-sm text-blue-600">
              {selectedProducts.size} produto(s) selecionado(s)
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {selectedProducts.size > 0 && (
            <button
              onClick={() => setShowBulkActions(!showBulkActions)}
              className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors flex items-center gap-2"
            >
              <Tag className="w-4 h-4" />
              Ações em Massa
            </button>
          )}
          <button
            onClick={() => setShowBulkDeleteModal(true)}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
          >
            <Trash className="w-4 h-4" />
            Excluir por Códigos
          </button>
          <button
            onClick={() => onEditProduct({} as ProductWithCategory)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Novo Produto
          </button>
        </div>
      </div>

      {showBulkActions && selectedProducts.size > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-orange-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Ações em Massa ({selectedProducts.size} selecionados)</h3>

          <div className="space-y-4">
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setBulkAction('category')
                  setBulkStatus(true)
                }}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  bulkAction === 'category'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Alterar Categoria
              </button>
              <button
                onClick={() => {
                  setBulkAction('status')
                  setBulkCategory('')
                }}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  bulkAction === 'status'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Alterar Status
              </button>
              <button
                onClick={() => {
                  setBulkAction('delete')
                  setBulkCategory('')
                }}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  bulkAction === 'delete'
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Excluir Produtos
              </button>
            </div>

            {bulkAction === 'category' && (
              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Selecione a Nova Categoria
                  </label>
                  <select
                    value={bulkCategory}
                    onChange={(e) => setBulkCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Sem categoria</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={applyBulkAction}
                  disabled={applyingBulk}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {applyingBulk ? 'Aplicando...' : 'Aplicar'}
                </button>
              </div>
            )}

            {bulkAction === 'status' && (
              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Selecione o Novo Status
                  </label>
                  <select
                    value={bulkStatus.toString()}
                    onChange={(e) => setBulkStatus(e.target.value === 'true')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="true">Ativo</option>
                    <option value="false">Inativo</option>
                  </select>
                </div>
                <button
                  onClick={applyBulkAction}
                  disabled={applyingBulk}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {applyingBulk ? 'Aplicando...' : 'Aplicar'}
                </button>
              </div>
            )}

            {bulkAction === 'delete' && (
              <div className="flex gap-3 items-center">
                <p className="flex-1 text-red-600">
                  Atenção: Esta ação irá excluir permanentemente {selectedProducts.size} produto(s).
                </p>
                <button
                  onClick={applyBulkAction}
                  disabled={applyingBulk}
                  className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {applyingBulk ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <Trash className="w-4 h-4" />
                  )}
                  {applyingBulk ? 'Excluindo...' : 'Confirmar Exclusão'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Upload className="w-5 h-5" />
          Upload de Produtos (.xlsx)
        </h3>

        <button
          onClick={() => setShowFormatInfo(!showFormatInfo)}
          className="w-full mb-4 p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors flex items-center justify-between"
        >
          <span className="font-medium text-blue-900">Formato da Planilha</span>
          <ChevronDown className={`w-5 h-5 text-blue-700 transition-transform ${showFormatInfo ? 'rotate-180' : ''}`} />
        </button>

        {showFormatInfo && (
          <div className="bg-blue-50 p-4 rounded-lg mb-4 border border-blue-200">
            <p className="text-sm text-blue-800 mb-2">
              Sua planilha deve conter as seguintes colunas (nomes exatos, em sequência):
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-blue-700">
              <span>• <strong>Código</strong> (obrigatório)</span>
              <span>• <strong>Referência</strong></span>
              <span>• <strong>Nome</strong> (obrigatório)</span>
              <span>• <strong>Info</strong></span>
              <span>• <strong>Quantidade</strong></span>
              <span>• <strong>Código de Barras</strong></span>
              <span>• <strong>Descrição</strong></span>
              <span>• <strong>Categoria</strong> (nome da categoria, ex: bazar)</span>
              <span>• <strong>Preço Varejo</strong></span>
              <span>• <strong>Preço Mínimo</strong></span>
              <span>• <strong>Precio Atacado</strong></span>
              <span>• <strong>Precio Interior</strong></span>
              <span>• <strong>Precio Mayorista</strong></span>
              <span>• <strong>Precio Super Mayorista</strong></span>
              <span>• <strong>Estoque</strong></span>
              <span>• <strong>Status</strong> (S/Sim/Ativo para ativo)</span>
              <span>• <strong>URL Imagem</strong> (deixe vazio ou N/D para gerar automaticamente)</span>
              <span>• <strong>Criado em</strong> (ignorado no upload)</span>
              <span>• <strong>Atualizado em</strong> (ignorado no upload)</span>
            </div>
            <p className="text-sm text-blue-800 mt-2">
              <strong>Imagens automáticas:</strong> Se você preencher a coluna Categoria e deixar URL Imagem vazia ou como "N/D",
              a URL da imagem será gerada automaticamente no formato: <code className="bg-blue-100 px-1 rounded">https://hechopy.com/img/{'{categoria}'}/{'{codigo}'}.webp</code>
            </p>
            <p className="text-sm text-blue-800 mt-1">
              <strong>Nota:</strong> Todos os campos são opcionais exceto Código e Nome. Você pode editar posteriormente através da interface.
            </p>
          </div>
        )}
        
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="flex-1">
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-lg file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100 file:cursor-pointer
                border border-gray-300 rounded-lg"
            />
          </div>
          <button
            onClick={handleUpload}
            disabled={uploading || !file}
            className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {uploading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <Upload className="w-4 h-4" />
            )}
            {uploading ? 'Processando...' : 'Enviar Planilha'}
          </button>
        </div>
        
        {uploadMessage && (
          <div className={`mt-4 p-3 rounded-lg text-sm ${
            uploadMessage.includes('✅') || uploadMessage.includes('Sucesso') 
              ? 'bg-green-50 text-green-700 border border-green-200' 
              : uploadMessage.includes('❌') || uploadMessage.includes('Erro')
              ? 'bg-red-50 text-red-700 border border-red-200'
              : 'bg-blue-50 text-blue-700 border border-blue-200'
          }`}>
            {uploadMessage}
          </div>
        )}
      </div>

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
              <h3 className="text-sm font-semibold text-gray-900">Filtros</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              <select
                value={filterActive}
                onChange={(e) => setFilterActive(e.target.value as 'all' | 'active' | 'inactive')}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Todos Status</option>
                <option value="active">Ativos</option>
                <option value="inactive">Inativos</option>
              </select>
              <select
                value={filterStockStatus}
                onChange={(e) => setFilterStockStatus(e.target.value as 'all' | 'lowStock')}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Todo Estoque</option>
                <option value="lowStock">Estoque Baixo</option>
              </select>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Todas as Categorias</option>
                <option value="uncategorized">Sem Categoria</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="p-6">
          {filteredGroups.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600">Nenhum produto encontrado.</p>
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

      {showBulkDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-bold text-gray-900">Excluir Produtos por Códigos</h2>
              <button
                onClick={() => {
                  setShowBulkDeleteModal(false)
                  setBulkDeleteCodes('')
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Códigos dos Produtos
                </label>
                <textarea
                  value={bulkDeleteCodes}
                  onChange={(e) => setBulkDeleteCodes(e.target.value)}
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Digite os códigos separados por vírgula. Exemplo: 12354, 4516, 78910"
                />
                <p className="text-sm text-gray-500 mt-2">
                  Separe os códigos por vírgula. Exemplo: 12354, 4516, 78910
                </p>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-yellow-900">Atenção</p>
                    <p className="text-sm text-yellow-700 mt-1">
                      Esta ação irá excluir permanentemente os produtos com os códigos informados. Esta operação não pode ser desfeita.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
              <button
                onClick={() => {
                  setShowBulkDeleteModal(false)
                  setBulkDeleteCodes('')
                }}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleBulkDeleteByCodes}
                disabled={deletingBulk || !bulkDeleteCodes.trim()}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deletingBulk ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <Trash className="w-4 h-4" />
                )}
                {deletingBulk ? 'Excluindo...' : 'Excluir Produtos'}
              </button>
            </div>
          </div>
        </div>
      )}

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
                        <th className="text-center py-3 px-4 font-medium text-gray-900">Ações</th>
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
                            <td className="py-3 px-4">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => toggleProductStatus(variation.id, variation.active)}
                                  className="p-1 text-gray-600 hover:text-blue-600 transition-colors"
                                  title={variation.active ? 'Desativar produto' : 'Ativar produto'}
                                >
                                  {variation.active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                                <button
                                  onClick={() => onEditProduct(variation)}
                                  className="p-1 text-gray-600 hover:text-blue-600 transition-colors"
                                  title="Editar"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => deleteProduct(variation.id)}
                                  className="p-1 text-gray-600 hover:text-red-600 transition-colors"
                                  title="Excluir"
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
})

ProductsList.displayName = 'ProductsList'

export default ProductsList