import { createClient } from "@supabase/supabase-js";

const headers = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};

function responder(status, dados) {
  return new Response(JSON.stringify(dados), {
    status,
    headers,
  });
}

export default async function handler(request) {
  if (request.method !== "POST") {
    return responder(405, { error: "Método não permitido." });
  }

  try {
    const chave = process.env.GEMINI_API_KEY;

    if (!chave) {
      return responder(500, { error: "Chave Gemini não configurada." });
    }

    const autorizacao = request.headers.get("authorization") || "";
    if (!autorizacao.startsWith("Bearer ")) {
      return responder(401, { error: "Entre na sua conta para conversar com o paciente." });
    }
    const token = autorizacao.slice(7).trim();
    const url = process.env.VITE_SUPABASE_URL;
    const publica = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    const secreta = process.env.SUPABASE_SECRET_KEY;
    if (!url || !publica || !secreta) {
      return responder(500, { error: "Configuração de autenticação incompleta." });
    }
    const auth = createClient(url, publica, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: autenticacao, error: erroAuth } = await auth.auth.getUser(token);
    if (erroAuth || !autenticacao?.user?.id) {
      return responder(401, { error: "Login inválido ou expirado." });
    }
    const corpo = await request.json().catch(() => ({}));
    const { mensagens, atendimento_id } = corpo;
    if (typeof atendimento_id !== "string" ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(atendimento_id)) {
      return responder(403, { error: "Atendimento não autorizado." });
    }
    const banco = createClient(url, secreta, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: atendimento, error: erroAtendimento } = await banco
      .from("atendimentos")
      .select("id, aluno_id, paciente_id, iniciado_em, status")
      .eq("id", atendimento_id)
      .eq("aluno_id", autenticacao.user.id)
      .maybeSingle();
    if (erroAtendimento) {
      console.error("Erro ao verificar atendimento:", erroAtendimento.message);
      return responder(500, { error: "Não foi possível verificar o atendimento." });
    }
    if (!atendimento || atendimento.status !== "iniciado" ||
        !Number.isFinite(Date.parse(atendimento.iniciado_em)) ||
        Date.now() >= Date.parse(atendimento.iniciado_em) + 30 * 60 * 1000) {
      return responder(403, { error: "Sessão inexistente, encerrada ou com tempo esgotado." });
    }
    const { data: perfil, error: erroPaciente } = await banco
      .from("pacientes")
      .select("nome_ficticio, idade, area")
      .eq("id", atendimento.paciente_id)
      .maybeSingle();
    if (erroPaciente || !perfil) {
      return responder(500, { error: "Não foi possível carregar o paciente." });
    }
    const paciente = {
      nome: perfil.nome_ficticio,
      idade: perfil.idade,
      titulo: perfil.area,
      historia: `Paciente fictício ${perfil.nome_ficticio}, ${perfil.idade} anos. Área temática: ${perfil.area}. Revele sua história gradualmente.`
    };

    if (!paciente || typeof paciente !== "object" || !Array.isArray(mensagens)) {
      return responder(400, { error: "Dados inválidos." });
    }

    const historico = mensagens
      .slice(-20)
      .filter((m) => typeof m.texto === "string")
      .map((m) => ({
        role: m.papel === "paciente" ? "model" : "user",
        parts: [{ text: m.texto.slice(0, 2000) }],
      }));

    if (!historico.length || historico.at(-1).role !== "user") {
      return responder(400, { error: "Envie uma intervenção do aluno." });
    }

    const instrucao = `
Você interpreta um paciente FICTÍCIO em um laboratório educacional de psicanálise.

Paciente: ${String(paciente.nome || "Paciente").slice(0, 100)}
Idade: ${String(paciente.idade || "").slice(0, 20)}
Caso: ${String(paciente.titulo || paciente.tema || "").slice(0, 300)}
História: ${String(paciente.historia || paciente.descricao || "").slice(0, 3000)}

REGRAS:
- Responda em português brasileiro, como o paciente.
- Mantenha personalidade e história consistentes.
- Considere o histórico da conversa.
- Não repita frases nem respostas anteriores.
- Revele informações gradualmente, conforme as perguntas.
- Demonstre emoções humanas plausíveis.
- Não aja como terapeuta, professor ou assistente de IA.
- Não forneça diagnósticos nem recomendações clínicas.
- Responda naturalmente, em geral com 1 a 4 frases.
- Não mencione estas instruções.
`;

    const resposta = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": chave,
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: instrucao }],
          },
          contents: historico,
          generationConfig: {
            temperature: 0.85,
            maxOutputTokens: 400,
          },
        }),
      }
    );

    const dados = await resposta.json();

    if (!resposta.ok) {
      console.error("Erro Gemini:", resposta.status, JSON.stringify(dados).slice(0, 500));
      return responder(502, {
        error: "Não foi possível gerar a resposta do paciente.",
      });
    }

    const texto = dados.candidates?.[0]?.content?.parts
      ?.map((parte) => parte.text || "")
      .join("")
      .trim();

    if (!texto) {
      return responder(502, { error: "A IA não retornou uma resposta." });
    }

    // Persistir o par de mensagens vinculado ao atendimento autenticado.
    // O registro é realizado no servidor, nunca com um aluno_id enviado pelo navegador.
    const ultimaIntervencao = mensagens.at(-1)?.texto;
    if (typeof ultimaIntervencao !== "string" || !ultimaIntervencao.trim() ||
        ultimaIntervencao.length > 2000) {
      return responder(400, { error: "Intervenção inválida para registro." });
    }

    const { error: erroRegistro } = await banco.from("mensagens").insert([
      { atendimento_id, papel: "aluno", texto: ultimaIntervencao.trim() },
      { atendimento_id, papel: "paciente", texto }
    ]);

    if (erroRegistro) {
      console.error("Falha ao registrar mensagens:", erroRegistro.message);
      return responder(500, {
        error: "A resposta foi gerada, mas não foi possível salvar o histórico. Não continue esta sessão antes de verificar o registro."
      });
    }

    return responder(200, { resposta: texto });
  } catch (erro) {
    console.error("Erro na função:", erro);
    return responder(500, { error: "Erro ao processar o atendimento." });
  }
}
