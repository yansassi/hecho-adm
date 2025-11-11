import React, { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Search, Eye, EyeOff, Building2, Package, AlertTriangle, Link2, X, ShoppingCart, FileText } from 'lucide-react'
import { supabase, Fornecedor, Product, FornecedorProduto } from '../lib/supabase'
import SupplierForm from './SupplierForm'
import PurchaseOrderForm from './PurchaseOrderForm'
import PurchaseOrdersList from './PurchaseOrdersList'

type SupplierWithProducts = Fornecedor & {
  fornecedor_produtos?: (FornecedorProduto & { products?: Product })[]
}

type TabType = 'suppliers' | 'orders'

const Suppliers: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('suppliers')
  const [suppliers, setSuppliers] = useState<SupplierWithProducts[]>([])
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all')
  const [showForm, setShowForm] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<Fornecedor | undefined>()
  const [showLowStock, setShowLowStock] = useState(false)
  const [showLinkProducts, setShowLinkProducts] = useState(false)
  const [showPurchaseOrderForm, setShowPurchaseOrderForm] = useState(false)
  const [selectedSupplier, setSelectedSupplier] = useState<Fornecedor | null>(null)
  const [allProducts, setAllProducts] = useState<Product[]>([])
  const [productSearchTerm, setProductSearchTerm] = useState('')
  const [expandedSuppliers, setExpandedSuppliers] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    await Promise.all([
      fetchSuppliers(),
      fetchLowStockProducts(),
      fetchAllProducts()
    ])
  }

  const fetchSuppliers = async () => {
    try {
      const { data, error } = await supabase
        .from('fornecedores')
        .select(`
          *,
          fornecedor_produtos (
            *,
            products (*)
          )
        `)
        .order('nome', { ascending: true })

      if (error) throw error
      setSuppliers(data || [])
    } catch (error) {
      console.error('Erro ao buscar fornecedores:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchLowStockProducts = async () => {
    try {
      // Buscar produtos com estoque baixo
      const { data: lowStockData, error: lowStockError } = await supabase
        .from('products')
        .select('*')
        .lte('stock', 5)
        .eq('active', true)
        .order('stock', { ascending: true })

      if (lowStockError) throw lowStockError

      // Buscar todos os produtos que têm fornecedores vinculados
      const { data: linkedProducts, error: linkedError } = await supabase
        .from('fornecedor_produtos')
        .select('product_id')

      if (linkedError) throw linkedError

      // Criar Set com IDs dos produtos vinculados para busca rápida
      const linkedProductIds = new Set(linkedProducts.map(lp => lp.product_id))

      // Filtrar apenas produtos que NÃO têm fornecedor vinculado
      const unlinkedLowStock = (lowStockData || []).filter(
        product => !linkedProductIds.has(product.id)
      )

      setLowStockProducts(unlinkedLowStock)
    } catch (error) {
      console.error('Erro ao buscar produtos com estoque baixo:', error)
    }
  }

  const fetchAllProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('active', true)
        .order('nome', { ascending: true })

      if (error) throw error
      setAllProducts(data || [])
    } catch (error) {
      console.error('Erro ao buscar produtos:', error)
    }
  }

  const deleteSupplier = async (id: string, nome: string) => {
    if (!confirm(`Tem certeza que deseja excluir o fornecedor "${nome}"?`)) return

    try {
      const { error } = await supabase
        .from('fornecedores')
        .delete()
        .eq('id', id)

      if (error) throw error
      await fetchSuppliers()
    } catch (error) {
      console.error('Erro ao excluir fornecedor:', error)
      alert('Erro ao excluir fornecedor. Pode haver produtos associados.')
    }
  }

  const toggleSupplierStatus = async (id: string, active: boolean) => {
    try {
      const { error } = await supabase
        .from('fornecedores')
        .update({ active: !active, updated_at: new Date().toISOString() })
        .eq('id', id)

      if (error) throw error
      await fetchSuppliers()
    } catch (error) {
      console.error('Erro ao atualizar status do fornecedor:', error)
    }
  }

  const linkProductToSupplier = async (productId: string, supplierId: string) => {
    try {
      const { error } = await supabase
        .from('fornecedor_produtos')
        .insert({
          fornecedor_id: supplierId,
          product_id: productId,
          preco_fornecedor: 0,
          tempo_entrega_dias: 0,
          quantidade_minima: 1
        })

      if (error) throw error
      
      // Atualizar tudo após vincular
      await fetchSuppliers()
      await fetchLowStockProducts() // Isso vai remover o produto da lista de não vinculados
      
      alert('Produto associado ao fornecedor com sucesso!')
    } catch (error: any) {
      if (error.code === '23505') {
        alert('Este produto já está associado a este fornecedor.')
      } else {
        console.error('Erro ao associar produto:', error)
        alert('Erro ao associar produto ao fornecedor.')
      }
    }
  }

  const unlinkProductFromSupplier = async (linkId: string) => {
    if (!confirm('Tem certeza que deseja remover esta associação?')) return

    try {
      const { error } = await supabase
        .from('fornecedor_produtos')
        .delete()
        .eq('id', linkId)

      if (error) throw error
      
      // Atualizar tudo após desvincular
      await fetchSuppliers()
      await fetchLowStockProducts() // O produto pode voltar para a lista se tiver estoque baixo
    } catch (error) {
      console.error('Erro ao remover associação:', error)
      alert('Erro ao remover associação.')
    }
  }

  const handleEdit = (supplier: Fornecedor) => {
    setEditingSupplier(supplier)
    setShowForm(true)
  }

  const handleCloseForm = () => {
    setShowForm(false)
    setEditingSupplier(undefined)
  }

  const handleSave = () => {
    fetchSuppliers()
    handleCloseForm()
  }

  const toggleExpandSupplier = (supplierId: string) => {
    const newExpanded = new Set(expandedSuppliers)
    if (newExpanded.has(supplierId)) {
      newExpanded.delete(supplierId)
    } else {
      newExpanded.add(supplierId)
    }
    setExpandedSuppliers(newExpanded)
  }

  const filteredSuppliers = suppliers.filter(supplier => {
    const searchLower = searchTerm.toLowerCase()
    const matchesSearch = supplier.nome.toLowerCase().includes(searchLower) ||
                         (supplier.ruc && supplier.ruc.toLowerCase().includes(searchLower)) ||
                         (supplier.cidade && supplier.cidade.toLowerCase().includes(searchLower))

    const matchesStatusFilter = filterActive === 'all' ||
                         (filterActive === 'active' && supplier.active) ||
                         (filterActive === 'inactive' && !supplier.active)

    return matchesSearch && matchesStatusFilter
  })

  const filteredProducts = allProducts.filter(product => {
    const searchLower = productSearchTerm.toLowerCase()
    return product.nome.toLowerCase().includes(searchLower) ||
           product.codigo.toLowerCase().includes(searchLower)
  })

  const getSupplierProductCount = (supplier: SupplierWithProducts) => {
    return supplier.fornecedor_produtos?.length || 0
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
          <h1 className="text-2xl font-bold text-gray-900">Fornecedores</h1>
          <p className="text-gray-600">Gerencie fornecedores, produtos e pedidos de compra</p>
        </div>
        <div className="flex gap-2">
          {activeTab === 'suppliers' && (
            <button
              onClick={() => setShowForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Novo Fornecedor
            </button>
          )}
          {activeTab === 'orders' && (
            <button
              onClick={() => setShowPurchaseOrderForm(true)}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Novo Pedido
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-4">
          <button
            onClick={() => setActiveTab('suppliers')}
            className={`pb-4 px-2 font-medium transition-colors border-b-2 flex items-center gap-2 ${
              activeTab === 'suppliers'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Building2 className="w-4 h-4" />
            Fornecedores
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`pb-4 px-2 font-medium transition-colors border-b-2 flex items-center gap-2 ${
              activeTab === 'orders'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <FileText className="w-4 h-4" />
            Pedidos de Compra
          </button>
        </nav>
      </div>

      {/* Conteúdo das Abas */}
      {activeTab === 'suppliers' ? (
        <>{/* Alerta de Produtos com Estoque Baixo */}
      {lowStockProducts.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-orange-900">
                  Produtos Baixo Estoque Não Vinculados ({lowStockProducts.length})
                </h3>
                <button
                  onClick={() => setShowLowStock(!showLowStock)}
                  className="text-sm text-orange-700 hover:text-orange-900 font-medium"
                >
                  {showLowStock ? 'Ocultar' : 'Ver Produtos'}
                </button>
              </div>
              <p className="text-sm text-orange-800 mb-3">
                Há {lowStockProducts.length} {lowStockProducts.length === 1 ? 'produto' : 'produtos'} com 5 ou menos unidades em estoque e sem fornecedor vinculado. 
                Vincule fornecedores para facilitar os pedidos de reposição.
              </p>
              
              {showLowStock && (
                <div className="mt-4 space-y-2 max-h-96 overflow-y-auto">
                  {lowStockProducts.map((product) => (
                    <div key={product.id} className="bg-white rounded-lg p-3 border border-orange-200">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Package className="w-4 h-4 text-orange-600" />
                            <span className="font-medium text-gray-900">{product.nome}</span>
                            <span className="text-xs text-gray-500">({product.codigo})</span>
                          </div>
                          <div className="mt-1 flex items-center gap-4 text-sm">
                            <span className={`font-semibold ${
                              product.stock === 0 ? 'text-red-600' :
                              product.stock <= 2 ? 'text-orange-600' :
                              'text-yellow-600'
                            }`}>
                              Estoque: {product.stock} {product.quantidade}
                            </span>
                            <span className="text-gray-600">
                              Preço: Gs. {product.price.toLocaleString()}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setShowLinkProducts(true)
                            setProductSearchTerm(product.nome)
                          }}
                          className="ml-4 px-3 py-1.5 bg-orange-600 text-white text-sm rounded-lg hover:bg-orange-700 transition-colors flex items-center gap-1"
                        >
                          <Link2 className="w-3.5 h-3.5" />
                          Associar Fornecedor
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Total de Fornecedores</p>
              <p className="text-2xl font-bold text-blue-600 mt-2">{suppliers.length}</p>
            </div>
            <div className="p-3 rounded-full bg-blue-500">
              <Building2 className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Fornecedores Ativos</p>
              <p className="text-2xl font-bold text-green-600 mt-2">
                {suppliers.filter(s => s.active).length}
              </p>
            </div>
            <div className="p-3 rounded-full bg-green-500">
              <Building2 className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Produtos Sem Fornecedor</p>
              <p className="text-2xl font-bold text-orange-600 mt-2">
                {lowStockProducts.length}
              </p>
            </div>
            <div className="p-3 rounded-full bg-orange-500">
              <AlertTriangle className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Total de Associações</p>
              <p className="text-2xl font-bold text-purple-600 mt-2">
                {suppliers.reduce((acc, s) => acc + getSupplierProductCount(s), 0)}
              </p>
            </div>
            <div className="p-3 rounded-full bg-purple-500">
              <Link2 className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Botão para Associar Produtos */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowLinkProducts(true)}
          className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
        >
          <Link2 className="w-4 h-4" />
          Associar Produtos a Fornecedores
        </button>
      </div>

      {/* Tabela de Fornecedores */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Buscar fornecedores..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <select
              value={filterActive}
              onChange={(e) => setFilterActive(e.target.value as 'all' | 'active' | 'inactive')}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Todos</option>
              <option value="active">Ativos</option>
              <option value="inactive">Inativos</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-3 px-6 font-medium text-gray-900">Nome</th>
                <th className="text-left py-3 px-6 font-medium text-gray-900">RUC</th>
                <th className="text-left py-3 px-6 font-medium text-gray-900">Telefone</th>
                <th className="text-left py-3 px-6 font-medium text-gray-900">Cidade</th>
                <th className="text-left py-3 px-6 font-medium text-gray-900">Produtos</th>
                <th className="text-left py-3 px-6 font-medium text-gray-900">Status</th>
                <th className="text-left py-3 px-6 font-medium text-gray-900">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredSuppliers.map((supplier) => {
                const productCount = getSupplierProductCount(supplier)
                const isExpanded = expandedSuppliers.has(supplier.id)
                
                return (
                  <React.Fragment key={supplier.id}>
                    <tr className="hover:bg-gray-50">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-gray-400" />
                          <div>
                            <p className="font-medium text-gray-900">{supplier.nome}</p>
                            {supplier.razao_social && (
                              <p className="text-xs text-gray-500">{supplier.razao_social}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-gray-600">{supplier.ruc || '-'}</span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-gray-600">{supplier.telefone || '-'}</span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-gray-600">{supplier.cidade || '-'}</span>
                      </td>
                      <td className="py-4 px-6">
                        <button
                          onClick={() => toggleExpandSupplier(supplier.id)}
                          className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
                        >
                          <Package className="w-4 h-4" />
                          <span className="font-medium">{productCount}</span>
                          {productCount > 0 && (
                            <span className="text-xs text-gray-500">
                              {isExpanded ? '▼' : '▶'}
                            </span>
                          )}
                        </button>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`px-2 py-1 rounded-full text-sm ${
                          supplier.active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {supplier.active ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedSupplier(supplier)
                              setShowLinkProducts(true)
                            }}
                            className="p-1 text-gray-600 hover:text-purple-600 transition-colors"
                            title="Associar produtos"
                          >
                            <Link2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => toggleSupplierStatus(supplier.id, supplier.active)}
                            className="p-1 text-gray-600 hover:text-blue-600 transition-colors"
                            title={supplier.active ? 'Desativar fornecedor' : 'Ativar fornecedor'}
                          >
                            {supplier.active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => handleEdit(supplier)}
                            className="p-1 text-gray-600 hover:text-blue-600 transition-colors"
                            title="Editar fornecedor"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteSupplier(supplier.id, supplier.nome)}
                            className="p-1 text-gray-600 hover:text-red-600 transition-colors"
                            title="Excluir fornecedor"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                    
                    {/* Linha expandida com produtos */}
                    {isExpanded && productCount > 0 && (
                      <tr>
                        <td colSpan={7} className="bg-gray-50 p-6">
                          <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <Package className="w-4 h-4" />
                            Produtos Associados ({productCount})
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {supplier.fornecedor_produtos?.map((link) => (
                              <div key={link.id} className="bg-white p-4 rounded-lg border border-gray-200">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <p className="font-medium text-gray-900">
                                      {link.products?.nome || 'Produto não encontrado'}
                                    </p>
                                    <div className="mt-2 space-y-1 text-sm text-gray-600">
                                      <p>Código: {link.products?.codigo}</p>
                                      <p>Estoque Atual: {link.products?.stock} {link.products?.quantidade}</p>
                                      {link.preco_fornecedor > 0 && (
                                        <p>Preço Fornecedor: Gs. {link.preco_fornecedor.toLocaleString()}</p>
                                      )}
                                      {link.tempo_entrega_dias > 0 && (
                                        <p>Tempo Entrega: {link.tempo_entrega_dias} dias</p>
                                      )}
                                      {link.quantidade_minima > 1 && (
                                        <p>Qtd. Mínima: {link.quantidade_minima}</p>
                                      )}
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => unlinkProductFromSupplier(link.id)}
                                    className="ml-2 p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                                    title="Remover associação"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                )
              })}
            </tbody>
          </table>
        </div>

        {filteredSuppliers.length === 0 && (
          <div className="text-center py-12">
            <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">Nenhum fornecedor encontrado.</p>
            <button
              onClick={() => setShowForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Cadastrar Primeiro Fornecedor
            </button>
          </div>
        )}
      </div>

      {/* Modal de Formulário de Fornecedor */}
      {showForm && (
        <SupplierForm
          supplier={editingSupplier}
          onClose={handleCloseForm}
          onSave={handleSave}
        />
      )}

      {/* Modal para Associar Produtos */}
      {showLinkProducts && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                Associar Produtos a Fornecedores
              </h2>
              <button
                onClick={() => {
                  setShowLinkProducts(false)
                  setSelectedSupplier(null)
                  setProductSearchTerm('')
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              {/* Busca de Produtos */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Buscar Produto
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Digite o nome ou código do produto..."
                    value={productSearchTerm}
                    onChange={(e) => setProductSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Lista de Produtos */}
              <div className="space-y-3">
                {filteredProducts.map((product) => (
                  <div
                    key={product.id}
                    className={`p-4 rounded-lg border-2 ${
                      product.stock <= 5
                        ? 'border-orange-300 bg-orange-50'
                        : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Package className={`w-4 h-4 ${
                            product.stock <= 5 ? 'text-orange-600' : 'text-gray-400'
                          }`} />
                          <h3 className="font-semibold text-gray-900">{product.nome}</h3>
                          {product.stock <= 5 && (
                            <span className="px-2 py-0.5 bg-orange-100 text-orange-800 text-xs rounded-full font-medium">
                              Estoque Baixo
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-600 space-y-1">
                          <p>Código: {product.codigo}</p>
                          <p className={`font-medium ${
                            product.stock === 0 ? 'text-red-600' :
                            product.stock <= 5 ? 'text-orange-600' :
                            'text-green-600'
                          }`}>
                            Estoque: {product.stock} {product.quantidade}
                          </p>
                          <p>Preço: Gs. {product.price.toLocaleString()}</p>
                        </div>
                      </div>
                      
                      <div className="ml-4">
                        <select
                          onChange={(e) => {
                            if (e.target.value) {
                              linkProductToSupplier(product.id, e.target.value)
                              e.target.value = ''
                            }
                          }}
                          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                          defaultValue=""
                        >
                          <option value="">Selecionar Fornecedor</option>
                          {suppliers
                            .filter(s => s.active)
                            .map((supplier) => (
                              <option key={supplier.id} value={supplier.id}>
                                {supplier.nome}
                              </option>
                            ))}
                        </select>
                      </div>
                    </div>
                  </div>
                ))}

                {filteredProducts.length === 0 && (
                  <div className="text-center py-12">
                    <ShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600">Nenhum produto encontrado.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      </>) : (
        <PurchaseOrdersList 
          suppliers={suppliers}
          onRefresh={fetchData}
        />
      )}

      {/* Modal de Formulário de Pedido de Compra */}
      {showPurchaseOrderForm && (
        <PurchaseOrderForm
          onClose={() => setShowPurchaseOrderForm(false)}
          onSave={() => {
            setShowPurchaseOrderForm(false)
            fetchData()
          }}
          suppliers={suppliers}
          lowStockProducts={lowStockProducts}
        />
      )}
    </div>
  )
}

export default Suppliers
