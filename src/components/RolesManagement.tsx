import React, { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Users, Shield, CheckSquare, Square } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface Role {
  id: string
  nome: string
  descricao: string
  created_at: string
  updated_at: string
}

interface Module {
  id: string
  nome: string
  descricao: string
  rota: string
  icone: string
  ordem: number
}

interface RoleModule {
  cargo_id: string
  modulo_id: string
}

const RolesManagement: React.FC = () => {
  const [roles, setRoles] = useState<Role[]>([])
  const [modules, setModules] = useState<Module[]>([])
  const [roleModules, setRoleModules] = useState<RoleModule[]>([])
  const [userCounts, setUserCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingRole, setEditingRole] = useState<Role | null>(null)
  const [formData, setFormData] = useState({
    nome: '',
    descricao: ''
  })
  const [selectedModules, setSelectedModules] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      await Promise.all([
        fetchRoles(),
        fetchModules(),
        fetchRoleModules(),
        fetchUserCounts()
      ])
    } catch (error) {
      console.error('Erro ao buscar dados:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchRoles = async () => {
    const { data, error } = await supabase
      .from('cargos')
      .select('*')
      .order('nome')

    if (error) throw error
    setRoles(data || [])
  }

  const fetchModules = async () => {
    const { data, error } = await supabase
      .from('modulos')
      .select('*')
      .order('ordem')

    if (error) throw error
    setModules(data || [])
  }

  const fetchRoleModules = async () => {
    const { data, error } = await supabase
      .from('cargo_modulos')
      .select('cargo_id, modulo_id')

    if (error) throw error
    setRoleModules(data || [])
  }

  const fetchUserCounts = async () => {
    const { data, error } = await supabase
      .from('users')
      .select('cargo_id')

    if (error) throw error

    const counts: Record<string, number> = {}
    data?.forEach((user) => {
      if (user.cargo_id) {
        counts[user.cargo_id] = (counts[user.cargo_id] || 0) + 1
      }
    })

    setUserCounts(counts)
  }

  const getRoleModules = (roleId: string): string[] => {
    return roleModules
      .filter(rm => rm.cargo_id === roleId)
      .map(rm => rm.modulo_id)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.nome.trim()) {
      alert('Digite o nome do cargo')
      return
    }

    try {
      if (editingRole) {
        const { error: roleError } = await supabase
          .from('cargos')
          .update({
            nome: formData.nome,
            descricao: formData.descricao,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingRole.id)

        if (roleError) throw roleError

        const { error: deleteError } = await supabase
          .from('cargo_modulos')
          .delete()
          .eq('cargo_id', editingRole.id)

        if (deleteError) throw deleteError

        if (selectedModules.size > 0) {
          const moduleInserts = Array.from(selectedModules).map(moduleId => ({
            cargo_id: editingRole.id,
            modulo_id: moduleId
          }))

          const { error: insertError } = await supabase
            .from('cargo_modulos')
            .insert(moduleInserts)

          if (insertError) throw insertError
        }
      } else {
        const { data: newRole, error: roleError } = await supabase
          .from('cargos')
          .insert([{
            nome: formData.nome,
            descricao: formData.descricao
          }])
          .select()
          .single()

        if (roleError) throw roleError

        if (selectedModules.size > 0) {
          const moduleInserts = Array.from(selectedModules).map(moduleId => ({
            cargo_id: newRole.id,
            modulo_id: moduleId
          }))

          const { error: insertError } = await supabase
            .from('cargo_modulos')
            .insert(moduleInserts)

          if (insertError) throw insertError
        }
      }

      await fetchData()
      resetForm()
    } catch (error) {
      console.error('Erro ao salvar cargo:', error)
      alert('Erro ao salvar cargo. Tente novamente.')
    }
  }

  const deleteRole = async (id: string) => {
    const userCount = userCounts[id] || 0

    if (userCount > 0) {
      alert(`Não é possível excluir este cargo pois existem ${userCount} usuário(s) associado(s).`)
      return
    }

    if (!confirm('Tem certeza que deseja excluir este cargo?')) return

    try {
      const { error: modulesError } = await supabase
        .from('cargo_modulos')
        .delete()
        .eq('cargo_id', id)

      if (modulesError) throw modulesError

      const { error: roleError } = await supabase
        .from('cargos')
        .delete()
        .eq('id', id)

      if (roleError) throw roleError

      await fetchData()
    } catch (error) {
      console.error('Erro ao excluir cargo:', error)
      alert('Erro ao excluir cargo.')
    }
  }

  const startEdit = (role: Role) => {
    setEditingRole(role)
    setFormData({
      nome: role.nome,
      descricao: role.descricao
    })

    const roleModuleIds = getRoleModules(role.id)
    setSelectedModules(new Set(roleModuleIds))
    setShowForm(true)
  }

  const resetForm = () => {
    setEditingRole(null)
    setFormData({ nome: '', descricao: '' })
    setSelectedModules(new Set())
    setShowForm(false)
  }

  const toggleModule = (moduleId: string) => {
    const newSelected = new Set(selectedModules)
    if (newSelected.has(moduleId)) {
      newSelected.delete(moduleId)
    } else {
      newSelected.add(moduleId)
    }
    setSelectedModules(newSelected)
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestão de Cargos</h1>
          <p className="text-gray-600">Gerencie cargos e permissões de acesso aos módulos</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Novo Cargo
        </button>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-lg shadow-sm border space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">
            {editingRole ? 'Editar Cargo' : 'Novo Cargo'}
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nome do Cargo
              </label>
              <input
                type="text"
                value={formData.nome}
                onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ex: Administrador, Gerente, Vendedor"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Descrição
              </label>
              <textarea
                value={formData.descricao}
                onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Descreva as responsabilidades deste cargo"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                <Shield className="w-4 h-4 inline mr-2" />
                Permissões de Acesso aos Módulos
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-gray-50 p-4 rounded-lg border">
                {modules.length === 0 ? (
                  <div className="col-span-2 text-center py-4 text-gray-500">
                    Nenhum módulo disponível. Verifique a tabela modulos no banco de dados.
                  </div>
                ) : (
                  modules.map((module) => (
                    <button
                      key={module.id}
                      type="button"
                      onClick={() => toggleModule(module.id)}
                      className={`flex items-start gap-3 p-3 rounded-lg border-2 transition-all text-left ${
                        selectedModules.has(module.id)
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50'
                      }`}
                    >
                      <div className="flex-shrink-0 mt-0.5">
                        {selectedModules.has(module.id) ? (
                          <CheckSquare className="w-5 h-5 text-blue-600" />
                        ) : (
                          <Square className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{module.nome}</p>
                        <p className="text-xs text-gray-500">{module.descricao}</p>
                      </div>
                    </button>
                  ))
                )}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {selectedModules.size} módulo(s) selecionado(s)
              </p>
            </div>

            <div className="flex gap-3 pt-4 border-t">
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                {editingRole ? 'Atualizar' : 'Criar'} Cargo
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        {roles.length === 0 ? (
          <div className="text-center py-12">
            <Shield className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">Nenhum cargo cadastrado.</p>
            <button
              onClick={() => setShowForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Criar Primeiro Cargo
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-3 px-6 font-medium text-gray-900">Cargo</th>
                  <th className="text-left py-3 px-6 font-medium text-gray-900">Descrição</th>
                  <th className="text-left py-3 px-6 font-medium text-gray-900">Módulos com Acesso</th>
                  <th className="text-center py-3 px-6 font-medium text-gray-900">Usuários</th>
                  <th className="text-left py-3 px-6 font-medium text-gray-900">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {roles.map((role) => {
                  const roleModuleIds = getRoleModules(role.id)
                  const roleModuleNames = modules
                    .filter(m => roleModuleIds.includes(m.id))
                    .map(m => m.nome)

                  return (
                    <tr key={role.id} className="hover:bg-gray-50">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <Shield className="w-5 h-5 text-blue-600" />
                          <span className="font-medium text-gray-900">{role.nome}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-sm text-gray-600">
                          {role.descricao || 'Sem descrição'}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        {roleModuleNames.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {roleModuleNames.map((name, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded"
                              >
                                {name}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">Nenhum módulo</span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-center">
                        <div className="inline-flex items-center gap-1">
                          <Users className="w-4 h-4 text-gray-500" />
                          <span className="font-medium text-gray-900">
                            {userCounts[role.id] || 0}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => startEdit(role)}
                            className="p-1 text-gray-600 hover:text-blue-600 transition-colors"
                            title="Editar cargo"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteRole(role.id)}
                            className="p-1 text-gray-600 hover:text-red-600 transition-colors"
                            title="Excluir cargo"
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
        )}
      </div>
    </div>
  )
}

export default RolesManagement
