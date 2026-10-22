export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      administradores: {
        Row: {
          created_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
        }
        Relationships: []
      }
      anotacoes: {
        Row: {
          conteudo: Json
          created_at: string
          disciplina_id: string | null
          id: string
          texto: string
          titulo: string
          updated_at: string
          user_id: string
        }
        Insert: {
          conteudo?: Json
          created_at?: string
          disciplina_id?: string | null
          id?: string
          texto?: string
          titulo?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          conteudo?: Json
          created_at?: string
          disciplina_id?: string | null
          id?: string
          texto?: string
          titulo?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "anotacoes_disciplina_id_user_id_fkey"
            columns: ["disciplina_id", "user_id"]
            isOneToOne: false
            referencedRelation: "disciplinas"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      assinaturas: {
        Row: {
          created_at: string
          fim: string | null
          gateway: string | null
          gateway_assinatura_id: string | null
          id: string
          inicio: string
          plano_id: string
          status: Database["public"]["Enums"]["status_assinatura"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          fim?: string | null
          gateway?: string | null
          gateway_assinatura_id?: string | null
          id?: string
          inicio?: string
          plano_id: string
          status?: Database["public"]["Enums"]["status_assinatura"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          fim?: string | null
          gateway?: string | null
          gateway_assinatura_id?: string | null
          id?: string
          inicio?: string
          plano_id?: string
          status?: Database["public"]["Enums"]["status_assinatura"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assinaturas_plano_id_fkey"
            columns: ["plano_id"]
            isOneToOne: false
            referencedRelation: "planos"
            referencedColumns: ["id"]
          },
        ]
      }
      atividades_extracurriculares: {
        Row: {
          area_interesse: string | null
          categoria_id: string
          created_at: string
          data_fim: string | null
          data_inicio: string | null
          descricao: string | null
          detalhes: Json
          horas_aceitas: number | null
          horas_previstas: number | null
          horas_realizadas: number
          id: string
          instituicao: string | null
          link: string | null
          observacoes: string | null
          oportunidade_id: string | null
          prioridade: Database["public"]["Enums"]["prioridade_tarefa"]
          status: Database["public"]["Enums"]["status_atividade"]
          tags: string[]
          titulo: string
          updated_at: string
          user_id: string
        }
        Insert: {
          area_interesse?: string | null
          categoria_id: string
          created_at?: string
          data_fim?: string | null
          data_inicio?: string | null
          descricao?: string | null
          detalhes?: Json
          horas_aceitas?: number | null
          horas_previstas?: number | null
          horas_realizadas?: number
          id?: string
          instituicao?: string | null
          link?: string | null
          observacoes?: string | null
          oportunidade_id?: string | null
          prioridade?: Database["public"]["Enums"]["prioridade_tarefa"]
          status?: Database["public"]["Enums"]["status_atividade"]
          tags?: string[]
          titulo: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          area_interesse?: string | null
          categoria_id?: string
          created_at?: string
          data_fim?: string | null
          data_inicio?: string | null
          descricao?: string | null
          detalhes?: Json
          horas_aceitas?: number | null
          horas_previstas?: number | null
          horas_realizadas?: number
          id?: string
          instituicao?: string | null
          link?: string | null
          observacoes?: string | null
          oportunidade_id?: string | null
          prioridade?: Database["public"]["Enums"]["prioridade_tarefa"]
          status?: Database["public"]["Enums"]["status_atividade"]
          tags?: string[]
          titulo?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "atividades_extracurriculares_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias_extracurriculares"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atividades_extracurriculares_oportunidade_id_user_id_fkey"
            columns: ["oportunidade_id", "user_id"]
            isOneToOne: false
            referencedRelation: "oportunidades_extracurriculares"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      categorias_extracurriculares: {
        Row: {
          ativa: boolean
          conjunto_status: string
          cor: string
          created_at: string
          descricao: string | null
          icone: string
          id: string
          modelo_campos: string | null
          nome: string
          ordem: number
          secao_portfolio: string
          updated_at: string
        }
        Insert: {
          ativa?: boolean
          conjunto_status?: string
          cor: string
          created_at?: string
          descricao?: string | null
          icone?: string
          id: string
          modelo_campos?: string | null
          nome: string
          ordem?: number
          secao_portfolio?: string
          updated_at?: string
        }
        Update: {
          ativa?: boolean
          conjunto_status?: string
          cor?: string
          created_at?: string
          descricao?: string | null
          icone?: string
          id?: string
          modelo_campos?: string | null
          nome?: string
          ordem?: number
          secao_portfolio?: string
          updated_at?: string
        }
        Relationships: []
      }
      conteudos: {
        Row: {
          created_at: string
          data_prevista: string | null
          disciplina_id: string
          id: string
          observacoes: string | null
          ordem: number
          status: Database["public"]["Enums"]["status_conteudo"]
          titulo: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data_prevista?: string | null
          disciplina_id: string
          id?: string
          observacoes?: string | null
          ordem?: number
          status?: Database["public"]["Enums"]["status_conteudo"]
          titulo: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          data_prevista?: string | null
          disciplina_id?: string
          id?: string
          observacoes?: string | null
          ordem?: number
          status?: Database["public"]["Enums"]["status_conteudo"]
          titulo?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conteudos_disciplina_id_user_id_fkey"
            columns: ["disciplina_id", "user_id"]
            isOneToOne: false
            referencedRelation: "disciplinas"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      disciplinas: {
        Row: {
          cor: string
          created_at: string
          descricao: string | null
          emoji: string | null
          id: string
          modelo_disciplina_id: string | null
          nome: string
          ordem: number
          professor: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cor: string
          created_at?: string
          descricao?: string | null
          emoji?: string | null
          id?: string
          modelo_disciplina_id?: string | null
          nome: string
          ordem?: number
          professor?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          cor?: string
          created_at?: string
          descricao?: string | null
          emoji?: string | null
          id?: string
          modelo_disciplina_id?: string | null
          nome?: string
          ordem?: number
          professor?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "disciplinas_modelo_disciplina_id_fkey"
            columns: ["modelo_disciplina_id"]
            isOneToOne: false
            referencedRelation: "modelos_disciplinas"
            referencedColumns: ["id"]
          },
        ]
      }
      documentos_extracurriculares: {
        Row: {
          atividade_id: string
          caminho: string
          created_at: string
          id: string
          nome_arquivo: string
          tamanho: number
          tipo: Database["public"]["Enums"]["tipo_documento_extracurricular"]
          tipo_mime: string
          user_id: string
        }
        Insert: {
          atividade_id: string
          caminho: string
          created_at?: string
          id?: string
          nome_arquivo: string
          tamanho: number
          tipo?: Database["public"]["Enums"]["tipo_documento_extracurricular"]
          tipo_mime: string
          user_id?: string
        }
        Update: {
          atividade_id?: string
          caminho?: string
          created_at?: string
          id?: string
          nome_arquivo?: string
          tamanho?: number
          tipo?: Database["public"]["Enums"]["tipo_documento_extracurricular"]
          tipo_mime?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "documentos_extracurriculares_atividade_id_user_id_fkey"
            columns: ["atividade_id", "user_id"]
            isOneToOne: false
            referencedRelation: "atividades_extracurriculares"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      eventos: {
        Row: {
          cor: string | null
          created_at: string
          data: string
          descricao: string | null
          disciplina_id: string | null
          hora_fim: string | null
          hora_inicio: string | null
          id: string
          modelo_evento_id: string | null
          status: Database["public"]["Enums"]["status_evento"]
          tipo: Database["public"]["Enums"]["tipo_evento"]
          titulo: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cor?: string | null
          created_at?: string
          data: string
          descricao?: string | null
          disciplina_id?: string | null
          hora_fim?: string | null
          hora_inicio?: string | null
          id?: string
          modelo_evento_id?: string | null
          status?: Database["public"]["Enums"]["status_evento"]
          tipo?: Database["public"]["Enums"]["tipo_evento"]
          titulo: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          cor?: string | null
          created_at?: string
          data?: string
          descricao?: string | null
          disciplina_id?: string | null
          hora_fim?: string | null
          hora_inicio?: string | null
          id?: string
          modelo_evento_id?: string | null
          status?: Database["public"]["Enums"]["status_evento"]
          tipo?: Database["public"]["Enums"]["tipo_evento"]
          titulo?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "eventos_disciplina_id_user_id_fkey"
            columns: ["disciplina_id", "user_id"]
            isOneToOne: false
            referencedRelation: "disciplinas"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "eventos_modelo_evento_id_fkey"
            columns: ["modelo_evento_id"]
            isOneToOne: false
            referencedRelation: "modelos_eventos"
            referencedColumns: ["id"]
          },
        ]
      }
      metas_extracurriculares: {
        Row: {
          created_at: string
          exigencia_fonte: string | null
          exigencia_horas: number | null
          exigencia_verificada_em: string | null
          meta_horas: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          exigencia_fonte?: string | null
          exigencia_horas?: number | null
          exigencia_verificada_em?: string | null
          meta_horas?: number | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          exigencia_fonte?: string | null
          exigencia_horas?: number | null
          exigencia_verificada_em?: string | null
          meta_horas?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      modelos_disciplinas: {
        Row: {
          cor: string
          created_at: string
          id: string
          modelo_id: string
          nome: string
          ordem: number
          updated_at: string
        }
        Insert: {
          cor: string
          created_at?: string
          id?: string
          modelo_id: string
          nome: string
          ordem?: number
          updated_at?: string
        }
        Update: {
          cor?: string
          created_at?: string
          id?: string
          modelo_id?: string
          nome?: string
          ordem?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "modelos_disciplinas_modelo_id_fkey"
            columns: ["modelo_id"]
            isOneToOne: false
            referencedRelation: "modelos_periodo"
            referencedColumns: ["id"]
          },
        ]
      }
      modelos_eventos: {
        Row: {
          created_at: string
          data: string
          descricao: string | null
          hora_fim: string | null
          hora_inicio: string | null
          id: string
          modelo_disciplina_id: string
          tipo: Database["public"]["Enums"]["tipo_evento"]
          titulo: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          data: string
          descricao?: string | null
          hora_fim?: string | null
          hora_inicio?: string | null
          id?: string
          modelo_disciplina_id: string
          tipo?: Database["public"]["Enums"]["tipo_evento"]
          titulo: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          data?: string
          descricao?: string | null
          hora_fim?: string | null
          hora_inicio?: string | null
          id?: string
          modelo_disciplina_id?: string
          tipo?: Database["public"]["Enums"]["tipo_evento"]
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "modelos_eventos_modelo_disciplina_id_fkey"
            columns: ["modelo_disciplina_id"]
            isOneToOne: false
            referencedRelation: "modelos_disciplinas"
            referencedColumns: ["id"]
          },
        ]
      }
      modelos_periodo: {
        Row: {
          created_at: string
          curso: string
          descricao: string | null
          id: string
          instituicao: string
          periodo: number
          publicado: boolean
          titulo: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          curso: string
          descricao?: string | null
          id?: string
          instituicao: string
          periodo: number
          publicado?: boolean
          titulo: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          curso?: string
          descricao?: string | null
          id?: string
          instituicao?: string
          periodo?: number
          publicado?: boolean
          titulo?: string
          updated_at?: string
        }
        Relationships: []
      }
      oportunidades_extracurriculares: {
        Row: {
          categoria_id: string
          created_at: string
          data_abertura: string | null
          data_encerramento: string | null
          documentos_necessarios: string | null
          id: string
          instituicao: string | null
          link: string | null
          observacoes: string | null
          requisitos: string | null
          status_inscricao: Database["public"]["Enums"]["status_oportunidade"]
          titulo: string
          updated_at: string
          user_id: string
        }
        Insert: {
          categoria_id: string
          created_at?: string
          data_abertura?: string | null
          data_encerramento?: string | null
          documentos_necessarios?: string | null
          id?: string
          instituicao?: string | null
          link?: string | null
          observacoes?: string | null
          requisitos?: string | null
          status_inscricao?: Database["public"]["Enums"]["status_oportunidade"]
          titulo: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          categoria_id?: string
          created_at?: string
          data_abertura?: string | null
          data_encerramento?: string | null
          documentos_necessarios?: string | null
          id?: string
          instituicao?: string | null
          link?: string | null
          observacoes?: string | null
          requisitos?: string | null
          status_inscricao?: Database["public"]["Enums"]["status_oportunidade"]
          titulo?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "oportunidades_extracurriculares_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias_extracurriculares"
            referencedColumns: ["id"]
          },
        ]
      }
      perfis: {
        Row: {
          created_at: string
          curso: string
          id: string
          instituicao: string
          nome: string
          periodo: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          curso?: string
          id: string
          instituicao?: string
          nome: string
          periodo?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          curso?: string
          id?: string
          instituicao?: string
          nome?: string
          periodo?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      planos: {
        Row: {
          created_at: string
          descricao: string | null
          disponivel: boolean
          id: string
          limites: Json
          nome: string
          ordem: number
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          disponivel?: boolean
          id: string
          limites?: Json
          nome: string
          ordem?: number
        }
        Update: {
          created_at?: string
          descricao?: string | null
          disponivel?: boolean
          id?: string
          limites?: Json
          nome?: string
          ordem?: number
        }
        Relationships: []
      }
      tarefas: {
        Row: {
          concluida_em: string | null
          created_at: string
          descricao: string | null
          disciplina_id: string | null
          id: string
          prazo: string | null
          prioridade: Database["public"]["Enums"]["prioridade_tarefa"]
          status: Database["public"]["Enums"]["status_tarefa"]
          titulo: string
          updated_at: string
          user_id: string
        }
        Insert: {
          concluida_em?: string | null
          created_at?: string
          descricao?: string | null
          disciplina_id?: string | null
          id?: string
          prazo?: string | null
          prioridade?: Database["public"]["Enums"]["prioridade_tarefa"]
          status?: Database["public"]["Enums"]["status_tarefa"]
          titulo: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          concluida_em?: string | null
          created_at?: string
          descricao?: string | null
          disciplina_id?: string | null
          id?: string
          prazo?: string | null
          prioridade?: Database["public"]["Enums"]["prioridade_tarefa"]
          status?: Database["public"]["Enums"]["status_tarefa"]
          titulo?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tarefas_disciplina_id_user_id_fkey"
            columns: ["disciplina_id", "user_id"]
            isOneToOne: false
            referencedRelation: "disciplinas"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      buscar_anotacoes: {
        Args: { p_disciplina?: string; p_limite?: number; p_termo?: string }
        Returns: {
          created_at: string
          disciplina_id: string
          id: string
          titulo: string
          trecho: string
          updated_at: string
        }[]
      }
      converter_oportunidade: {
        Args: { p_oportunidade: string }
        Returns: {
          area_interesse: string | null
          categoria_id: string
          created_at: string
          data_fim: string | null
          data_inicio: string | null
          descricao: string | null
          detalhes: Json
          horas_aceitas: number | null
          horas_previstas: number | null
          horas_realizadas: number
          id: string
          instituicao: string | null
          link: string | null
          observacoes: string | null
          oportunidade_id: string | null
          prioridade: Database["public"]["Enums"]["prioridade_tarefa"]
          status: Database["public"]["Enums"]["status_atividade"]
          tags: string[]
          titulo: string
          updated_at: string
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "atividades_extracurriculares"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      eh_admin: { Args: never; Returns: boolean }
      excluir_minha_conta: { Args: never; Returns: undefined }
      importar_modelo: {
        Args: { p_importar_datas?: boolean; p_modelo_disciplinas: string[] }
        Returns: {
          cor: string
          created_at: string
          descricao: string | null
          emoji: string | null
          id: string
          modelo_disciplina_id: string | null
          nome: string
          ordem: number
          professor: string | null
          updated_at: string
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "disciplinas"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      meu_plano: {
        Args: never
        Returns: {
          created_at: string
          descricao: string | null
          disponivel: boolean
          id: string
          limites: Json
          nome: string
          ordem: number
        }[]
        SetofOptions: {
          from: "*"
          to: "planos"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      reordenar_conteudos: { Args: { p_ids: string[] }; Returns: undefined }
    }
    Enums: {
      prioridade_tarefa: "baixa" | "media" | "alta"
      status_assinatura: "ativa" | "em_atraso" | "cancelada" | "expirada"
      status_atividade:
        | "quero_participar"
        | "planejando"
        | "inscricao_aberta"
        | "inscricao_realizada"
        | "em_andamento"
        | "aguardando_resultado"
        | "concluido"
        | "ideia"
        | "em_elaboracao"
        | "submetido"
        | "em_revisao"
        | "aceito"
        | "publicado"
        | "cancelado"
      status_conteudo: "nao_iniciado" | "em_andamento" | "concluido"
      status_evento: "agendado" | "concluido" | "cancelado"
      status_oportunidade:
        | "acompanhando"
        | "preparando"
        | "inscrito"
        | "aprovado"
        | "nao_aprovado"
        | "desistiu"
      status_tarefa: "pendente" | "em_andamento" | "concluida"
      tipo_documento_extracurricular:
        | "certificado"
        | "declaracao"
        | "comprovante_inscricao"
        | "resumo"
        | "artigo"
        | "edital"
        | "outro"
      tipo_evento:
        | "prova"
        | "avaliacao_pratica"
        | "trabalho"
        | "entrega"
        | "aula"
        | "revisao"
        | "outro"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      prioridade_tarefa: ["baixa", "media", "alta"],
      status_assinatura: ["ativa", "em_atraso", "cancelada", "expirada"],
      status_atividade: [
        "quero_participar",
        "planejando",
        "inscricao_aberta",
        "inscricao_realizada",
        "em_andamento",
        "aguardando_resultado",
        "concluido",
        "ideia",
        "em_elaboracao",
        "submetido",
        "em_revisao",
        "aceito",
        "publicado",
        "cancelado",
      ],
      status_conteudo: ["nao_iniciado", "em_andamento", "concluido"],
      status_evento: ["agendado", "concluido", "cancelado"],
      status_oportunidade: [
        "acompanhando",
        "preparando",
        "inscrito",
        "aprovado",
        "nao_aprovado",
        "desistiu",
      ],
      status_tarefa: ["pendente", "em_andamento", "concluida"],
      tipo_documento_extracurricular: [
        "certificado",
        "declaracao",
        "comprovante_inscricao",
        "resumo",
        "artigo",
        "edital",
        "outro",
      ],
      tipo_evento: [
        "prova",
        "avaliacao_pratica",
        "trabalho",
        "entrega",
        "aula",
        "revisao",
        "outro",
      ],
    },
  },
} as const
