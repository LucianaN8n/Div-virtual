
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

    const corpo = await request.json();
    const { paciente, mensagens } = corpo;

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
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
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

    return responder(200, { resposta: texto });
  } catch (erro) {
    console.error("Erro na função:", erro);
    return responder(500, { error: "Erro ao processar o atendimento." });
  }
}
