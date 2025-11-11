import React, { useState } from 'react'
import { Package, ShoppingBag, Award } from 'lucide-react'
import ProductsList from './ProductsList'
import Categories from './Categories'
import BestSellers from './BestSellers'
import { ProductWithCategory } from '../lib/supabase'

interface ProductsProps {
  onEditProduct: (product: ProductWithCategory) => void
  initialFilter?: 'all' | 'active' | 'lowStock'
  productListRef?: React.Ref<{ refresh: () => void }>
}

const Products: React.FC<ProductsProps> = ({ onEditProduct, initialFilter = 'all', productListRef }) => {
  const [activeTab, setActiveTab] = useState<'list' | 'categories' | 'bestsellers'>('list')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Produtos</h1>
        <p className="text-gray-600">Gerencie produtos e categorias</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border">
        <div className="border-b">
          <div className="flex gap-2 p-2">
            <button
              onClick={() => setActiveTab('list')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'list'
                  ? 'bg-blue-50 text-blue-600 font-medium'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Package className="w-4 h-4" />
              Lista de Produtos
            </button>
            <button
              onClick={() => setActiveTab('categories')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'categories'
                  ? 'bg-blue-50 text-blue-600 font-medium'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              Categorias
            </button>
            <button
              onClick={() => setActiveTab('bestsellers')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'bestsellers'
                  ? 'bg-blue-50 text-blue-600 font-medium'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Award className="w-4 h-4" />
              Mais Vendidos
            </button>
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'list' && (
            <ProductsList
              ref={productListRef}
              onEditProduct={onEditProduct}
              initialFilter={initialFilter}
            />
          )}
          {activeTab === 'categories' && <Categories />}
          {activeTab === 'bestsellers' && <BestSellers />}
        </div>
      </div>
    </div>
  )
}

export default Products
