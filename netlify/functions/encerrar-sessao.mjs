
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
    return responder(401, { erro: "Faça login para encerrar." });
  }

  try {
    const auth = createClient(url, chavePublica, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const token = autorizacao.slice(7).trim();
    const { data: usuario, error: erroAuth } =
      await auth.auth.getUser(token);

    if (erroAuth || !usuario?.user?.id) {
      return responder(401, { erro: "Login inválido ou expirado." });
    }

    const corpo = await request.json().catch(() => ({}));
    const atendimentoId = corpo.atendimento_id;

    if (
      typeof atendimentoId !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(atendimentoId)
    ) {
      return responder(400, { erro: "Atendimento inválido." });
    }

    const banco = createClient(url, chaveSecreta, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const { data, error } = await banco
      .from("atendimentos")
      .update({
        status: "finalizado",
        finalizado_em: new Date().toISOString()
      })
      .eq("id", atendimentoId)
      .eq("aluno_id", usuario.user.id)
      .eq("status", "iniciado")
      .select("id, status, finalizado_em")
      .maybeSingle();

    if (error) {
      console.error("Erro ao encerrar atendimento:", error.message);
      return responder(500, { erro: "Não foi possível encerrar." });
    }

    if (!data) {
      return responder(409, {
        erro: "Atendimento não encontrado ou já encerrado."
      });
    }

    return responder(200, {
      sucesso: true,
      atendimento_id: data.id,
      status: data.status,
      finalizado_em: data.finalizado_em,
      mensagem: "Atendimento encerrado com sucesso."
    });

  } catch (erro) {
    console.error("Falha ao encerrar:", erro);
    return responder(500, { erro: "Erro interno ao encerrar." });
  }
}
