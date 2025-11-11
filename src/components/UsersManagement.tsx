import React, { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Search, Eye, EyeOff, Key, History, UserCheck, UserX, Shield, CheckSquare, Square } from 'lucide-react'
import { supabase } from '../lib/supabase'
import UserForm from './UserForm'

interface User {
  id: string
  nome: string
  email: string
  cargo_id: string | null
  cargo_nome: string | null
  status: string
  created_at: string
  updated_at: string
}

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

const UsersManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'usuarios' | 'cargos'>('usuarios')
  const [users, setUsers] = useState<User[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [modules, setModules] = useState<Module[]>([])
  const [roleModules, setRoleModules] = useState<RoleModule[]>([])
  const [userCounts, setUserCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterRole, setFilterRole] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<'all' | 'ativo' | 'inativo'>('all')
  const [showForm, setShowForm] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [showPasswordReset, setShowPasswordReset] = useState(false)
  const [resetUserId, setResetUserId] = useState<string | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [resettingPassword, setResettingPassword] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [selectedUserHistory, setSelectedUserHistory] = useState<User | null>(null)
  const [showRoleForm, setShowRoleForm] = useState(false)
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
        fetchUsers(),
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

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select(`
          id,
          nome,
          email,
          cargo_id,
          status,
          created_at,
          updated_at
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      const usersWithRoles = await Promise.all(
        (data || []).map(async (user) => {
          if (user.cargo_id) {
            const { data: cargo } = await supabase
              .from('cargos')
              .select('nome')
              .eq('id', user.cargo_id)
              .maybeSingle()

            return {
              ...user,
              cargo_nome: cargo?.nome || null
            }
          }
          return { ...user, cargo_nome: null }
        })
      )

      setUsers(usersWithRoles)
    } catch (error) {
      console.error('Erro ao buscar usuários:', error)
    }
  }

  const fetchRoles = async () => {
    try {
      const { data, error } = await supabase
        .from('cargos')
        .select('*')
        .order('nome')

      if (error) throw error
      setRoles(data || [])
    } catch (error) {
      console.error('Erro ao buscar cargos:', error)
    }
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

  const deleteUser = async (id: string, userName: string) => {
    if (!confirm(`Tem certeza que deseja excluir o usuário "${userName}"?\n\nEsta ação não pode ser desfeita.`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', id)

      if (error) throw error
      await fetchUsers()
    } catch (error) {
      console.error('Erro ao excluir usuário:', error)
      alert('Erro ao excluir usuário. Tente novamente.')
    }
  }

  const toggleUserStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'ativo' ? 'inativo' : 'ativo'

    try {
      const { error } = await supabase
        .from('users')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)

      if (error) throw error
      await fetchUsers()
    } catch (error) {
      console.error('Erro ao atualizar status:', error)
      alert('Erro ao atualizar status do usuário.')
    }
  }

  const handlePasswordReset = async () => {
    if (!resetUserId || !newPassword.trim()) {
      alert('Digite uma nova senha')
      return
    }

    if (newPassword.length < 8) {
      alert('A senha deve ter no mínimo 8 caracteres')
      return
    }

    setResettingPassword(true)

    try {
      const { data: hashedPassword, error: hashError } = await supabase
        .rpc('hash_password', { password: newPassword })

      if (hashError) throw hashError

      const { error: updateError } = await supabase
        .from('users')
        .update({
          senha_hash: hashedPassword,
          updated_at: new Date().toISOString()
        })
        .eq('id', resetUserId)

      if (updateError) throw updateError

      alert('Senha alterada com sucesso!')
      setShowPasswordReset(false)
      setResetUserId(null)
      setNewPassword('')
    } catch (error) {
      console.error('Erro ao resetar senha:', error)
      alert('Erro ao resetar senha. Tente novamente.')
    } finally {
      setResettingPassword(false)
    }
  }

  const startEdit = (user: User) => {
    setEditingUser(user)
    setShowForm(true)
  }

  const handleCloseForm = () => {
    setShowForm(false)
    setEditingUser(null)
  }

  const handleSave = () => {
    fetchUsers()
    handleCloseForm()
  }

  const startPasswordReset = (userId: string) => {
    setResetUserId(userId)
    setNewPassword('')
    setShowPasswordReset(true)
  }

  const showUserHistory = (user: User) => {
    setSelectedUserHistory(user)
    setShowHistory(true)
  }

  const getRoleModules = (roleId: string): string[] => {
    return roleModules
      .filter(rm => rm.cargo_id === roleId)
      .map(rm => rm.modulo_id)
  }

  const handleSubmitRole = async (e: React.FormEvent) => {
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
      resetRoleForm()
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

  const startEditRole = (role: Role) => {
    setEditingRole(role)
    setFormData({
      nome: role.nome,
      descricao: role.descricao
    })

    const roleModuleIds = getRoleModules(role.id)
    setSelectedModules(new Set(roleModuleIds))
    setShowRoleForm(true)
  }

  const resetRoleForm = () => {
    setEditingRole(null)
    setFormData({ nome: '', descricao: '' })
    setSelectedModules(new Set())
    setShowRoleForm(false)
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

  const filteredUsers = users.filter(user => {
    const searchLower = searchTerm.toLowerCase()
    const matchesSearch = user.nome.toLowerCase().includes(searchLower) ||
                         user.email.toLowerCase().includes(searchLower)

    const matchesRole = filterRole === 'all' ||
                       (filterRole === 'unassigned' && !user.cargo_id) ||
                       user.cargo_id === filterRole

    const matchesStatus = filterStatus === 'all' || user.status === filterStatus

    return matchesSearch && matchesRole && matchesStatus
  })

  const getStatusColor = (status: string) => {
    return status === 'ativo'
      ? 'bg-green-100 text-green-800'
      : 'bg-red-100 text-red-800'
  }

  const getStatusLabel = (status: string) => {
    return status === 'ativo' ? 'Ativo' : 'Inativo'
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
          <h1 className="text-2xl font-bold text-gray-900">Gestão de Usuários e Cargos</h1>
          <p className="text-gray-600">Gerencie usuários do sistema e suas permissões</p>
        </div>
      </div>

      <div className="flex gap-2 border-b">
        <button
          onClick={() => setActiveTab('usuarios')}
          className={`px-4 py-3 font-medium transition-colors ${
            activeTab === 'usuarios'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Usuários
        </button>
        <button
          onClick={() => setActiveTab('cargos')}
          className={`px-4 py-3 font-medium transition-colors ${
            activeTab === 'cargos'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Cargos
        </button>
      </div>

      {activeTab === 'usuarios' && (
      <div>
        <div className="flex justify-end mb-6">
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Novo Usuário
          </button>
        </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Total de Usuários</p>
              <p className="text-2xl font-bold text-blue-600 mt-2">{users.length}</p>
            </div>
            <div className="p-3 rounded-full bg-blue-500">
              <UserCheck className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Usuários Ativos</p>
              <p className="text-2xl font-bold text-green-600 mt-2">
                {users.filter(u => u.status === 'ativo').length}
              </p>
            </div>
            <div className="p-3 rounded-full bg-green-500">
              <UserCheck className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Usuários Inativos</p>
              <p className="text-2xl font-bold text-red-600 mt-2">
                {users.filter(u => u.status === 'inativo').length}
              </p>
            </div>
            <div className="p-3 rounded-full bg-red-500">
              <UserX className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Cargos Cadastrados</p>
              <p className="text-2xl font-bold text-purple-600 mt-2">{roles.length}</p>
            </div>
            <div className="p-3 rounded-full bg-purple-500">
              <UserCheck className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Buscar usuários por nome ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Todos os Cargos</option>
              <option value="unassigned">Sem Cargo</option>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.nome}
                </option>
              ))}
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Todos os Status</option>
              <option value="ativo">Ativos</option>
              <option value="inativo">Inativos</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-3 px-6 font-medium text-gray-900">Nome</th>
                <th className="text-left py-3 px-6 font-medium text-gray-900">Email</th>
                <th className="text-left py-3 px-6 font-medium text-gray-900">Cargo</th>
                <th className="text-left py-3 px-6 font-medium text-gray-900">Status</th>
                <th className="text-left py-3 px-6 font-medium text-gray-900">Criado em</th>
                <th className="text-left py-3 px-6 font-medium text-gray-900">Atualizado em</th>
                <th className="text-left py-3 px-6 font-medium text-gray-900">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="py-4 px-6">
                    <span className="font-medium text-gray-900">{user.nome}</span>
                  </td>
                  <td className="py-4 px-6">
                    <span className="text-gray-600">{user.email}</span>
                  </td>
                  <td className="py-4 px-6">
                    {user.cargo_nome ? (
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                        {user.cargo_nome}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-sm">Sem cargo</span>
                    )}
                  </td>
                  <td className="py-4 px-6">
                    <span className={`px-2 py-1 rounded-full text-sm ${getStatusColor(user.status)}`}>
                      {getStatusLabel(user.status)}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <span className="text-sm text-gray-600">
                      {new Date(user.created_at).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <span className="text-sm text-gray-600">
                      {new Date(user.updated_at).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleUserStatus(user.id, user.status)}
                        className="p-1 text-gray-600 hover:text-blue-600 transition-colors"
                        title={user.status === 'ativo' ? 'Desativar usuário' : 'Ativar usuário'}
                      >
                        {user.status === 'ativo' ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => startEdit(user)}
                        className="p-1 text-gray-600 hover:text-blue-600 transition-colors"
                        title="Editar usuário"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => startPasswordReset(user.id)}
                        className="p-1 text-gray-600 hover:text-orange-600 transition-colors"
                        title="Resetar senha"
                      >
                        <Key className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => showUserHistory(user)}
                        className="p-1 text-gray-600 hover:text-green-600 transition-colors"
                        title="Ver histórico"
                      >
                        <History className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteUser(user.id, user.nome)}
                        className="p-1 text-gray-600 hover:text-red-600 transition-colors"
                        title="Excluir usuário"
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

        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <UserCheck className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">Nenhum usuário encontrado.</p>
            <button
              onClick={() => setShowForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Criar Primeiro Usuário
            </button>
          </div>
        )}
      </div>

      {showForm && (
        <UserForm
          user={editingUser}
          roles={roles}
          onClose={handleCloseForm}
          onSave={handleSave}
        />
      )}

      {showPasswordReset && (
        <PasswordResetModal
          userId={resetUserId}
          newPassword={newPassword}
          setNewPassword={setNewPassword}
          resetting={resettingPassword}
          onReset={handlePasswordReset}
          onClose={() => {
            setShowPasswordReset(false)
            setResetUserId(null)
            setNewPassword('')
          }}
        />
      )}

      {showHistory && selectedUserHistory && (
        <UserHistoryModal
          user={selectedUserHistory}
          onClose={() => {
            setShowHistory(false)
            setSelectedUserHistory(null)
          }}
        />
      )}
      </div>
      )}

      {activeTab === 'cargos' && (
      <div>
        <div className="flex justify-end mb-6">
          <button
            onClick={() => setShowRoleForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Novo Cargo
          </button>
        </div>

        {showRoleForm && (
        <div className="bg-white p-6 rounded-lg shadow-sm border space-y-4 mb-6">
          <h3 className="text-lg font-semibold text-gray-900">
            {editingRole ? 'Editar Cargo' : 'Novo Cargo'}
          </h3>

          <form onSubmit={handleSubmitRole} className="space-y-4">
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
                onClick={resetRoleForm}
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
                onClick={() => setShowRoleForm(true)}
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
                            <UserCheck className="w-4 h-4 text-gray-500" />
                            <span className="font-medium text-gray-900">
                              {userCounts[role.id] || 0}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => startEditRole(role)}
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
      )}
    </div>
  )
}

interface PasswordResetModalProps {
  userId: string | null
  newPassword: string
  setNewPassword: (password: string) => void
  resetting: boolean
  onReset: () => void
  onClose: () => void
}

const PasswordResetModal: React.FC<PasswordResetModalProps> = ({
  userId,
  newPassword,
  setNewPassword,
  resetting,
  onReset,
  onClose
}) => {
  const validatePasswordStrength = (password: string) => {
    const hasMinLength = password.length >= 8
    const hasLetter = /[a-zA-Z]/.test(password)
    const hasNumber = /[0-9]/.test(password)

    return {
      hasMinLength,
      hasLetter,
      hasNumber,
      isStrong: hasMinLength && hasLetter && hasNumber
    }
  }

  const passwordStrength = validatePasswordStrength(newPassword)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">Resetar Senha do Usuário</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <span className="text-2xl">&times;</span>
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nova Senha
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Digite a nova senha"
            />

            {newPassword && (
              <div className="mt-3 space-y-1">
                <div className="flex items-center gap-2 text-xs">
                  <div className={`w-2 h-2 rounded-full ${passwordStrength.hasMinLength ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <span className={passwordStrength.hasMinLength ? 'text-green-700' : 'text-gray-500'}>
                    Mínimo 8 caracteres
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <div className={`w-2 h-2 rounded-full ${passwordStrength.hasLetter ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <span className={passwordStrength.hasLetter ? 'text-green-700' : 'text-gray-500'}>
                    Contém letras
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <div className={`w-2 h-2 rounded-full ${passwordStrength.hasNumber ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <span className={passwordStrength.hasNumber ? 'text-green-700' : 'text-gray-500'}>
                    Contém números
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-sm text-yellow-800">
              O usuário deverá usar esta nova senha no próximo login.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3 p-6 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onReset}
            disabled={resetting || !passwordStrength.isStrong}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {resetting ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <Key className="w-4 h-4" />
            )}
            {resetting ? 'Alterando...' : 'Alterar Senha'}
          </button>
        </div>
      </div>
    </div>
  )
}

interface UserHistoryModalProps {
  user: User
  onClose: () => void
}

const UserHistoryModal: React.FC<UserHistoryModalProps> = ({ user, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl">
        <div className="flex justify-between items-center p-6 border-b">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Histórico do Usuário</h2>
            <p className="text-sm text-gray-600">{user.nome}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <span className="text-2xl">&times;</span>
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 font-medium mb-1">Nome</p>
              <p className="text-gray-900">{user.nome}</p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 font-medium mb-1">Email</p>
              <p className="text-gray-900">{user.email}</p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 font-medium mb-1">Cargo</p>
              <p className="text-gray-900">{user.cargo_nome || 'Sem cargo'}</p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 font-medium mb-1">Status</p>
              <span className={`px-2 py-1 rounded-full text-sm ${
                user.status === 'ativo'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                {user.status === 'ativo' ? 'Ativo' : 'Inativo'}
              </span>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-600 font-medium mb-1">Data de Criação</p>
              <p className="text-blue-900">
                {new Date(user.created_at).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>

            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-green-600 font-medium mb-1">Última Atualização</p>
              <p className="text-green-900">
                {new Date(user.updated_at).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600 font-medium mb-2">Resumo da Atividade</p>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Tempo no sistema:</span>
                <span className="font-medium text-gray-900">
                  {Math.ceil((new Date().getTime() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24))} dias
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Última modificação:</span>
                <span className="font-medium text-gray-900">
                  {Math.ceil((new Date().getTime() - new Date(user.updated_at).getTime()) / (1000 * 60 * 60 * 24))} dias atrás
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 p-6 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}

export default UsersManagement
