import { supabase } from './supabase'

export interface User {
  id: string
  email: string
  nome: string
  cargo_id: string | null
  cargo_nome: string | null
  status: string
  modulos: Array<{
    id: string
    nome: string
    descricao: string
    rota: string
    icone: string
    ordem: number
  }>
}

export interface LoginResponse {
  success: boolean
  user?: User
  error?: string
}

export interface PasswordResetResponse {
  success: boolean
  message: string
  error?: string
}

const AUTH_USER_KEY = 'auth_user'
const AUTH_TOKEN_KEY = 'auth_token'

export async function loginWithEmail(email: string, password: string): Promise<LoginResponse> {
  try {
    const { data, error } = await supabase.rpc('login_user', {
      user_email: email,
      user_password: password
    })

    if (error) {
      return {
        success: false,
        error: error.message
      }
    }

    if (!data || data.length === 0) {
      return {
        success: false,
        error: 'Email ou senha inválidos'
      }
    }

    const userData = data[0]
    const user: User = {
      id: userData.user_id,
      email: userData.email,
      nome: userData.nome,
      cargo_id: userData.cargo_id,
      cargo_nome: userData.cargo_nome,
      status: userData.status,
      modulos: userData.modulos || []
    }

    const token = btoa(JSON.stringify({ userId: user.id, timestamp: Date.now() }))

    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user))
    localStorage.setItem(AUTH_TOKEN_KEY, token)

    return {
      success: true,
      user
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Erro ao fazer login'
    }
  }
}

export async function registerUser(userData: {
  nome: string
  email: string
  senha: string
  cargo_id: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: hashedPassword, error: hashError } = await supabase.rpc('hash_password', {
      password: userData.senha
    })

    if (hashError) throw hashError

    const { error: insertError } = await supabase
      .from('users')
      .insert([{
        nome: userData.nome,
        email: userData.email,
        senha_hash: hashedPassword,
        cargo_id: userData.cargo_id,
        status: 'ativo'
      }])

    if (insertError) throw insertError

    return { success: true }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Erro ao registrar usuário'
    }
  }
}

export function getCurrentUser(): User | null {
  try {
    const userStr = localStorage.getItem(AUTH_USER_KEY)
    if (!userStr) return null

    return JSON.parse(userStr)
  } catch (error) {
    return null
  }
}

export function logout(): void {
  localStorage.removeItem(AUTH_USER_KEY)
  localStorage.removeItem(AUTH_TOKEN_KEY)
}

export function isAuthenticated(): boolean {
  const user = getCurrentUser()
  const token = localStorage.getItem(AUTH_TOKEN_KEY)
  return !!(user && token)
}

export async function requestPasswordReset(email: string): Promise<PasswordResetResponse> {
  try {
    const { data, error } = await supabase.rpc('create_password_reset_token', {
      user_email: email
    })

    if (error) {
      return {
        success: false,
        message: '',
        error: error.message
      }
    }

    return {
      success: true,
      message: 'Se o email estiver cadastrado, você receberá instruções para resetar sua senha.'
    }
  } catch (error: any) {
    return {
      success: false,
      message: '',
      error: error.message || 'Erro ao solicitar reset de senha'
    }
  }
}

export async function resetPassword(token: string, newPassword: string): Promise<PasswordResetResponse> {
  try {
    if (newPassword.length < 8) {
      return {
        success: false,
        message: '',
        error: 'A senha deve ter no mínimo 8 caracteres'
      }
    }

    const { data, error } = await supabase.rpc('reset_password_with_token', {
      reset_token: token,
      new_password: newPassword
    })

    if (error) {
      return {
        success: false,
        message: '',
        error: error.message
      }
    }

    return {
      success: true,
      message: 'Senha alterada com sucesso! Você já pode fazer login.'
    }
  } catch (error: any) {
    return {
      success: false,
      message: '',
      error: error.message || 'Erro ao resetar senha'
    }
  }
}

export function hasPermission(moduloRota: string): boolean {
  const user = getCurrentUser()
  if (!user) return false

  return user.modulos.some(modulo => modulo.rota === moduloRota)
}

export function getUserModules(): Array<{
  id: string
  nome: string
  rota: string
  icone: string
  ordem: number
}> {
  const user = getCurrentUser()
  if (!user) return []

  return user.modulos
}
