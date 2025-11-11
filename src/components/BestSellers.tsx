import React, { useState, useEffect } from 'react'
import { TrendingUp, Award } from 'lucide-react'
import BestSellersByData from './BestSellersByData'
import BestSellersManual from './BestSellersManual'

const BestSellers: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'data' | 'manual'>('data')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mais Vendidos</h1>
        <p className="text-gray-600">Gerencie produtos mais vendidos do site</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border">
        <div className="border-b">
          <div className="flex gap-2 p-2">
            <button
              onClick={() => setActiveTab('data')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'data'
                  ? 'bg-blue-50 text-blue-600 font-medium'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              Baseado em Vendas
            </button>
            <button
              onClick={() => setActiveTab('manual')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'manual'
                  ? 'bg-blue-50 text-blue-600 font-medium'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Award className="w-4 h-4" />
              Seleção Manual
            </button>
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'data' && <BestSellersByData />}
          {activeTab === 'manual' && <BestSellersManual />}
        </div>
      </div>
    </div>
  )
}

export default BestSellers
