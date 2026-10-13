
export default async function handler(request) {
  if (request.method !== "POST") {
    return new Response("Método não permitido", { status: 405 });
  }

  const hottok = process.env.HOTMART_HOTTOK;

  if (!hottok) {
    return new Response("Configuração ausente", { status: 500 });
  }

  const recebido = request.headers.get("x-hotmart-hottok");

  if (!recebido || recebido !== hottok) {
    return new Response("Não autorizado", { status: 401 });
  }

  try {
    const evento = await request.json();

    console.log("Webhook Hotmart recebido", {
      event: evento.event,
      productId: evento.data?.product?.id,
      transaction: evento.data?.purchase?.transaction
    });

    return Response.json({ recebido: true });
  } catch {
    return new Response("Dados inválidos", { status: 400 });
  }
}
