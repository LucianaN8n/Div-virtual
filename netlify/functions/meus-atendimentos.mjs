import { createClient } from "@supabase/supabase-js";

const json = (status, body) => new Response(JSON.stringify(body), {
  status,
  headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }
});

export default async function handler(request) {
  if (request.method !== "GET") return json(405, { error: "Método não permitido." });

  const authorization = request.headers.get("authorization") || "";
  if (!authorization.startsWith("Bearer ")) {
    return json(401, { error: "Faça login para consultar seus atendimentos." });
  }

  const url = process.env.VITE_SUPABASE_URL;
  const publicKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !publicKey || !secretKey) {
    return json(500, { error: "Configuração do servidor incompleta." });
  }

  try {
    const auth = createClient(url, publicKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
    const { data: userData, error: authError } =
      await auth.auth.getUser(authorization.slice(7).trim());
    if (authError || !userData?.user?.id) {
      return json(401, { error: "Login inválido ou expirado." });
    }

    const db = createClient(url, secretKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
    const userId = userData.user.id;
    const params = new URL(request.url).searchParams;
    const attendanceId = params.get("atendimento_id");

    if (attendanceId !== null) {
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(attendanceId)) {
        return json(400, { error: "Identificação de atendimento inválida." });
      }
      const { data: attendance, error: attendanceError } = await db
        .from("atendimentos")
        .select("id, paciente_id, iniciado_em, finalizado_em, status, tentativa")
        .eq("id", attendanceId)
        .eq("aluno_id", userId)
        .maybeSingle();
      if (attendanceError) throw attendanceError;
      if (!attendance) return json(404, { error: "Atendimento não encontrado." });

      const [messagesResult, patientResult] = await Promise.all([
        db.from("mensagens")
          .select("id, papel, texto, criado_em")
          .eq("atendimento_id", attendance.id)
          .order("criado_em", { ascending: true })
          .order("id", { ascending: true })
          .limit(500),
        db.from("pacientes")
          .select("id, nome_ficticio, idade, area")
          .eq("id", attendance.paciente_id)
          .maybeSingle()
      ]);
      if (messagesResult.error) throw messagesResult.error;
      if (patientResult.error) throw patientResult.error;
      return json(200, {
        atendimento: attendance,
        paciente: patientResult.data,
        mensagens: messagesResult.data || [],
        limite_mensagens: 500
      });
    }

    const { data: attendances, error: listError } = await db
      .from("atendimentos")
      .select("id, paciente_id, iniciado_em, finalizado_em, status, tentativa")
      .eq("aluno_id", userId)
      .order("iniciado_em", { ascending: false })
      .limit(100);
    if (listError) throw listError;

    const ids = [...new Set((attendances || []).map(a => a.paciente_id))];
    let patients = [];
    if (ids.length) {
      const { data, error } = await db
        .from("pacientes")
        .select("id, nome_ficticio, idade, area")
        .in("id", ids);
      if (error) throw error;
      patients = data || [];
    }
    const byId = new Map(patients.map(p => [p.id, p]));
    return json(200, {
      atendimentos: (attendances || []).map(a => ({
        ...a,
        paciente: byId.get(a.paciente_id) || null
      })),
      limite_atendimentos: 100
    });
  } catch (error) {
    console.error("Erro ao consultar histórico:", error);
    return json(500, { error: "Não foi possível consultar o histórico." });
  }
}
