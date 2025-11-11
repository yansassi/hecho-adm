import React, { useState } from 'react'
import { X, Save, Lock, User as UserIcon, Mail, Shield, AlertCircle } from 'lucide-react'
import { getCurrentUser } from '../lib/authService'
import { supabase } from '../lib/supabase'

interface UserProfileProps {
  onClose: () => void
}

const UserProfile: React.FC<UserProfileProps> = ({ onClose }) => {
  const user = getCurrentUser()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [showPasswordForm, setShowPasswordForm] = useState(false)

  if (!user) {
    return null
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

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)

    if (newPassword !== confirmPassword) {
      setMessage({
        type: 'error',
        text: 'As senhas não coincidem'
      })
      return
    }

    const strength = validatePasswordStrength(newPassword)
    if (!strength.isStrong) {
      setMessage({
        type: 'error',
        text: 'A senha deve ter no mínimo 8 caracteres, incluindo letras e números'
      })
      return
    }

    setLoading(true)

    try {
      const { data: isValid, error: verifyError } = await supabase.rpc('verify_user_password', {
        user_id: user.id,
        password: currentPassword
      })

      if (verifyError || !isValid) {
        setMessage({
          type: 'error',
          text: 'Senha atual incorreta'
        })
        setLoading(false)
        return
      }

      const { data: hashedPassword, error: hashError } = await supabase.rpc('hash_password', {
        password: newPassword
      })

      if (hashError) throw hashError

      const { error: updateError } = await supabase
        .from('users')
        .update({
          senha_hash: hashedPassword,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

      if (updateError) throw updateError

      setMessage({
        type: 'success',
        text: 'Senha alterada com sucesso!'
      })

      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setShowPasswordForm(false)

      setTimeout(() => {
        setMessage(null)
      }, 3000)
    } catch (error: any) {
      console.error('Erro ao alterar senha:', error)
      setMessage({
        type: 'error',
        text: error.message || 'Erro ao alterar senha. Tente novamente.'
      })
    } finally {
      setLoading(false)
    }
  }

  const passwordStrength = validatePasswordStrength(newPassword)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">Meu Perfil</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <UserIcon className="w-4 h-4 text-gray-600" />
                <p className="text-sm text-gray-600 font-medium">Nome</p>
              </div>
              <p className="text-gray-900 font-semibold">{user.nome}</p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Mail className="w-4 h-4 text-gray-600" />
                <p className="text-sm text-gray-600 font-medium">Email</p>
              </div>
              <p className="text-gray-900 font-semibold">{user.email}</p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-gray-600" />
                <p className="text-sm text-gray-600 font-medium">Cargo</p>
              </div>
              {user.cargo_nome ? (
                <span className="px-3 py-1 bg-blue-600 text-white rounded-full text-sm font-medium">
                  {user.cargo_nome}
                </span>
              ) : (
                <span className="text-gray-400 text-sm">Sem cargo</span>
              )}
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-gray-600" />
                <p className="text-sm text-gray-600 font-medium">Status</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                user.status === 'ativo'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                {user.status === 'ativo' ? 'Ativo' : 'Inativo'}
              </span>
            </div>
          </div>

          {user.modulos && user.modulos.length > 0 && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 font-medium mb-3">Módulos com Acesso</p>
              <div className="flex flex-wrap gap-2">
                {user.modulos.map((modulo) => (
                  <span
                    key={modulo.id}
                    className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                  >
                    {modulo.nome}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="border-t pt-6">
            <button
              onClick={() => setShowPasswordForm(!showPasswordForm)}
              className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
            >
              <Lock className="w-5 h-5" />
              {showPasswordForm ? 'Cancelar Alteração de Senha' : 'Alterar Senha'}
            </button>

            {showPasswordForm && (
              <form onSubmit={handleChangePassword} className="mt-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Senha Atual
                  </label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Digite sua senha atual"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nova Senha
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Digite sua nova senha"
                    required
                  />
                  {newPassword && (
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
                    Confirmar Nova Senha
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Digite novamente sua nova senha"
                    required
                  />
                  {confirmPassword && newPassword !== confirmPassword && (
                    <p className="text-red-600 text-xs mt-1">As senhas não coincidem</p>
                  )}
                </div>

                {message && (
                  <div className={`p-4 rounded-lg flex items-start gap-3 ${
                    message.type === 'success'
                      ? 'bg-green-50 text-green-800 border border-green-200'
                      : 'bg-red-50 text-red-800 border border-red-200'
                  }`}>
                    <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <p className="text-sm">{message.text}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !passwordStrength.isStrong || newPassword !== confirmPassword}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {loading ? 'Alterando...' : 'Alterar Senha'}
                </button>
              </form>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}

export default UserProfile
