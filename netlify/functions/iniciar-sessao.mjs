
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

    const { data: resultado, error: erroConsumo } = await banco.rpc(
      "consumir_sessao",
      { p_assinatura_id: assinatura.id }
    );

    if (erroConsumo) {
      console.error("Erro ao consumir sessão:", erroConsumo.message);
      return responder(500, {
        erro: "Não foi possível iniciar a sessão."
      });
    }

    if (resultado !== true) {
      return responder(403, {
        erro: "Não há sessões disponíveis para iniciar."
      });
    }

    return responder(200, {
      autorizado: true,
      duracao_minutos: 30,
      mensagem: "Sessão autorizada."
    });
  } catch (erro) {
    console.error("Falha ao iniciar sessão:", erro);
    return responder(500, {
      erro: "Erro interno ao iniciar a sessão."
    });
  }
}
