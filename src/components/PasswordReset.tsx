import React, { useState, useEffect } from 'react'
import { Mail, Lock, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react'
import { requestPasswordReset, resetPassword } from '../lib/authService'

interface PasswordResetProps {
  onBack: () => void
  token?: string
}

const PasswordReset: React.FC<PasswordResetProps> = ({ onBack, token: initialToken }) => {
  const [step, setStep] = useState<'request' | 'reset'>('request')
  const [email, setEmail] = useState('')
  const [token, setToken] = useState(initialToken || '')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    if (initialToken) {
      setStep('reset')
      setToken(initialToken)
    }
  }, [initialToken])

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    const result = await requestPasswordReset(email)
    setLoading(false)

    if (result.success) {
      setMessage({
        type: 'success',
        text: result.message
      })
      setEmail('')
    } else {
      setMessage({
        type: 'error',
        text: result.error || 'Erro ao solicitar reset de senha'
      })
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)

    if (newPassword !== confirmPassword) {
      setMessage({
        type: 'error',
        text: 'As senhas não coincidem'
      })
      return
    }

    if (newPassword.length < 8) {
      setMessage({
        type: 'error',
        text: 'A senha deve ter no mínimo 8 caracteres'
      })
      return
    }

    setLoading(true)

    const result = await resetPassword(token, newPassword)
    setLoading(false)

    if (result.success) {
      setMessage({
        type: 'success',
        text: result.message
      })
      setNewPassword('')
      setConfirmPassword('')

      setTimeout(() => {
        onBack()
      }, 3000)
    } else {
      setMessage({
        type: 'error',
        text: result.error || 'Erro ao resetar senha'
      })
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

  const passwordStrength = validatePasswordStrength(newPassword)

  return (
    <div className="fixed inset-0 bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar ao login
          </button>

          {step === 'request' ? (
            <>
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 mb-4">
                  <Mail className="w-8 h-8 text-blue-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Recuperar Senha</h2>
                <p className="text-gray-600">
                  Digite seu email para receber instruções de recuperação
                </p>
              </div>

              <form onSubmit={handleRequestReset} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    required
                    disabled={loading}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                  />
                </div>

                {message && (
                  <div className={`p-4 rounded-lg flex items-start gap-3 ${
                    message.type === 'success'
                      ? 'bg-green-50 text-green-800 border border-green-200'
                      : 'bg-red-50 text-red-800 border border-red-200'
                  }`}>
                    {message.type === 'success' ? (
                      <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    )}
                    <p className="text-sm">{message.text}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {loading ? 'Enviando...' : 'Enviar Instruções'}
                </button>
              </form>

              <div className="mt-6 text-center">
                <button
                  onClick={() => setStep('reset')}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  Já tenho um código de recuperação
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 mb-4">
                  <Lock className="w-8 h-8 text-blue-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Nova Senha</h2>
                <p className="text-gray-600">
                  Digite sua nova senha
                </p>
              </div>

              <form onSubmit={handleResetPassword} className="space-y-4">
                {!initialToken && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Código de Recuperação
                    </label>
                    <input
                      type="text"
                      value={token}
                      onChange={(e) => setToken(e.target.value)}
                      placeholder="Digite o código recebido por email"
                      required
                      disabled={loading}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 font-mono"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nova Senha
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    required
                    disabled={loading}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
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
                    Confirmar Senha
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Digite a senha novamente"
                    required
                    disabled={loading}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
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
                    {message.type === 'success' ? (
                      <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    )}
                    <p className="text-sm">{message.text}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !passwordStrength.isStrong || newPassword !== confirmPassword}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {loading ? 'Alterando...' : 'Alterar Senha'}
                </button>
              </form>

              {!initialToken && (
                <div className="mt-6 text-center">
                  <button
                    onClick={() => setStep('request')}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    Não recebi o código
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default PasswordReset
