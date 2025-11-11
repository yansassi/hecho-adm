import React, { useState, useEffect } from 'react'
import { X, Save, Mail, User, Lock, Shield } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface Role {
  id: string
  nome: string
  descricao: string
}

interface UserData {
  id?: string
  nome: string
  email: string
  cargo_id: string | null
  status: string
}

interface UserFormProps {
  user?: UserData | null
  roles: Role[]
  onClose: () => void
  onSave: () => void
}

const UserForm: React.FC<UserFormProps> = ({ user, roles, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    senha: '',
    confirmarSenha: '',
    cargo_id: '',
    status: 'ativo'
  })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<{[key: string]: string}>({})

  const isEditing = user && user.id

  useEffect(() => {
    if (user && user.id) {
      setFormData({
        nome: user.nome || '',
        email: user.email || '',
        senha: '',
        confirmarSenha: '',
        cargo_id: user.cargo_id || '',
        status: user.status || 'ativo'
      })
    }
  }, [user])

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {}

    if (!formData.nome.trim()) {
      newErrors.nome = 'Nome é obrigatório'
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email é obrigatório'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email inválido'
    }

    if (!isEditing) {
      if (!formData.senha) {
        newErrors.senha = 'Senha é obrigatória'
      } else if (formData.senha.length < 8) {
        newErrors.senha = 'A senha deve ter no mínimo 8 caracteres'
      }

      if (formData.senha !== formData.confirmarSenha) {
        newErrors.confirmarSenha = 'As senhas não coincidem'
      }
    } else {
      if (formData.senha && formData.senha.length < 8) {
        newErrors.senha = 'A senha deve ter no mínimo 8 caracteres'
      }

      if (formData.senha && formData.senha !== formData.confirmarSenha) {
        newErrors.confirmarSenha = 'As senhas não coincidem'
      }
    }

    if (!formData.cargo_id) {
      newErrors.cargo_id = 'Selecione um cargo'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setLoading(true)

    try {
      if (isEditing) {
        const updateData: any = {
          nome: formData.nome,
          email: formData.email,
          cargo_id: formData.cargo_id || null,
          status: formData.status,
          updated_at: new Date().toISOString()
        }

        if (formData.senha) {
          const { data: hashedPassword, error: hashError } = await supabase
            .rpc('hash_password', { password: formData.senha })

          if (hashError) throw hashError
          updateData.senha_hash = hashedPassword
        }

        const { error } = await supabase
          .from('users')
          .update(updateData)
          .eq('id', user.id)

        if (error) throw error
      } else {
        const { data: hashedPassword, error: hashError } = await supabase
          .rpc('hash_password', { password: formData.senha })

        if (hashError) throw hashError

        const { error: insertError } = await supabase
          .from('users')
          .insert([{
            nome: formData.nome,
            email: formData.email,
            senha_hash: hashedPassword,
            cargo_id: formData.cargo_id || null,
            status: formData.status
          }])

        if (insertError) {
          if (insertError.code === '23505') {
            throw new Error('Este email já está cadastrado no sistema')
          }
          throw insertError
        }
      }

      onSave()
      onClose()
    } catch (error: any) {
      console.error('Erro ao salvar usuário:', error)
      alert(error.message || 'Erro ao salvar usuário. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))

    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

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

  const passwordStrength = validatePasswordStrength(formData.senha)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">
            {isEditing ? 'Editar Usuário' : 'Novo Usuário'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <User className="w-4 h-4 inline mr-2" />
                Nome Completo *
              </label>
              <input
                type="text"
                value={formData.nome}
                onChange={(e) => handleInputChange('nome', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.nome ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Digite o nome completo"
              />
              {errors.nome && <p className="text-red-600 text-sm mt-1">{errors.nome}</p>}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Mail className="w-4 h-4 inline mr-2" />
                Email *
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.email ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="email@exemplo.com"
              />
              {errors.email && <p className="text-red-600 text-sm mt-1">{errors.email}</p>}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Shield className="w-4 h-4 inline mr-2" />
                Cargo *
              </label>
              <select
                value={formData.cargo_id}
                onChange={(e) => handleInputChange('cargo_id', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.cargo_id ? 'border-red-300' : 'border-gray-300'
                }`}
              >
                <option value="">Selecione um cargo</option>
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.nome}
                  </option>
                ))}
              </select>
              {errors.cargo_id && <p className="text-red-600 text-sm mt-1">{errors.cargo_id}</p>}
              {formData.cargo_id && (
                <p className="text-xs text-gray-500 mt-1">
                  {roles.find(r => r.id === formData.cargo_id)?.descricao}
                </p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => handleInputChange('status', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="ativo">Ativo</option>
                <option value="inativo">Inativo</option>
              </select>
            </div>

            <div className="md:col-span-2 border-t pt-4">
              <h3 className="text-md font-semibold text-gray-900 mb-4">
                <Lock className="w-4 h-4 inline mr-2" />
                {isEditing ? 'Alterar Senha (opcional)' : 'Senha *'}
              </h3>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {isEditing ? 'Nova Senha' : 'Senha'}
              </label>
              <input
                type="password"
                value={formData.senha}
                onChange={(e) => handleInputChange('senha', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.senha ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder={isEditing ? 'Deixe em branco para não alterar' : 'Mínimo 8 caracteres'}
              />
              {errors.senha && <p className="text-red-600 text-sm mt-1">{errors.senha}</p>}

              {formData.senha && (
                <div className="mt-2 space-y-1">
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirmar Senha
              </label>
              <input
                type="password"
                value={formData.confirmarSenha}
                onChange={(e) => handleInputChange('confirmarSenha', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.confirmarSenha ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Digite a senha novamente"
              />
              {errors.confirmarSenha && <p className="text-red-600 text-sm mt-1">{errors.confirmarSenha}</p>}
              {formData.confirmarSenha && formData.senha !== formData.confirmarSenha && (
                <p className="text-red-600 text-xs mt-1">As senhas não coincidem</p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <Save className="w-4 h-4" />
              )}
              {isEditing ? 'Atualizar' : 'Criar'} Usuário
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default UserForm
