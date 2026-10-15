
import { createClient } from "@supabase/supabase-js";

function responder(status, dados) {
  return new Response(JSON.stringify(dados), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    }
  });
}

export default async function handler(request) {
  if (request.method !== "POST") {
    return responder(405, { erro: "Método não permitido." });
  }

  const url = process.env.VITE_SUPABASE_URL;
  const chavePublica = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const chaveSecreta = process.env.SUPABASE_SECRET_KEY;

  if (!url || !chavePublica || !chaveSecreta) {
    return responder(500, { erro: "Configuração incompleta." });
  }

  const autorizacao = request.headers.get("authorization") || "";

  if (!autorizacao.startsWith("Bearer ")) {
    return responder(401, { erro: "Faça login para iniciar." });
  }

  const token = autorizacao.slice(7).trim();

  if (!token) {
    return responder(401, { erro: "Login inválido." });
  }

  try {
    const auth = createClient(url, chavePublica, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const { data: usuario, error: erroAuth } =
      await auth.auth.getUser(token);

    if (erroAuth || !usuario?.user?.email) {
      return responder(401, {
        erro: "Sessão de login inválida ou expirada."
      });
    }

    const email = usuario.user.email.trim().toLowerCase();

    const banco = createClient(url, chaveSecreta, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Uma sessão já iniciada pertence ao aluno e pode ser retomada sem novo débito.
    // Consultar antes de exigir créditos disponíveis: o crédito da sessão já foi consumido.
    const { data: sessoesAtivas, error: erroSessaoAtiva } = await banco
      .from("atendimentos")
      .select("id, paciente_id, iniciado_em")
      .eq("aluno_id", usuario.user.id)
      .eq("status", "iniciado")
      .gt("iniciado_em", new Date(Date.now() - 30 * 60 * 1000).toISOString())
      .order("iniciado_em", { ascending: false })
      .limit(1);

    if (erroSessaoAtiva) {
      console.error("Erro ao verificar sessão existente:", erroSessaoAtiva.message);
      return responder(500, { erro: "Não foi possível verificar a sessão em andamento." });
    }

    if (sessoesAtivas?.length) {
      const existente = sessoesAtivas[0];
      return responder(200, {
        autorizado: true,
        retomada: true,
        atendimento_id: existente.id,
        paciente_id: existente.paciente_id,
        iniciado_em: existente.iniciado_em,
        termina_em: new Date(new Date(existente.iniciado_em).getTime() + 30 * 60 * 1000).toISOString(),
        duracao_minutos: 30,
        mensagem: "Sessão existente retomada sem consumir outro crédito."
      });
    }

    const { data: assinaturas, error: erroConsulta } = await banco
      .from("assinaturas")
      .select("id, status, data_vencimento, sessoes_disponiveis")
      .eq("email", email)
      .eq("status", "ativa")
      .gt("data_vencimento", new Date().toISOString())
      .gt("sessoes_disponiveis", 0)
      .order("created_at", { ascending: false })
      .limit(1);

    if (erroConsulta) {
      console.error("Erro ao consultar assinatura:", erroConsulta.message);
      return responder(500, {
        erro: "Não foi possível verificar a assinatura."
      });
    }

    const assinatura = assinaturas?.[0];

    if (!assinatura) {
      return responder(403, {
        erro: "Você precisa de uma assinatura ativa com sessões disponíveis."
      });
    }

 const corpo = await request.json().catch(() => ({}));
const pacienteId = corpo.paciente_id;

if (
  typeof pacienteId !== "string" ||
  !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(pacienteId)
) {
  return responder(400, {
    erro: "Selecione um paciente válido para iniciar."
  });
}

const { data: resultado, error: erroConsumo } = await banco.rpc(
  "iniciar_atendimento",
  {
    p_aluno_id: usuario.user.id,
    p_paciente_id: pacienteId,
    p_assinatura_id: assinatura.id
  }
);

    if (erroConsumo) {
      console.error("Erro ao consumir sessão:", erroConsumo.message);
      return responder(500, {
        erro: "Não foi possível iniciar a sessão."
      });
    }

    if (!Array.isArray(resultado) || !resultado[0]?.atendimento_id) {
      return responder(403, {
        erro: "Não há sessões disponíveis para iniciar."
      });
    }

  return responder(200, {
  autorizado: true,
  atendimento_id: resultado[0].atendimento_id,
  iniciado_em: resultado[0].iniciado_em,
  termina_em: resultado[0].termina_em,
  duracao_minutos: 30,
  mensagem: "Sessão registrada com sucesso."
});
  } catch (erro) {
    console.error("Falha ao iniciar sessão:", erro);
    return responder(500, {
      erro: "Erro interno ao iniciar a sessão."
    });
  }
}
