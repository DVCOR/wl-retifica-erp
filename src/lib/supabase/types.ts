export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      apontamentos: {
        Row: {
          created_at: string;
          empresa_id: string;
          fim: string | null;
          id: string;
          inicio: string;
          membro_id: string;
          minutos: number | null;
          observacao: string | null;
          orcamento_item_id: string | null;
          os_id: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          empresa_id: string;
          fim?: string | null;
          id?: string;
          inicio?: string;
          membro_id: string;
          minutos?: never;
          observacao?: string | null;
          orcamento_item_id?: string | null;
          os_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          empresa_id?: string;
          fim?: string | null;
          id?: string;
          inicio?: string;
          membro_id?: string;
          minutos?: never;
          observacao?: string | null;
          orcamento_item_id?: string | null;
          os_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "apontamentos_empresa_id_fkey";
            columns: ["empresa_id"];
            isOneToOne: false;
            referencedRelation: "empresas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "apontamentos_membro_id_empresa_id_fkey";
            columns: ["membro_id", "empresa_id"];
            isOneToOne: false;
            referencedRelation: "membros";
            referencedColumns: ["id", "empresa_id"];
          },
          {
            foreignKeyName: "apontamentos_orcamento_item_id_empresa_id_fkey";
            columns: ["orcamento_item_id", "empresa_id"];
            isOneToOne: false;
            referencedRelation: "orcamento_itens";
            referencedColumns: ["id", "empresa_id"];
          },
          {
            foreignKeyName: "apontamentos_orcamento_item_id_empresa_id_fkey";
            columns: ["orcamento_item_id", "empresa_id"];
            isOneToOne: false;
            referencedRelation: "v_orcamento_itens_sem_preco";
            referencedColumns: ["id", "empresa_id"];
          },
          {
            foreignKeyName: "apontamentos_os_id_empresa_id_fkey";
            columns: ["os_id", "empresa_id"];
            isOneToOne: false;
            referencedRelation: "os";
            referencedColumns: ["id", "empresa_id"];
          },
        ];
      };
      auditoria: {
        Row: {
          acao: string;
          created_at: string;
          dados_antes: Json | null;
          dados_depois: Json | null;
          empresa_id: string;
          id: number;
          membro_id: string | null;
          motivo: string | null;
          registro_id: string | null;
          tabela: string;
          user_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          acao: string;
          created_at?: string;
          dados_antes?: Json | null;
          dados_depois?: Json | null;
          empresa_id: string;
          id?: never;
          membro_id?: string | null;
          motivo?: string | null;
          registro_id?: string | null;
          tabela: string;
          user_id?: string | null;
        };
        Update: {
          acao?: string;
          created_at?: string;
          dados_antes?: Json | null;
          dados_depois?: Json | null;
          empresa_id?: string;
          id?: never;
          membro_id?: string | null;
          motivo?: string | null;
          registro_id?: string | null;
          tabela?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "auditoria_empresa_id_fkey";
            columns: ["empresa_id"];
            isOneToOne: false;
            referencedRelation: "empresas";
            referencedColumns: ["id"];
          },
        ];
      };
      checklist_template_itens: {
        Row: {
          created_at: string;
          descricao: string;
          empresa_id: string;
          exige_quantidade: boolean;
          grupo: string;
          id: string;
          ordem: number;
          quantidade_padrao: number | null;
          template_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          descricao: string;
          empresa_id: string;
          exige_quantidade?: boolean;
          grupo: string;
          id?: string;
          ordem?: number;
          quantidade_padrao?: number | null;
          template_id: string;
        };
        Update: {
          created_at?: string;
          descricao?: string;
          empresa_id?: string;
          exige_quantidade?: boolean;
          grupo?: string;
          id?: string;
          ordem?: number;
          quantidade_padrao?: number | null;
          template_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "checklist_template_itens_empresa_id_fkey";
            columns: ["empresa_id"];
            isOneToOne: false;
            referencedRelation: "empresas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "checklist_template_itens_template_id_empresa_id_fkey";
            columns: ["template_id", "empresa_id"];
            isOneToOne: false;
            referencedRelation: "checklist_templates";
            referencedColumns: ["id", "empresa_id"];
          },
        ];
      };
      checklist_templates: {
        Row: {
          ativo: boolean;
          created_at: string;
          empresa_id: string;
          id: string;
          nome: string;
          padrao: boolean;
          tipo_conjunto: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          ativo?: boolean;
          created_at?: string;
          empresa_id: string;
          id?: string;
          nome: string;
          padrao?: boolean;
          tipo_conjunto?: string;
          updated_at?: string;
        };
        Update: {
          ativo?: boolean;
          created_at?: string;
          empresa_id?: string;
          id?: string;
          nome?: string;
          padrao?: boolean;
          tipo_conjunto?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "checklist_templates_empresa_id_fkey";
            columns: ["empresa_id"];
            isOneToOne: false;
            referencedRelation: "empresas";
            referencedColumns: ["id"];
          },
        ];
      };
      clientes: {
        Row: {
          ativo: boolean;
          condicao_pagamento: string | null;
          created_at: string;
          dia_fechamento: number | null;
          documento: string | null;
          email: string | null;
          empresa_id: string;
          endereco: NonNullable<Json>;
          id: string;
          ie: string | null;
          im: string | null;
          limite_credito: number | null;
          nome: string;
          nome_fantasia: string | null;
          observacoes: string | null;
          tabela_preco_id: string | null;
          telefone_whatsapp: string | null;
          tipo: Database["public"]["Enums"]["cliente_tipo"];
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          ativo?: boolean;
          condicao_pagamento?: string | null;
          created_at?: string;
          dia_fechamento?: number | null;
          documento?: string | null;
          email?: string | null;
          empresa_id: string;
          endereco?: NonNullable<Json>;
          id?: string;
          ie?: string | null;
          im?: string | null;
          limite_credito?: number | null;
          nome: string;
          nome_fantasia?: string | null;
          observacoes?: string | null;
          tabela_preco_id?: string | null;
          telefone_whatsapp?: string | null;
          tipo: Database["public"]["Enums"]["cliente_tipo"];
          updated_at?: string;
        };
        Update: {
          ativo?: boolean;
          condicao_pagamento?: string | null;
          created_at?: string;
          dia_fechamento?: number | null;
          documento?: string | null;
          email?: string | null;
          empresa_id?: string;
          endereco?: NonNullable<Json>;
          id?: string;
          ie?: string | null;
          im?: string | null;
          limite_credito?: number | null;
          nome?: string;
          nome_fantasia?: string | null;
          observacoes?: string | null;
          tabela_preco_id?: string | null;
          telefone_whatsapp?: string | null;
          tipo?: Database["public"]["Enums"]["cliente_tipo"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "clientes_empresa_id_fkey";
            columns: ["empresa_id"];
            isOneToOne: false;
            referencedRelation: "empresas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "clientes_tabela_preco_fk";
            columns: ["tabela_preco_id", "empresa_id"];
            isOneToOne: false;
            referencedRelation: "tabelas_preco";
            referencedColumns: ["id", "empresa_id"];
          },
        ];
      };
      convites: {
        Row: {
          aceito_em: string | null;
          aceito_por: string | null;
          convidado_por: string | null;
          created_at: string;
          email: string;
          empresa_id: string;
          expira_em: string;
          id: string;
          nome: string | null;
          papel: Database["public"]["Enums"]["papel"];
          token: string;
        };
        ComputedFields: never;
        Insert: {
          aceito_em?: string | null;
          aceito_por?: string | null;
          convidado_por?: string | null;
          created_at?: string;
          email: string;
          empresa_id: string;
          expira_em?: string;
          id?: string;
          nome?: string | null;
          papel: Database["public"]["Enums"]["papel"];
          token?: string;
        };
        Update: {
          aceito_em?: string | null;
          aceito_por?: string | null;
          convidado_por?: string | null;
          created_at?: string;
          email?: string;
          empresa_id?: string;
          expira_em?: string;
          id?: string;
          nome?: string | null;
          papel?: Database["public"]["Enums"]["papel"];
          token?: string;
        };
        Relationships: [
          {
            foreignKeyName: "convites_convidado_por_empresa_id_fkey";
            columns: ["convidado_por", "empresa_id"];
            isOneToOne: false;
            referencedRelation: "membros";
            referencedColumns: ["id", "empresa_id"];
          },
          {
            foreignKeyName: "convites_empresa_id_fkey";
            columns: ["empresa_id"];
            isOneToOne: false;
            referencedRelation: "empresas";
            referencedColumns: ["id"];
          },
        ];
      };
      empresas: {
        Row: {
          ativo: boolean;
          cnpj: string | null;
          config: NonNullable<Json>;
          created_at: string;
          email: string | null;
          endereco: NonNullable<Json>;
          id: string;
          ie: string | null;
          im: string | null;
          logo_path: string | null;
          nome_fantasia: string;
          razao_social: string | null;
          regime_tributario: string | null;
          slug: string;
          telefone: string | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          ativo?: boolean;
          cnpj?: string | null;
          config?: NonNullable<Json>;
          created_at?: string;
          email?: string | null;
          endereco?: NonNullable<Json>;
          id?: string;
          ie?: string | null;
          im?: string | null;
          logo_path?: string | null;
          nome_fantasia: string;
          razao_social?: string | null;
          regime_tributario?: string | null;
          slug: string;
          telefone?: string | null;
          updated_at?: string;
        };
        Update: {
          ativo?: boolean;
          cnpj?: string | null;
          config?: NonNullable<Json>;
          created_at?: string;
          email?: string | null;
          endereco?: NonNullable<Json>;
          id?: string;
          ie?: string | null;
          im?: string | null;
          logo_path?: string | null;
          nome_fantasia?: string;
          razao_social?: string | null;
          regime_tributario?: string | null;
          slug?: string;
          telefone?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      kit_itens: {
        Row: {
          created_at: string;
          empresa_id: string;
          id: string;
          kit_id: string;
          ordem: number;
          peca_id: string | null;
          quantidade: number;
          servico_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          empresa_id: string;
          id?: string;
          kit_id: string;
          ordem?: number;
          peca_id?: string | null;
          quantidade?: number;
          servico_id?: string | null;
        };
        Update: {
          created_at?: string;
          empresa_id?: string;
          id?: string;
          kit_id?: string;
          ordem?: number;
          peca_id?: string | null;
          quantidade?: number;
          servico_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "kit_itens_empresa_id_fkey";
            columns: ["empresa_id"];
            isOneToOne: false;
            referencedRelation: "empresas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "kit_itens_kit_id_empresa_id_fkey";
            columns: ["kit_id", "empresa_id"];
            isOneToOne: false;
            referencedRelation: "kits";
            referencedColumns: ["id", "empresa_id"];
          },
          {
            foreignKeyName: "kit_itens_peca_id_empresa_id_fkey";
            columns: ["peca_id", "empresa_id"];
            isOneToOne: false;
            referencedRelation: "pecas";
            referencedColumns: ["id", "empresa_id"];
          },
          {
            foreignKeyName: "kit_itens_peca_id_empresa_id_fkey";
            columns: ["peca_id", "empresa_id"];
            isOneToOne: false;
            referencedRelation: "v_pecas_catalogo";
            referencedColumns: ["id", "empresa_id"];
          },
          {
            foreignKeyName: "kit_itens_servico_id_empresa_id_fkey";
            columns: ["servico_id", "empresa_id"];
            isOneToOne: false;
            referencedRelation: "servicos";
            referencedColumns: ["id", "empresa_id"];
          },
          {
            foreignKeyName: "kit_itens_servico_id_empresa_id_fkey";
            columns: ["servico_id", "empresa_id"];
            isOneToOne: false;
            referencedRelation: "v_servicos_catalogo";
            referencedColumns: ["id", "empresa_id"];
          },
        ];
      };
      kits: {
        Row: {
          ativo: boolean;
          created_at: string;
          descricao: string | null;
          empresa_id: string;
          id: string;
          nome: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          ativo?: boolean;
          created_at?: string;
          descricao?: string | null;
          empresa_id: string;
          id?: string;
          nome: string;
          updated_at?: string;
        };
        Update: {
          ativo?: boolean;
          created_at?: string;
          descricao?: string | null;
          empresa_id?: string;
          id?: string;
          nome?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "kits_empresa_id_fkey";
            columns: ["empresa_id"];
            isOneToOne: false;
            referencedRelation: "empresas";
            referencedColumns: ["id"];
          },
        ];
      };
      membros: {
        Row: {
          ativo: boolean;
          created_at: string;
          empresa_id: string;
          id: string;
          limite_desconto_pct: number;
          nome: string;
          papel: Database["public"]["Enums"]["papel"];
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          ativo?: boolean;
          created_at?: string;
          empresa_id: string;
          id?: string;
          limite_desconto_pct?: number;
          nome: string;
          papel: Database["public"]["Enums"]["papel"];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          ativo?: boolean;
          created_at?: string;
          empresa_id?: string;
          id?: string;
          limite_desconto_pct?: number;
          nome?: string;
          papel?: Database["public"]["Enums"]["papel"];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "membros_empresa_id_fkey";
            columns: ["empresa_id"];
            isOneToOne: false;
            referencedRelation: "empresas";
            referencedColumns: ["id"];
          },
        ];
      };
      modelo_checklist_itens: {
        Row: {
          descricao: string;
          exige_quantidade: boolean;
          grupo: string;
          id: number;
          ordem: number;
          quantidade_padrao: number | null;
        };
        ComputedFields: never;
        Insert: {
          descricao: string;
          exige_quantidade?: boolean;
          grupo: string;
          id?: number;
          ordem: number;
          quantidade_padrao?: number | null;
        };
        Update: {
          descricao?: string;
          exige_quantidade?: boolean;
          grupo?: string;
          id?: number;
          ordem?: number;
          quantidade_padrao?: number | null;
        };
        Relationships: [];
      };
      modelo_servicos: {
        Row: {
          categoria: string;
          codigo: string;
          id: number;
          nome: string;
          preco_base: number;
          tempo_padrao_min: number | null;
          unidade: Database["public"]["Enums"]["unidade_servico"];
        };
        ComputedFields: never;
        Insert: {
          categoria: string;
          codigo: string;
          id?: number;
          nome: string;
          preco_base?: number;
          tempo_padrao_min?: number | null;
          unidade?: Database["public"]["Enums"]["unidade_servico"];
        };
        Update: {
          categoria?: string;
          codigo?: string;
          id?: number;
          nome?: string;
          preco_base?: number;
          tempo_padrao_min?: number | null;
          unidade?: Database["public"]["Enums"]["unidade_servico"];
        };
        Relationships: [];
      };
      motores: {
        Row: {
          cilindrada: string | null;
          cilindros: number | null;
          cliente_id: string | null;
          codigo_motor: string | null;
          combustivel: Database["public"]["Enums"]["combustivel"] | null;
          created_at: string;
          empresa_id: string;
          id: string;
          marca: string | null;
          modelo: string | null;
          numero_serie: string | null;
          observacoes: string | null;
          updated_at: string;
          valvulas_por_cilindro: number | null;
          veiculo_ano: number | null;
          veiculo_modelo: string | null;
          veiculo_placa: string | null;
        };
        ComputedFields: never;
        Insert: {
          cilindrada?: string | null;
          cilindros?: number | null;
          cliente_id?: string | null;
          codigo_motor?: string | null;
          combustivel?: Database["public"]["Enums"]["combustivel"] | null;
          created_at?: string;
          empresa_id: string;
          id?: string;
          marca?: string | null;
          modelo?: string | null;
          numero_serie?: string | null;
          observacoes?: string | null;
          updated_at?: string;
          valvulas_por_cilindro?: number | null;
          veiculo_ano?: number | null;
          veiculo_modelo?: string | null;
          veiculo_placa?: string | null;
        };
        Update: {
          cilindrada?: string | null;
          cilindros?: number | null;
          cliente_id?: string | null;
          codigo_motor?: string | null;
          combustivel?: Database["public"]["Enums"]["combustivel"] | null;
          created_at?: string;
          empresa_id?: string;
          id?: string;
          marca?: string | null;
          modelo?: string | null;
          numero_serie?: string | null;
          observacoes?: string | null;
          updated_at?: string;
          valvulas_por_cilindro?: number | null;
          veiculo_ano?: number | null;
          veiculo_modelo?: string | null;
          veiculo_placa?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "motores_cliente_id_empresa_id_fkey";
            columns: ["cliente_id", "empresa_id"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["id", "empresa_id"];
          },
          {
            foreignKeyName: "motores_empresa_id_fkey";
            columns: ["empresa_id"];
            isOneToOne: false;
            referencedRelation: "empresas";
            referencedColumns: ["id"];
          },
        ];
      };
      orcamento_itens: {
        Row: {
          concluido_em: string | null;
          concluido_por: string | null;
          created_at: string;
          desconto: number;
          descricao: string;
          empresa_id: string;
          id: string;
          orcamento_id: string;
          ordem: number;
          peca_id: string | null;
          preco_unitario: number | null;
          quantidade: number;
          servico_id: string | null;
          sugerido_por: string | null;
          sugerido_por_medicao_id: string | null;
          tipo: Database["public"]["Enums"]["item_tipo"];
          total: number;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          concluido_em?: string | null;
          concluido_por?: string | null;
          created_at?: string;
          desconto?: number;
          descricao: string;
          empresa_id: string;
          id?: string;
          orcamento_id: string;
          ordem?: number;
          peca_id?: string | null;
          preco_unitario?: number | null;
          quantidade?: number;
          servico_id?: string | null;
          sugerido_por?: string | null;
          sugerido_por_medicao_id?: string | null;
          tipo: Database["public"]["Enums"]["item_tipo"];
          total?: number;
          updated_at?: string;
        };
        Update: {
          concluido_em?: string | null;
          concluido_por?: string | null;
          created_at?: string;
          desconto?: number;
          descricao?: string;
          empresa_id?: string;
          id?: string;
          orcamento_id?: string;
          ordem?: number;
          peca_id?: string | null;
          preco_unitario?: number | null;
          quantidade?: number;
          servico_id?: string | null;
          sugerido_por?: string | null;
          sugerido_por_medicao_id?: string | null;
          tipo?: Database["public"]["Enums"]["item_tipo"];
          total?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "orcamento_itens_concluido_por_fk";
            columns: ["concluido_por", "empresa_id"];
            isOneToOne: false;
            referencedRelation: "membros";
            referencedColumns: ["id", "empresa_id"];
          },
          {
            foreignKeyName: "orcamento_itens_empresa_id_fkey";
            columns: ["empresa_id"];
            isOneToOne: false;
            referencedRelation: "empresas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orcamento_itens_orcamento_id_empresa_id_fkey";
            columns: ["orcamento_id", "empresa_id"];
            isOneToOne: false;
            referencedRelation: "orcamentos";
            referencedColumns: ["id", "empresa_id"];
          },
          {
            foreignKeyName: "orcamento_itens_peca_id_empresa_id_fkey";
            columns: ["peca_id", "empresa_id"];
            isOneToOne: false;
            referencedRelation: "pecas";
            referencedColumns: ["id", "empresa_id"];
          },
          {
            foreignKeyName: "orcamento_itens_peca_id_empresa_id_fkey";
            columns: ["peca_id", "empresa_id"];
            isOneToOne: false;
            referencedRelation: "v_pecas_catalogo";
            referencedColumns: ["id", "empresa_id"];
          },
          {
            foreignKeyName: "orcamento_itens_servico_id_empresa_id_fkey";
            columns: ["servico_id", "empresa_id"];
            isOneToOne: false;
            referencedRelation: "servicos";
            referencedColumns: ["id", "empresa_id"];
          },
          {
            foreignKeyName: "orcamento_itens_servico_id_empresa_id_fkey";
            columns: ["servico_id", "empresa_id"];
            isOneToOne: false;
            referencedRelation: "v_servicos_catalogo";
            referencedColumns: ["id", "empresa_id"];
          },
          {
            foreignKeyName: "orcamento_itens_sugerido_por_empresa_id_fkey";
            columns: ["sugerido_por", "empresa_id"];
            isOneToOne: false;
            referencedRelation: "membros";
            referencedColumns: ["id", "empresa_id"];
          },
          {
            foreignKeyName: "orcamento_itens_sugerido_por_medicao_id_empresa_id_fkey";
            columns: ["sugerido_por_medicao_id", "empresa_id"];
            isOneToOne: false;
            referencedRelation: "os_medicoes";
            referencedColumns: ["id", "empresa_id"];
          },
        ];
      };
      orcamentos: {
        Row: {
          canal: Database["public"]["Enums"]["canal"] | null;
          created_at: string;
          criado_por: string | null;
          desconto: number;
          desconto_aprovado_por: string | null;
          empresa_id: string;
          enviado_em: string | null;
          id: string;
          observacoes: string | null;
          os_id: string;
          respondido_em: string | null;
          respondido_ip: string | null;
          respondido_por_nome: string | null;
          status: Database["public"]["Enums"]["orcamento_status"];
          subtotal: number;
          total: number;
          updated_at: string;
          validade: string | null;
          versao: number;
        };
        ComputedFields: never;
        Insert: {
          canal?: Database["public"]["Enums"]["canal"] | null;
          created_at?: string;
          criado_por?: string | null;
          desconto?: number;
          desconto_aprovado_por?: string | null;
          empresa_id: string;
          enviado_em?: string | null;
          id?: string;
          observacoes?: string | null;
          os_id: string;
          respondido_em?: string | null;
          respondido_ip?: string | null;
          respondido_por_nome?: string | null;
          status?: Database["public"]["Enums"]["orcamento_status"];
          subtotal?: number;
          total?: number;
          updated_at?: string;
          validade?: string | null;
          versao: number;
        };
        Update: {
          canal?: Database["public"]["Enums"]["canal"] | null;
          created_at?: string;
          criado_por?: string | null;
          desconto?: number;
          desconto_aprovado_por?: string | null;
          empresa_id?: string;
          enviado_em?: string | null;
          id?: string;
          observacoes?: string | null;
          os_id?: string;
          respondido_em?: string | null;
          respondido_ip?: string | null;
          respondido_por_nome?: string | null;
          status?: Database["public"]["Enums"]["orcamento_status"];
          subtotal?: number;
          total?: number;
          updated_at?: string;
          validade?: string | null;
          versao?: number;
        };
        Relationships: [
          {
            foreignKeyName: "orcamentos_criado_por_empresa_id_fkey";
            columns: ["criado_por", "empresa_id"];
            isOneToOne: false;
            referencedRelation: "membros";
            referencedColumns: ["id", "empresa_id"];
          },
          {
            foreignKeyName: "orcamentos_desconto_aprovado_por_empresa_id_fkey";
            columns: ["desconto_aprovado_por", "empresa_id"];
            isOneToOne: false;
            referencedRelation: "membros";
            referencedColumns: ["id", "empresa_id"];
          },
          {
            foreignKeyName: "orcamentos_empresa_id_fkey";
            columns: ["empresa_id"];
            isOneToOne: false;
            referencedRelation: "empresas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orcamentos_os_id_empresa_id_fkey";
            columns: ["os_id", "empresa_id"];
            isOneToOne: false;
            referencedRelation: "os";
            referencedColumns: ["id", "empresa_id"];
          },
        ];
      };
      os: {
        Row: {
          checklist_concluido_em: string | null;
          checklist_template_id: string | null;
          cliente_final_nome: string | null;
          cliente_final_placa: string | null;
          cliente_final_telefone: string | null;
          cliente_id: string;
          created_at: string;
          eh_garantia: boolean | null;
          empresa_id: string;
          entregue_em: string | null;
          garantia_ate: string | null;
          garantia_dias: number | null;
          id: string;
          motivo_cancelamento: string | null;
          motor_id: string | null;
          numero: string;
          observacoes: string | null;
          orcamento_aprovado_id: string | null;
          os_origem_id: string | null;
          prazo_prometido: string | null;
          recebido_por: string | null;
          status: Database["public"]["Enums"]["os_status"];
          tecnico_id: string | null;
          token_publico: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          checklist_concluido_em?: string | null;
          checklist_template_id?: string | null;
          cliente_final_nome?: string | null;
          cliente_final_placa?: string | null;
          cliente_final_telefone?: string | null;
          cliente_id: string;
          created_at?: string;
          eh_garantia?: never;
          empresa_id: string;
          entregue_em?: string | null;
          garantia_ate?: string | null;
          garantia_dias?: number | null;
          id?: string;
          motivo_cancelamento?: string | null;
          motor_id?: string | null;
          numero: string;
          observacoes?: string | null;
          orcamento_aprovado_id?: string | null;
          os_origem_id?: string | null;
          prazo_prometido?: string | null;
          recebido_por?: string | null;
          status?: Database["public"]["Enums"]["os_status"];
          tecnico_id?: string | null;
          token_publico?: string;
          updated_at?: string;
        };
        Update: {
          checklist_concluido_em?: string | null;
          checklist_template_id?: string | null;
          cliente_final_nome?: string | null;
          cliente_final_placa?: string | null;
          cliente_final_telefone?: string | null;
          cliente_id?: string;
          created_at?: string;
          eh_garantia?: never;
          empresa_id?: string;
          entregue_em?: string | null;
          garantia_ate?: string | null;
          garantia_dias?: number | null;
          id?: string;
          motivo_cancelamento?: string | null;
          motor_id?: string | null;
          numero?: string;
          observacoes?: string | null;
          orcamento_aprovado_id?: string | null;
          os_origem_id?: string | null;
          prazo_prometido?: string | null;
          recebido_por?: string | null;
          status?: Database["public"]["Enums"]["os_status"];
          tecnico_id?: string | null;
          token_publico?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "os_checklist_template_id_empresa_id_fkey";
            columns: ["checklist_template_id", "empresa_id"];
            isOneToOne: false;
            referencedRelation: "checklist_templates";
            referencedColumns: ["id", "empresa_id"];
          },
          {
            foreignKeyName: "os_cliente_id_empresa_id_fkey";
            columns: ["cliente_id", "empresa_id"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["id", "empresa_id"];
          },
          {
            foreignKeyName: "os_empresa_id_fkey";
            columns: ["empresa_id"];
            isOneToOne: false;
            referencedRelation: "empresas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "os_motor_id_empresa_id_fkey";
            columns: ["motor_id", "empresa_id"];
            isOneToOne: false;
            referencedRelation: "motores";
            referencedColumns: ["id", "empresa_id"];
          },
          {
            foreignKeyName: "os_orcamento_aprovado_fk";
            columns: ["orcamento_aprovado_id", "empresa_id"];
            isOneToOne: false;
            referencedRelation: "orcamentos";
            referencedColumns: ["id", "empresa_id"];
          },
          {
            foreignKeyName: "os_os_origem_id_empresa_id_fkey";
            columns: ["os_origem_id", "empresa_id"];
            isOneToOne: false;
            referencedRelation: "os";
            referencedColumns: ["id", "empresa_id"];
          },
          {
            foreignKeyName: "os_recebido_por_empresa_id_fkey";
            columns: ["recebido_por", "empresa_id"];
            isOneToOne: false;
            referencedRelation: "membros";
            referencedColumns: ["id", "empresa_id"];
          },
          {
            foreignKeyName: "os_tecnico_id_empresa_id_fkey";
            columns: ["tecnico_id", "empresa_id"];
            isOneToOne: false;
            referencedRelation: "membros";
            referencedColumns: ["id", "empresa_id"];
          },
        ];
      };
      os_anexos: {
        Row: {
          checklist_item_id: string | null;
          created_at: string;
          criado_por: string | null;
          empresa_id: string;
          etapa: Database["public"]["Enums"]["anexo_etapa"];
          id: string;
          legenda: string | null;
          medicao_id: string | null;
          os_id: string;
          storage_path: string;
        };
        ComputedFields: never;
        Insert: {
          checklist_item_id?: string | null;
          created_at?: string;
          criado_por?: string | null;
          empresa_id: string;
          etapa: Database["public"]["Enums"]["anexo_etapa"];
          id?: string;
          legenda?: string | null;
          medicao_id?: string | null;
          os_id: string;
          storage_path: string;
        };
        Update: {
          checklist_item_id?: string | null;
          created_at?: string;
          criado_por?: string | null;
          empresa_id?: string;
          etapa?: Database["public"]["Enums"]["anexo_etapa"];
          id?: string;
          legenda?: string | null;
          medicao_id?: string | null;
          os_id?: string;
          storage_path?: string;
        };
        Relationships: [
          {
            foreignKeyName: "os_anexos_checklist_item_id_empresa_id_fkey";
            columns: ["checklist_item_id", "empresa_id"];
            isOneToOne: false;
            referencedRelation: "os_checklist_itens";
            referencedColumns: ["id", "empresa_id"];
          },
          {
            foreignKeyName: "os_anexos_criado_por_empresa_id_fkey";
            columns: ["criado_por", "empresa_id"];
            isOneToOne: false;
            referencedRelation: "membros";
            referencedColumns: ["id", "empresa_id"];
          },
          {
            foreignKeyName: "os_anexos_empresa_id_fkey";
            columns: ["empresa_id"];
            isOneToOne: false;
            referencedRelation: "empresas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "os_anexos_medicao_id_empresa_id_fkey";
            columns: ["medicao_id", "empresa_id"];
            isOneToOne: false;
            referencedRelation: "os_medicoes";
            referencedColumns: ["id", "empresa_id"];
          },
          {
            foreignKeyName: "os_anexos_os_id_empresa_id_fkey";
            columns: ["os_id", "empresa_id"];
            isOneToOne: false;
            referencedRelation: "os";
            referencedColumns: ["id", "empresa_id"];
          },
        ];
      };
      os_assinaturas: {
        Row: {
          created_at: string;
          documento: string | null;
          empresa_id: string;
          id: string;
          imagem_path: string | null;
          ip: string | null;
          nome: string;
          os_id: string;
          registrado_por: string | null;
          tipo: Database["public"]["Enums"]["assinatura_tipo"];
          user_agent: string | null;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          documento?: string | null;
          empresa_id: string;
          id?: string;
          imagem_path?: string | null;
          ip?: string | null;
          nome: string;
          os_id: string;
          registrado_por?: string | null;
          tipo: Database["public"]["Enums"]["assinatura_tipo"];
          user_agent?: string | null;
        };
        Update: {
          created_at?: string;
          documento?: string | null;
          empresa_id?: string;
          id?: string;
          imagem_path?: string | null;
          ip?: string | null;
          nome?: string;
          os_id?: string;
          registrado_por?: string | null;
          tipo?: Database["public"]["Enums"]["assinatura_tipo"];
          user_agent?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "os_assinaturas_empresa_id_fkey";
            columns: ["empresa_id"];
            isOneToOne: false;
            referencedRelation: "empresas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "os_assinaturas_os_id_empresa_id_fkey";
            columns: ["os_id", "empresa_id"];
            isOneToOne: false;
            referencedRelation: "os";
            referencedColumns: ["id", "empresa_id"];
          },
          {
            foreignKeyName: "os_assinaturas_registrado_por_empresa_id_fkey";
            columns: ["registrado_por", "empresa_id"];
            isOneToOne: false;
            referencedRelation: "membros";
            referencedColumns: ["id", "empresa_id"];
          },
        ];
      };
      os_checklist_itens: {
        Row: {
          created_at: string;
          descricao: string;
          empresa_id: string;
          exige_quantidade: boolean;
          grupo: string;
          id: string;
          observacao: string | null;
          ordem: number;
          os_id: string;
          quantidade: number | null;
          status: Database["public"]["Enums"]["checklist_status"];
          template_item_id: string | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          descricao: string;
          empresa_id: string;
          exige_quantidade?: boolean;
          grupo: string;
          id?: string;
          observacao?: string | null;
          ordem?: number;
          os_id: string;
          quantidade?: number | null;
          status?: Database["public"]["Enums"]["checklist_status"];
          template_item_id?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          descricao?: string;
          empresa_id?: string;
          exige_quantidade?: boolean;
          grupo?: string;
          id?: string;
          observacao?: string | null;
          ordem?: number;
          os_id?: string;
          quantidade?: number | null;
          status?: Database["public"]["Enums"]["checklist_status"];
          template_item_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "os_checklist_itens_empresa_id_fkey";
            columns: ["empresa_id"];
            isOneToOne: false;
            referencedRelation: "empresas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "os_checklist_itens_os_id_empresa_id_fkey";
            columns: ["os_id", "empresa_id"];
            isOneToOne: false;
            referencedRelation: "os";
            referencedColumns: ["id", "empresa_id"];
          },
        ];
      };
      os_medicoes: {
        Row: {
          componente: string;
          conforme: boolean | null;
          created_at: string;
          descricao: string;
          empresa_id: string;
          id: string;
          maximo: number | null;
          membro_id: string | null;
          minimo: number | null;
          observacao: string | null;
          os_id: string;
          unidade: string | null;
          updated_at: string;
          valor: number | null;
          valor_texto: string | null;
        };
        ComputedFields: never;
        Insert: {
          componente: string;
          conforme?: boolean | null;
          created_at?: string;
          descricao: string;
          empresa_id: string;
          id?: string;
          maximo?: number | null;
          membro_id?: string | null;
          minimo?: number | null;
          observacao?: string | null;
          os_id: string;
          unidade?: string | null;
          updated_at?: string;
          valor?: number | null;
          valor_texto?: string | null;
        };
        Update: {
          componente?: string;
          conforme?: boolean | null;
          created_at?: string;
          descricao?: string;
          empresa_id?: string;
          id?: string;
          maximo?: number | null;
          membro_id?: string | null;
          minimo?: number | null;
          observacao?: string | null;
          os_id?: string;
          unidade?: string | null;
          updated_at?: string;
          valor?: number | null;
          valor_texto?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "os_medicoes_empresa_id_fkey";
            columns: ["empresa_id"];
            isOneToOne: false;
            referencedRelation: "empresas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "os_medicoes_membro_id_empresa_id_fkey";
            columns: ["membro_id", "empresa_id"];
            isOneToOne: false;
            referencedRelation: "membros";
            referencedColumns: ["id", "empresa_id"];
          },
          {
            foreignKeyName: "os_medicoes_os_id_empresa_id_fkey";
            columns: ["os_id", "empresa_id"];
            isOneToOne: false;
            referencedRelation: "os";
            referencedColumns: ["id", "empresa_id"];
          },
        ];
      };
      os_sequencias: {
        Row: {
          ano: number;
          empresa_id: string;
          ultimo_numero: number;
        };
        ComputedFields: never;
        Insert: {
          ano: number;
          empresa_id: string;
          ultimo_numero?: number;
        };
        Update: {
          ano?: number;
          empresa_id?: string;
          ultimo_numero?: number;
        };
        Relationships: [
          {
            foreignKeyName: "os_sequencias_empresa_id_fkey";
            columns: ["empresa_id"];
            isOneToOne: false;
            referencedRelation: "empresas";
            referencedColumns: ["id"];
          },
        ];
      };
      os_status_historico: {
        Row: {
          created_at: string;
          empresa_id: string;
          id: string;
          membro_id: string | null;
          motivo: string | null;
          os_id: string;
          status_de: Database["public"]["Enums"]["os_status"] | null;
          status_para: Database["public"]["Enums"]["os_status"];
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          empresa_id: string;
          id?: string;
          membro_id?: string | null;
          motivo?: string | null;
          os_id: string;
          status_de?: Database["public"]["Enums"]["os_status"] | null;
          status_para: Database["public"]["Enums"]["os_status"];
        };
        Update: {
          created_at?: string;
          empresa_id?: string;
          id?: string;
          membro_id?: string | null;
          motivo?: string | null;
          os_id?: string;
          status_de?: Database["public"]["Enums"]["os_status"] | null;
          status_para?: Database["public"]["Enums"]["os_status"];
        };
        Relationships: [
          {
            foreignKeyName: "os_status_historico_empresa_id_fkey";
            columns: ["empresa_id"];
            isOneToOne: false;
            referencedRelation: "empresas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "os_status_historico_membro_id_empresa_id_fkey";
            columns: ["membro_id", "empresa_id"];
            isOneToOne: false;
            referencedRelation: "membros";
            referencedColumns: ["id", "empresa_id"];
          },
          {
            foreignKeyName: "os_status_historico_os_id_empresa_id_fkey";
            columns: ["os_id", "empresa_id"];
            isOneToOne: false;
            referencedRelation: "os";
            referencedColumns: ["id", "empresa_id"];
          },
        ];
      };
      pecas: {
        Row: {
          ativo: boolean;
          codigo: string | null;
          created_at: string;
          custo: number | null;
          descricao: string;
          empresa_id: string;
          id: string;
          marca: string | null;
          preco_venda: number;
          unidade: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          ativo?: boolean;
          codigo?: string | null;
          created_at?: string;
          custo?: number | null;
          descricao: string;
          empresa_id: string;
          id?: string;
          marca?: string | null;
          preco_venda?: number;
          unidade?: string;
          updated_at?: string;
        };
        Update: {
          ativo?: boolean;
          codigo?: string | null;
          created_at?: string;
          custo?: number | null;
          descricao?: string;
          empresa_id?: string;
          id?: string;
          marca?: string | null;
          preco_venda?: number;
          unidade?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "pecas_empresa_id_fkey";
            columns: ["empresa_id"];
            isOneToOne: false;
            referencedRelation: "empresas";
            referencedColumns: ["id"];
          },
        ];
      };
      servicos: {
        Row: {
          ativo: boolean;
          categoria: string | null;
          codigo: string | null;
          created_at: string;
          empresa_id: string;
          id: string;
          nome: string;
          preco_base: number;
          tempo_padrao_min: number | null;
          unidade: Database["public"]["Enums"]["unidade_servico"];
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          ativo?: boolean;
          categoria?: string | null;
          codigo?: string | null;
          created_at?: string;
          empresa_id: string;
          id?: string;
          nome: string;
          preco_base?: number;
          tempo_padrao_min?: number | null;
          unidade?: Database["public"]["Enums"]["unidade_servico"];
          updated_at?: string;
        };
        Update: {
          ativo?: boolean;
          categoria?: string | null;
          codigo?: string | null;
          created_at?: string;
          empresa_id?: string;
          id?: string;
          nome?: string;
          preco_base?: number;
          tempo_padrao_min?: number | null;
          unidade?: Database["public"]["Enums"]["unidade_servico"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "servicos_empresa_id_fkey";
            columns: ["empresa_id"];
            isOneToOne: false;
            referencedRelation: "empresas";
            referencedColumns: ["id"];
          },
        ];
      };
      tabela_preco_itens: {
        Row: {
          created_at: string;
          empresa_id: string;
          id: string;
          peca_id: string | null;
          preco: number;
          servico_id: string | null;
          tabela_preco_id: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          empresa_id: string;
          id?: string;
          peca_id?: string | null;
          preco: number;
          servico_id?: string | null;
          tabela_preco_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          empresa_id?: string;
          id?: string;
          peca_id?: string | null;
          preco?: number;
          servico_id?: string | null;
          tabela_preco_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tabela_preco_itens_empresa_id_fkey";
            columns: ["empresa_id"];
            isOneToOne: false;
            referencedRelation: "empresas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tabela_preco_itens_peca_id_empresa_id_fkey";
            columns: ["peca_id", "empresa_id"];
            isOneToOne: false;
            referencedRelation: "pecas";
            referencedColumns: ["id", "empresa_id"];
          },
          {
            foreignKeyName: "tabela_preco_itens_peca_id_empresa_id_fkey";
            columns: ["peca_id", "empresa_id"];
            isOneToOne: false;
            referencedRelation: "v_pecas_catalogo";
            referencedColumns: ["id", "empresa_id"];
          },
          {
            foreignKeyName: "tabela_preco_itens_servico_id_empresa_id_fkey";
            columns: ["servico_id", "empresa_id"];
            isOneToOne: false;
            referencedRelation: "servicos";
            referencedColumns: ["id", "empresa_id"];
          },
          {
            foreignKeyName: "tabela_preco_itens_servico_id_empresa_id_fkey";
            columns: ["servico_id", "empresa_id"];
            isOneToOne: false;
            referencedRelation: "v_servicos_catalogo";
            referencedColumns: ["id", "empresa_id"];
          },
          {
            foreignKeyName: "tabela_preco_itens_tabela_preco_id_empresa_id_fkey";
            columns: ["tabela_preco_id", "empresa_id"];
            isOneToOne: false;
            referencedRelation: "tabelas_preco";
            referencedColumns: ["id", "empresa_id"];
          },
        ];
      };
      tabelas_preco: {
        Row: {
          ativo: boolean;
          created_at: string;
          desconto_padrao_pct: number;
          empresa_id: string;
          id: string;
          nome: string;
          padrao_para: Database["public"]["Enums"]["cliente_tipo"] | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          ativo?: boolean;
          created_at?: string;
          desconto_padrao_pct?: number;
          empresa_id: string;
          id?: string;
          nome: string;
          padrao_para?: Database["public"]["Enums"]["cliente_tipo"] | null;
          updated_at?: string;
        };
        Update: {
          ativo?: boolean;
          created_at?: string;
          desconto_padrao_pct?: number;
          empresa_id?: string;
          id?: string;
          nome?: string;
          padrao_para?: Database["public"]["Enums"]["cliente_tipo"] | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tabelas_preco_empresa_id_fkey";
            columns: ["empresa_id"];
            isOneToOne: false;
            referencedRelation: "empresas";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      v_orcamento_itens_sem_preco: {
        Row: {
          concluido_em: string | null;
          concluido_por: string | null;
          descricao: string;
          empresa_id: string;
          id: string;
          orcamento_id: string;
          orcamento_status: Database["public"]["Enums"]["orcamento_status"];
          ordem: number;
          os_id: string;
          peca_id: string | null;
          quantidade: number;
          servico_id: string | null;
          sugerido_por: string | null;
          sugerido_por_medicao_id: string | null;
          tipo: Database["public"]["Enums"]["item_tipo"];
          versao: number;
        };
        ComputedFields: never;
        Relationships: [
          {
            foreignKeyName: "orcamento_itens_concluido_por_fk";
            columns: ["concluido_por", "empresa_id"];
            isOneToOne: false;
            referencedRelation: "membros";
            referencedColumns: ["id", "empresa_id"];
          },
          {
            foreignKeyName: "orcamento_itens_empresa_id_fkey";
            columns: ["empresa_id"];
            isOneToOne: false;
            referencedRelation: "empresas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orcamento_itens_orcamento_id_empresa_id_fkey";
            columns: ["orcamento_id", "empresa_id"];
            isOneToOne: false;
            referencedRelation: "orcamentos";
            referencedColumns: ["id", "empresa_id"];
          },
          {
            foreignKeyName: "orcamento_itens_peca_id_empresa_id_fkey";
            columns: ["peca_id", "empresa_id"];
            isOneToOne: false;
            referencedRelation: "pecas";
            referencedColumns: ["id", "empresa_id"];
          },
          {
            foreignKeyName: "orcamento_itens_peca_id_empresa_id_fkey";
            columns: ["peca_id", "empresa_id"];
            isOneToOne: false;
            referencedRelation: "v_pecas_catalogo";
            referencedColumns: ["id", "empresa_id"];
          },
          {
            foreignKeyName: "orcamento_itens_servico_id_empresa_id_fkey";
            columns: ["servico_id", "empresa_id"];
            isOneToOne: false;
            referencedRelation: "servicos";
            referencedColumns: ["id", "empresa_id"];
          },
          {
            foreignKeyName: "orcamento_itens_servico_id_empresa_id_fkey";
            columns: ["servico_id", "empresa_id"];
            isOneToOne: false;
            referencedRelation: "v_servicos_catalogo";
            referencedColumns: ["id", "empresa_id"];
          },
          {
            foreignKeyName: "orcamento_itens_sugerido_por_empresa_id_fkey";
            columns: ["sugerido_por", "empresa_id"];
            isOneToOne: false;
            referencedRelation: "membros";
            referencedColumns: ["id", "empresa_id"];
          },
          {
            foreignKeyName: "orcamento_itens_sugerido_por_medicao_id_empresa_id_fkey";
            columns: ["sugerido_por_medicao_id", "empresa_id"];
            isOneToOne: false;
            referencedRelation: "os_medicoes";
            referencedColumns: ["id", "empresa_id"];
          },
        ];
      };
      v_pecas_catalogo: {
        Row: {
          ativo: boolean;
          codigo: string | null;
          descricao: string;
          empresa_id: string;
          id: string;
          marca: string | null;
          unidade: string;
        };
        ComputedFields: never;
        Insert: {
          ativo?: boolean | null;
          codigo?: string | null;
          descricao?: string | null;
          empresa_id?: string | null;
          id?: string | null;
          marca?: string | null;
          unidade?: string | null;
        };
        Update: {
          ativo?: boolean | null;
          codigo?: string | null;
          descricao?: string | null;
          empresa_id?: string | null;
          id?: string | null;
          marca?: string | null;
          unidade?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "pecas_empresa_id_fkey";
            columns: ["empresa_id"];
            isOneToOne: false;
            referencedRelation: "empresas";
            referencedColumns: ["id"];
          },
        ];
      };
      v_servicos_catalogo: {
        Row: {
          ativo: boolean;
          categoria: string | null;
          codigo: string | null;
          empresa_id: string;
          id: string;
          nome: string;
          tempo_padrao_min: number | null;
          unidade: Database["public"]["Enums"]["unidade_servico"];
        };
        ComputedFields: never;
        Insert: {
          ativo?: boolean | null;
          categoria?: string | null;
          codigo?: string | null;
          empresa_id?: string | null;
          id?: string | null;
          nome?: string | null;
          tempo_padrao_min?: number | null;
          unidade?: Database["public"]["Enums"]["unidade_servico"] | null;
        };
        Update: {
          ativo?: boolean | null;
          categoria?: string | null;
          codigo?: string | null;
          empresa_id?: string | null;
          id?: string | null;
          nome?: string | null;
          tempo_padrao_min?: number | null;
          unidade?: Database["public"]["Enums"]["unidade_servico"] | null;
        };
        Relationships: [
          {
            foreignKeyName: "servicos_empresa_id_fkey";
            columns: ["empresa_id"];
            isOneToOne: false;
            referencedRelation: "empresas";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Functions: {
      _aplicar_status_os: {
        Args: {
          p_motivo: string;
          p_os_id: string;
          p_status: Database["public"]["Enums"]["os_status"];
        };
        Returns: {
          checklist_concluido_em: string | null;
          checklist_template_id: string | null;
          cliente_final_nome: string | null;
          cliente_final_placa: string | null;
          cliente_final_telefone: string | null;
          cliente_id: string;
          created_at: string;
          eh_garantia: boolean | null;
          empresa_id: string;
          entregue_em: string | null;
          garantia_ate: string | null;
          garantia_dias: number | null;
          id: string;
          motivo_cancelamento: string | null;
          motor_id: string | null;
          numero: string;
          observacoes: string | null;
          orcamento_aprovado_id: string | null;
          os_origem_id: string | null;
          prazo_prometido: string | null;
          recebido_por: string | null;
          status: Database["public"]["Enums"]["os_status"];
          tecnico_id: string | null;
          token_publico: string;
          updated_at: string;
        };
        SetofOptions: {
          from: "*";
          to: "os";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      _preco_sugerido: {
        Args: {
          p_cliente_id: string;
          p_empresa_id: string;
          p_peca_id: string;
          p_servico_id: string;
        };
        Returns: number;
      };
      _responder_orcamento: {
        Args: {
          p_aprovar: boolean;
          p_canal: Database["public"]["Enums"]["canal"];
          p_ip: string;
          p_nome: string;
          p_orcamento_id: string;
          p_user_agent: string;
        };
        Returns: {
          canal: Database["public"]["Enums"]["canal"] | null;
          created_at: string;
          criado_por: string | null;
          desconto: number;
          desconto_aprovado_por: string | null;
          empresa_id: string;
          enviado_em: string | null;
          id: string;
          observacoes: string | null;
          os_id: string;
          respondido_em: string | null;
          respondido_ip: string | null;
          respondido_por_nome: string | null;
          status: Database["public"]["Enums"]["orcamento_status"];
          subtotal: number;
          total: number;
          updated_at: string;
          validade: string | null;
          versao: number;
        };
        SetofOptions: {
          from: "*";
          to: "orcamentos";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      aceitar_convite: { Args: { p_nome?: string; p_token: string }; Returns: string };
      adicionar_kit_orcamento: {
        Args: { p_kit_id: string; p_orcamento_id: string };
        Returns: number;
      };
      alterar_status_os: {
        Args: {
          p_motivo?: string;
          p_os_id: string;
          p_status: Database["public"]["Enums"]["os_status"];
        };
        Returns: {
          checklist_concluido_em: string | null;
          checklist_template_id: string | null;
          cliente_final_nome: string | null;
          cliente_final_placa: string | null;
          cliente_final_telefone: string | null;
          cliente_id: string;
          created_at: string;
          eh_garantia: boolean | null;
          empresa_id: string;
          entregue_em: string | null;
          garantia_ate: string | null;
          garantia_dias: number | null;
          id: string;
          motivo_cancelamento: string | null;
          motor_id: string | null;
          numero: string;
          observacoes: string | null;
          orcamento_aprovado_id: string | null;
          os_origem_id: string | null;
          prazo_prometido: string | null;
          recebido_por: string | null;
          status: Database["public"]["Enums"]["os_status"];
          tecnico_id: string | null;
          token_publico: string;
          updated_at: string;
        };
        SetofOptions: {
          from: "*";
          to: "os";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      buscar: {
        Args: { p_empresa_id: string; p_limite?: number; p_termo: string };
        Returns: {
          cliente_id: string;
          id: string;
          os_id: string;
          rank: number;
          subtitulo: string;
          tipo: string;
          titulo: string;
        }[];
      };
      convite_info: { Args: { p_token: string }; Returns: Json };
      corrigir_checklist_os: {
        Args: {
          p_item_id: string;
          p_motivo: string;
          p_observacao?: string;
          p_quantidade?: number;
          p_status?: Database["public"]["Enums"]["checklist_status"];
        };
        Returns: undefined;
      };
      criar_empresa: {
        Args: { p_nome_fantasia: string; p_nome_usuario: string; p_slug: string };
        Returns: {
          ativo: boolean;
          cnpj: string | null;
          config: NonNullable<Json>;
          created_at: string;
          email: string | null;
          endereco: NonNullable<Json>;
          id: string;
          ie: string | null;
          im: string | null;
          logo_path: string | null;
          nome_fantasia: string;
          razao_social: string | null;
          regime_tributario: string | null;
          slug: string;
          telefone: string | null;
          updated_at: string;
        };
        SetofOptions: {
          from: "*";
          to: "empresas";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      criar_os: {
        Args: {
          p_cliente_final_nome?: string;
          p_cliente_final_placa?: string;
          p_cliente_final_telefone?: string;
          p_cliente_id: string;
          p_empresa_id: string;
          p_motor_id?: string;
          p_observacoes?: string;
          p_os_origem_id?: string;
          p_prazo_prometido?: string;
          p_tecnico_id?: string;
          p_template_id?: string;
        };
        Returns: {
          checklist_concluido_em: string | null;
          checklist_template_id: string | null;
          cliente_final_nome: string | null;
          cliente_final_placa: string | null;
          cliente_final_telefone: string | null;
          cliente_id: string;
          created_at: string;
          eh_garantia: boolean | null;
          empresa_id: string;
          entregue_em: string | null;
          garantia_ate: string | null;
          garantia_dias: number | null;
          id: string;
          motivo_cancelamento: string | null;
          motor_id: string | null;
          numero: string;
          observacoes: string | null;
          orcamento_aprovado_id: string | null;
          os_origem_id: string | null;
          prazo_prometido: string | null;
          recebido_por: string | null;
          status: Database["public"]["Enums"]["os_status"];
          tecnico_id: string | null;
          token_publico: string;
          updated_at: string;
        };
        SetofOptions: {
          from: "*";
          to: "os";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      definir_tabela_padrao: {
        Args: { p_tabela_id: string; p_tipo: Database["public"]["Enums"]["cliente_tipo"] };
        Returns: undefined;
      };
      empresas_do_usuario: { Args: Record<PropertyKey, never>; Returns: string[] };
      enviar_orcamento: {
        Args: { p_orcamento_id: string };
        Returns: {
          canal: Database["public"]["Enums"]["canal"] | null;
          created_at: string;
          criado_por: string | null;
          desconto: number;
          desconto_aprovado_por: string | null;
          empresa_id: string;
          enviado_em: string | null;
          id: string;
          observacoes: string | null;
          os_id: string;
          respondido_em: string | null;
          respondido_ip: string | null;
          respondido_por_nome: string | null;
          status: Database["public"]["Enums"]["orcamento_status"];
          subtotal: number;
          total: number;
          updated_at: string;
          validade: string | null;
          versao: number;
        };
        SetofOptions: {
          from: "*";
          to: "orcamentos";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      f_unaccent: { Args: { texto: string }; Returns: string };
      inicializar_empresa: { Args: { p_empresa_id: string }; Returns: undefined };
      listar_clientes: {
        Args: {
          p_ativo?: boolean;
          p_empresa_id: string;
          p_limite?: number;
          p_offset?: number;
          p_termo?: string;
          p_tipo?: Database["public"]["Enums"]["cliente_tipo"];
        };
        Returns: {
          ativo: boolean;
          documento: string;
          id: string;
          nome: string;
          nome_fantasia: string;
          os_em_andamento: number;
          telefone_whatsapp: string;
          tipo: Database["public"]["Enums"]["cliente_tipo"];
          total: number;
        }[];
      };
      listar_motores: {
        Args: {
          p_cliente_id?: string;
          p_empresa_id: string;
          p_limite?: number;
          p_offset?: number;
          p_termo?: string;
        };
        Returns: {
          cilindrada: string;
          cilindros: number;
          cliente_id: string;
          cliente_nome: string;
          codigo_motor: string;
          combustivel: Database["public"]["Enums"]["combustivel"];
          created_at: string;
          empresa_id: string;
          id: string;
          marca: string;
          modelo: string;
          numero_serie: string;
          observacoes: string;
          total: number;
          updated_at: string;
          valvulas_por_cilindro: number;
          veiculo_ano: number;
          veiculo_modelo: string;
          veiculo_placa: string;
        }[];
      };
      marcar_item_concluido: {
        Args: { p_concluido: boolean; p_item_id: string };
        Returns: undefined;
      };
      membro_atual: { Args: { p_empresa_id: string }; Returns: string };
      normalizar_busca: { Args: { texto: string }; Returns: string };
      orcamento_rascunho_para_sugestao: { Args: { p_os_id: string }; Returns: string };
      os_papeis_para_status: {
        Args: { p_para: Database["public"]["Enums"]["os_status"] };
        Returns: Database["public"]["Enums"]["papel"][];
      };
      os_pendencias_para_status: {
        Args: { p_os_id: string; p_para: Database["public"]["Enums"]["os_status"] };
        Returns: string;
      };
      os_publica: { Args: { p_token: string }; Returns: Json };
      os_publica_fotos: {
        Args: { p_token: string };
        Returns: {
          etapa: Database["public"]["Enums"]["anexo_etapa"];
          legenda: string;
          medicao_id: string;
          storage_path: string;
        }[];
      };
      os_transicao_permitida: {
        Args: {
          p_de: Database["public"]["Enums"]["os_status"];
          p_para: Database["public"]["Enums"]["os_status"];
        };
        Returns: boolean;
      };
      papel_na_empresa: {
        Args: { p_empresa_id: string };
        Returns: Database["public"]["Enums"]["papel"];
      };
      pode_ver_precos: { Args: { p_empresa_id: string }; Returns: boolean };
      preco_sugerido: {
        Args: {
          p_cliente_id: string;
          p_empresa_id: string;
          p_peca_id?: string;
          p_servico_id: string;
        };
        Returns: number;
      };
      proximo_numero_os: { Args: { p_empresa_id: string }; Returns: string };
      quantidade_sugerida: { Args: { p_motor_id: string; p_servico_id: string }; Returns: number };
      recalcular_orcamento: { Args: { p_orcamento_id: string }; Returns: undefined };
      regenerar_token_publico: { Args: { p_os_id: string }; Returns: string };
      responder_orcamento: {
        Args: {
          p_aprovar: boolean;
          p_canal?: Database["public"]["Enums"]["canal"];
          p_nome: string;
          p_orcamento_id: string;
        };
        Returns: {
          canal: Database["public"]["Enums"]["canal"] | null;
          created_at: string;
          criado_por: string | null;
          desconto: number;
          desconto_aprovado_por: string | null;
          empresa_id: string;
          enviado_em: string | null;
          id: string;
          observacoes: string | null;
          os_id: string;
          respondido_em: string | null;
          respondido_ip: string | null;
          respondido_por_nome: string | null;
          status: Database["public"]["Enums"]["orcamento_status"];
          subtotal: number;
          total: number;
          updated_at: string;
          validade: string | null;
          versao: number;
        };
        SetofOptions: {
          from: "*";
          to: "orcamentos";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      responder_orcamento_publico: {
        Args: {
          p_aprovar: boolean;
          p_ip?: string;
          p_nome: string;
          p_token: string;
          p_user_agent?: string;
        };
        Returns: Json;
      };
      resumo_cliente: {
        Args: { p_cliente_id: string };
        Returns: {
          em_aberto: number;
          motores_em_garantia: number;
          os_12_meses: number;
          os_em_andamento: number;
        }[];
      };
      salvar_kit: { Args: { p_dados: Json; p_itens: Json; p_kit_id: string }; Returns: string };
      salvar_precos_tabela: { Args: { p_precos: Json; p_tabela_id: string }; Returns: number };
      so_alfanumerico: { Args: { texto: string }; Returns: string };
      tem_papel: {
        Args: { p_empresa_id: string; p_papeis: Database["public"]["Enums"]["papel"][] };
        Returns: boolean;
      };
    };
    Enums: {
      anexo_etapa: "recebimento" | "analise" | "execucao" | "entrega";
      assinatura_tipo: "recebimento" | "aprovacao" | "entrega";
      canal: "link" | "whatsapp" | "presencial" | "telefone";
      checklist_status: "ok" | "danificado" | "ausente" | "na";
      cliente_tipo: "lojista" | "final";
      combustivel: "gasolina" | "etanol" | "flex" | "diesel" | "gnv";
      item_tipo: "servico" | "peca";
      orcamento_status: "rascunho" | "enviado" | "aprovado" | "reprovado" | "substituido";
      os_status:
        | "em_recebimento"
        | "recebido"
        | "em_analise"
        | "orcamento_enviado"
        | "aprovado"
        | "reprovado"
        | "em_execucao"
        | "aguardando_peca"
        | "pronto"
        | "entregue"
        | "cancelado";
      papel: "dono" | "balcao" | "tecnico" | "financeiro";
      unidade_servico: "un" | "cilindro" | "valvula" | "hora";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      anexo_etapa: ["recebimento", "analise", "execucao", "entrega"],
      assinatura_tipo: ["recebimento", "aprovacao", "entrega"],
      canal: ["link", "whatsapp", "presencial", "telefone"],
      checklist_status: ["ok", "danificado", "ausente", "na"],
      cliente_tipo: ["lojista", "final"],
      combustivel: ["gasolina", "etanol", "flex", "diesel", "gnv"],
      item_tipo: ["servico", "peca"],
      orcamento_status: ["rascunho", "enviado", "aprovado", "reprovado", "substituido"],
      os_status: [
        "em_recebimento",
        "recebido",
        "em_analise",
        "orcamento_enviado",
        "aprovado",
        "reprovado",
        "em_execucao",
        "aguardando_peca",
        "pronto",
        "entregue",
        "cancelado",
      ],
      papel: ["dono", "balcao", "tecnico", "financeiro"],
      unidade_servico: ["un", "cilindro", "valvula", "hora"],
    },
  },
} as const;
