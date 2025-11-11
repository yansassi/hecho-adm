import React, { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Search, Eye, EyeOff } from 'lucide-react'
import { supabase } from '../lib/supabase'
import ClientForm from './ClientForm'

interface Client {
  id: string
  name: string
  email: string
  phone: string
  ruc: string
  address: string
  city: string
  state: string
  zip_code: string
  notes: string
  active: boolean
  created_at: string
  updated_at: string
}

const Clients: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all')
  const [showForm, setShowForm] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | undefined>()

  useEffect(() => {
    fetchClients()
  }, [])

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('name', { ascending: true })

      if (error) throw error
      setClients(data || [])
    } catch (error) {
      console.error('Erro ao buscar clientes:', error)
    } finally {
      setLoading(false)
    }
  }

  const deleteClient = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este cliente?')) return

    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', id)

      if (error) throw error
      await fetchClients()
    } catch (error) {
      console.error('Erro ao excluir cliente:', error)
    }
  }

  const toggleClientStatus = async (id: string, active: boolean) => {
    try {
      const { error } = await supabase
        .from('clients')
        .update({ active: !active, updated_at: new Date().toISOString() })
        .eq('id', id)

      if (error) throw error
      await fetchClients()
    } catch (error) {
      console.error('Erro ao atualizar status do cliente:', error)
    }
  }

  const handleEdit = (client: Client) => {
    setEditingClient(client)
    setShowForm(true)
  }

  const handleCloseForm = () => {
    setShowForm(false)
    setEditingClient(undefined)
  }

  const handleSave = () => {
    fetchClients()
    handleCloseForm()
  }

  const filteredClients = clients.filter(client => {
    const searchLower = searchTerm.toLowerCase()
    const matchesSearch = client.name.toLowerCase().includes(searchLower) ||
                         (client.email && client.email.toLowerCase().includes(searchLower)) ||
                         (client.phone && client.phone.includes(searchTerm)) ||
                         (client.ruc && client.ruc.includes(searchTerm))

    const matchesStatusFilter = filterActive === 'all' ||
                         (filterActive === 'active' && client.active) ||
                         (filterActive === 'inactive' && !client.active)

    return matchesSearch && matchesStatusFilter
  })

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
          <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
          <p className="text-gray-600">Gerencie seus clientes</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Novo Cliente
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Buscar clientes..."
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
                <th className="text-left py-3 px-6 font-medium text-gray-900">Email</th>
                <th className="text-left py-3 px-6 font-medium text-gray-900">Telefone</th>
                <th className="text-left py-3 px-6 font-medium text-gray-900">RUC</th>
                <th className="text-left py-3 px-6 font-medium text-gray-900">Cidade</th>
                <th className="text-left py-3 px-6 font-medium text-gray-900">Status</th>
                <th className="text-left py-3 px-6 font-medium text-gray-900">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredClients.map((client) => (
                <tr key={client.id} className="hover:bg-gray-50">
                  <td className="py-4 px-6">
                    <span className="font-medium text-gray-900">{client.name}</span>
                  </td>
                  <td className="py-4 px-6">
                    <span className="text-gray-600">{client.email || '-'}</span>
                  </td>
                  <td className="py-4 px-6">
                    <span className="text-gray-600">{client.phone || '-'}</span>
                  </td>
                  <td className="py-4 px-6">
                    <span className="text-gray-600">{client.ruc || '-'}</span>
                  </td>
                  <td className="py-4 px-6">
                    <span className="text-gray-600">{client.city || '-'}</span>
                  </td>
                  <td className="py-4 px-6">
                    <span className={`px-2 py-1 rounded-full text-sm ${
                      client.active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {client.active ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleClientStatus(client.id, client.active)}
                        className="p-1 text-gray-600 hover:text-blue-600 transition-colors"
                        title={client.active ? 'Desativar cliente' : 'Ativar cliente'}
                      >
                        {client.active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => handleEdit(client)}
                        className="p-1 text-gray-600 hover:text-blue-600 transition-colors"
                        title="Editar cliente"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteClient(client.id)}
                        className="p-1 text-gray-600 hover:text-red-600 transition-colors"
                        title="Excluir cliente"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredClients.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-600">Nenhum cliente encontrado.</p>
          </div>
        )}
      </div>

      {showForm && (
        <ClientForm
          client={editingClient}
          onClose={handleCloseForm}
          onSave={handleSave}
        />
      )}
    </div>
  )
}

export default Clients
