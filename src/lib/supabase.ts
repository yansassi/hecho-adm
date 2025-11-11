import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Product = {
  id: string
  codigo: string
  nome: string
  info: string
  quantidade: string
  codigo_barra: string
  description: string
  price: number
  price_atacado: number
  price_interior: number
  price_mayorista: number
  price_super_mayorista: number
  category_id: string | null
  image_url: string
  stock: number
  active: boolean
  created_at: string
  updated_at: string
  categories?: Category
}

export type Category = {
  id: string
  name: string
  description: string
  created_at: string
}

export type ProductWithCategory = Product & {
  categories?: Category | null
}

export type Promotion = {
  id: string
  product_id: string
  discount_type: 'fixed' | 'percentage'
  discount_value: number
  original_price: number
  promotional_price: number
  active: boolean
  created_at: string
  updated_at: string
}

export type Fornecedor = {
  id: string
  nome: string
  razao_social: string
  ruc: string
  email: string
  telefone: string
  endereco: string
  cidade: string
  estado: string
  observacoes: string
  active: boolean
  created_at: string
  updated_at: string
}

export type FornecedorProduto = {
  id: string
  fornecedor_id: string
  product_id: string
  preco_fornecedor: number
  tempo_entrega_dias: number
  quantidade_minima: number
  observacoes: string
  created_at: string
  updated_at: string
}

export type FornecedorComProdutos = Fornecedor & {
  fornecedor_produtos?: FornecedorProduto[]
}

export type PurchaseOrderStatus = 'pendente' | 'aprovado' | 'recebido' | 'cancelado'

export type PedidoCompra = {
  id: string
  fornecedor_id: string
  total_amount: number
  status: PurchaseOrderStatus
  observacoes: string
  created_at: string
  updated_at: string
}

export type PedidoCompraItem = {
  id: string
  pedido_compra_id: string
  product_id: string
  quantity: number
  unit_price: number
  subtotal: number
  created_at: string
  updated_at: string
}