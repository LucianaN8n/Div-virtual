
import { createClient } from "@supabase/supabase-js";

const PRODUTO_ID = "8716478";

const PLANOS = {
  "1407789": { nome: "essencial", sessoes: 3 },
  "1407790": { nome: "profissional", sessoes: 10 }
};

export default async function handler(request) {
  if (request.method !== "POST") {
    return new Response("Método não permitido", { status: 405 });
  }

  const hottok = process.env.HOTMART_HOTTOK;
  const chaveRecebida = request.headers.get("x-hotmart-hottok");

if (!hottok || !process.env.VITE_SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY) {
    return new Response("Configuração incompleta", { status: 500 });
  }

  if (!chaveRecebida || chaveRecebida !== hottok) {
    return new Response("Não autorizado", { status: 401 });
  }

  let evento;

  try {
    evento = await request.json();
  } catch {
    return new Response("JSON inválido", { status: 400 });
  }

  const dados = evento.data || {};
  const produtoId = String(dados.product?.id ?? dados.subscription?.product?.id ?? "");
console.log("Diagnóstico Hotmart:", {
  evento: evento.event,
  produtoId,
  camposAssinatura: Object.keys(dados.subscription || {}),
  camposProdutoAssinatura: Object.keys(dados.subscription?.product || {}),
  idProdutoAssinatura: String(dados.subscription?.product?.id ?? ""),
  camposPlano: Object.keys(dados.subscription?.plan || {}),
  camposAssinante: Object.keys(dados.subscription?.subscriber || {}),
  possuiIdEvento: Boolean(evento.id),
  possuiTransacao: Boolean(dados.purchase?.transaction)
});
  if (produtoId !== PRODUTO_ID) {
    const testeHotmart = produtoId === "0";
    console.info("Evento Hotmart não aplicado", {
      evento: evento.event,
      produtoId,
      esperado: PRODUTO_ID,
      motivo: testeHotmart ? "Payload de teste da Hotmart" : "Outro produto"
    });
    // Não registrar, liberar créditos ou alterar assinaturas para
    // produtos desconhecidos. A resposta deixa explícito o descarte.
    return Response.json({
      recebido: true,
      aplicado: false,
      motivo: testeHotmart
        ? "Teste Hotmart: produto 0, sem alteração de assinatura"
        : "Produto diferente do Divã Virtual"
    });
  }

  const tipo = evento.event;
  const eventoId = evento.id;
  const planoId = String(dados.subscription?.plan?.id ?? "");
  const plano = PLANOS[planoId];
  const emailBruto = dados.buyer?.email ?? dados.subscription?.user?.email ?? dados.subscription?.subscriber?.email;
  const email = typeof emailBruto === "string" ? emailBruto.trim().toLowerCase() : null;
  const transacao = dados.purchase?.transaction;
  const assinaturaCodigo = dados.subscription?.subscriber_code ?? dados.subscription?.subscriber?.code;
const dataVencimento = dados.subscription?.date_next_charge ?? dados.purchase?.date_next_charge ?? null;
console.log("Campo de vencimento presente:", Boolean(dataVencimento));
  if (!eventoId || !tipo) {
    return new Response("Evento sem identificação", { status: 422 });
  }

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SECRET_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );

  if (tipo === "PURCHASE_APPROVED") {
    if (!plano || !email || !transacao || !assinaturaCodigo) {
      console.error("Compra sem dados suficientes", {
        eventoId,
        planoId,
        temEmail: Boolean(email),
        temTransacao: Boolean(transacao),
        temAssinatura: Boolean(assinaturaCodigo)
      });

      return new Response(
        "Dados da assinatura incompletos",
        { status: 422 }
      );
    }
  }

  const { data, error } = await supabase.rpc(
    "processar_hotmart_evento",
    {
      p_evento_id: String(eventoId),
      p_tipo_evento: tipo,
      p_transacao: transacao ? String(transacao) : null,
      p_assinatura_codigo: assinaturaCodigo
        ? String(assinaturaCodigo)
        : null,
      p_email: email || null,
p_plano: plano?.nome || null,
p_data_vencimento: dataVencimento
    }
  );

  if (error) {
    console.error("Erro ao processar evento Hotmart", {
      eventoId,
      mensagem: error.message
    });

    return new Response("Falha ao processar evento", {
      status: 500
    });
  }

  return Response.json({
    recebido: true,
    resultado: data
  });
}
