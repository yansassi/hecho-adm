import React, { useState } from 'react'
import { Star, Settings } from 'lucide-react'
import FeaturedProducts from './FeaturedProducts'

const SiteSettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'featured' | 'general'>('featured')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configurações do Site</h1>
        <p className="text-gray-600">Gerencie as configurações e conteúdo do site</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border">
        <div className="border-b">
          <div className="flex gap-2 p-2">
            <button
              onClick={() => setActiveTab('featured')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'featured'
                  ? 'bg-blue-50 text-blue-600 font-medium'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Star className="w-4 h-4" />
              Produtos em Destaque
            </button>
            <button
              onClick={() => setActiveTab('general')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'general'
                  ? 'bg-blue-50 text-blue-600 font-medium'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Settings className="w-4 h-4" />
              Configurações Gerais
            </button>
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'featured' && <FeaturedProducts />}
          {activeTab === 'general' && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Configurações Gerais</h3>
              <p className="text-gray-600">Configurações gerais em desenvolvimento.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default SiteSettings
