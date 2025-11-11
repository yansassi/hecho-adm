# Módulo de Pedidos de Compra - Instruções de Instalação

## 📋 Visão Geral

Este módulo adiciona funcionalidade completa de **Pedidos de Compra** ao sistema de gestão de fornecedores, permitindo:

- ✅ Criar pedidos de compra para fornecedores
- ✅ Adicionar produtos com estoque baixo automaticamente
- ✅ Gerenciar status dos pedidos (Pendente, Aprovado, Recebido, Cancelado)
- ✅ Atualizar estoque automaticamente ao receber pedidos
- ✅ Visualizar histórico completo de pedidos

## 🗄️ Configuração do Banco de Dados

### Passo 1: Criar as Tabelas

Acesse o **Supabase Dashboard** do seu projeto:

1. Vá para a seção **SQL Editor**
2. Clique em **New Query**
3. Copie e cole o conteúdo do arquivo `database/pedidos_compra.sql`
4. Execute o script clicando em **Run**

### Estrutura das Tabelas Criadas

#### Tabela: `pedidos_compra`
```sql
- id (UUID, PK)
- fornecedor_id (UUID, FK → fornecedores)
- total_amount (DECIMAL)
- status (VARCHAR: 'pendente' | 'aprovado' | 'recebido' | 'cancelado')
- observacoes (TEXT)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

#### Tabela: `pedido_compra_items`
```sql
- id (UUID, PK)
- pedido_compra_id (UUID, FK → pedidos_compra)
- product_id (UUID, FK → products)
- quantity (INTEGER)
- unit_price (DECIMAL)
- subtotal (DECIMAL)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

## 🚀 Funcionalidades

### 1. Aba de Fornecedores
- Visualização de fornecedores
- Alerta de produtos com estoque ≤ 5
- Associação de produtos a fornecedores
- Visualização de produtos por fornecedor

### 2. Aba de Pedidos de Compra (NOVO!)

#### Criar Novo Pedido
1. Clique em "Novo Pedido"
2. Selecione o fornecedor
3. Adicione produtos manualmente ou use o botão "Adicionar produtos com estoque baixo"
4. Ajuste quantidades e preços
5. Adicione observações (opcional)
6. Clique em "Criar Pedido"

#### Gerenciar Pedidos
- **Pendente** → Clique em "Aprovar" para confirmar o pedido
- **Aprovado** → Clique em "Marcar Recebido" quando a mercadoria chegar
- **Recebido** → O estoque é automaticamente atualizado
- **Cancelar** → Disponível para pedidos pendentes e aprovados

#### Visualizar Detalhes
- Clique em "Detalhes" para ver todos os itens do pedido
- Visualize quantidades, preços unitários e subtotais
- Consulte observações do pedido

### 3. Atualização Automática de Estoque
Quando um pedido é marcado como **"Recebido"**:
- ✅ O estoque de cada produto é incrementado automaticamente
- ✅ A quantidade do pedido é adicionada ao estoque atual
- ✅ O registro é atualizado no banco de dados

## 📊 Estatísticas e Filtros

### Filtros por Status
- **Todos**: Visualizar todos os pedidos
- **Pendentes**: Pedidos aguardando aprovação
- **Aprovados**: Pedidos confirmados aguardando entrega
- **Recebidos**: Pedidos entregues e estoque atualizado
- **Cancelados**: Pedidos que foram cancelados

### Cards de Resumo
- Total de fornecedores
- Fornecedores ativos
- Produtos com baixo estoque
- Total de associações produto-fornecedor

## 🎨 Interface

### Componentes Adicionados
1. **PurchaseOrderForm.tsx** - Formulário de criação de pedidos
2. **PurchaseOrdersList.tsx** - Lista e gestão de pedidos
3. **Suppliers.tsx** (atualizado) - Sistema de abas

### Cores e Status
- 🟡 **Amarelo**: Pendente
- 🔵 **Azul**: Aprovado
- 🟢 **Verde**: Recebido
- 🔴 **Vermelho**: Cancelado
- 🟠 **Laranja**: Alerta de estoque baixo

## 🔐 Segurança

O sistema implementa:
- Row Level Security (RLS) nas tabelas
- Validações de dados no frontend
- Constraints no banco de dados
- Prevenção de exclusão de dados relacionados

## 📝 Observações Importantes

1. **Backup**: Sempre faça backup do banco antes de executar os scripts SQL
2. **Permissões**: Certifique-se de que as políticas RLS estão configuradas corretamente
3. **Estoque**: A atualização de estoque é irreversível - confirme antes de marcar como recebido
4. **Exclusão**: Pedidos cancelados podem ser excluídos, mas pedidos recebidos devem ser mantidos para histórico

## 🐛 Solução de Problemas

### Erro ao criar pedido
- Verifique se as tabelas foram criadas corretamente
- Confirme que o fornecedor selecionado existe e está ativo

### Estoque não atualiza
- Verifique se o status foi alterado para "recebido"
- Confirme que os produtos existem na tabela products

### Problemas de permissão
- Revise as políticas RLS no Supabase
- Verifique se o usuário tem permissões adequadas

## 🆘 Suporte

Em caso de dúvidas ou problemas:
1. Verifique os logs do console do navegador
2. Revise os erros no Supabase Dashboard
3. Confirme que todas as tabelas foram criadas corretamente

## 🎯 Próximos Passos (Sugestões)

- [ ] Adicionar relatórios de pedidos por período
- [ ] Implementar notificações por email
- [ ] Criar dashboard de análise de compras
- [ ] Adicionar histórico de preços por produto/fornecedor
- [ ] Implementar previsão de reposição baseada em vendas

---

**Versão**: 1.0.0  
**Data**: Novembro 2025  
**Compatibilidade**: React + TypeScript + Supabase
