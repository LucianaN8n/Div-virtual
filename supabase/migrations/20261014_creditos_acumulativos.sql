-- Divã Virtual 2.0 — Créditos acumulativos por pagamento aprovado
-- Executar uma única vez no SQL Editor do Supabase.
-- Mantém a versão de 7 parâmetros, que chama esta função.
CREATE OR REPLACE FUNCTION public.processar_hotmart_evento(
  p_evento_id text,
  p_tipo_evento text,
  p_transacao text,
  p_assinatura_codigo text,
  p_email text,
  p_plano text
)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path TO ''
AS $function$
DECLARE
  v_assinatura_id bigint;
  v_sessoes integer;
  v_saldo integer;
  v_inserido integer;
  v_status text;
BEGIN
  IF NULLIF(BTRIM(p_evento_id), '') IS NULL
     OR NULLIF(BTRIM(p_tipo_evento), '') IS NULL THEN
    RAISE EXCEPTION 'Evento sem identificação';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      COALESCE(NULLIF(p_assinatura_codigo, ''),
               NULLIF(p_transacao, ''),
               p_evento_id), 0
    )
  );

  IF p_tipo_evento = 'PURCHASE_APPROVED' THEN
    IF p_plano IS NULL
       OR p_plano NOT IN ('essencial', 'profissional')
       OR NULLIF(BTRIM(p_email), '') IS NULL
       OR NULLIF(BTRIM(p_transacao), '') IS NULL
       OR NULLIF(BTRIM(p_assinatura_codigo), '') IS NULL THEN
      RAISE EXCEPTION 'Dados da compra incompletos';
    END IF;
  END IF;

  INSERT INTO public.hotmart_eventos (
    evento_id, tipo_evento, transacao, assinatura_codigo
  )
  VALUES (
    p_evento_id, p_tipo_evento,
    p_transacao, p_assinatura_codigo
  )
  ON CONFLICT DO NOTHING;

  GET DIAGNOSTICS v_inserido = ROW_COUNT;

  IF v_inserido = 0 THEN
    RETURN pg_catalog.jsonb_build_object(
      'resultado', 'duplicado',
      'creditos_liberados', false
    );
  END IF;

  IF p_tipo_evento = 'PURCHASE_APPROVED' THEN
    v_sessoes := CASE p_plano
      WHEN 'essencial' THEN 3
      WHEN 'profissional' THEN 10
    END;

    INSERT INTO public.assinaturas (
      email, status, plano,
      sessoes_disponiveis, hotmart_subscription_id
    )
    VALUES (
      pg_catalog.lower(pg_catalog.btrim(p_email)),
      'ativa', p_plano, v_sessoes,
      p_assinatura_codigo
    )
    ON CONFLICT (hotmart_subscription_id)
    WHERE hotmart_subscription_id IS NOT NULL
    DO UPDATE SET
      email = EXCLUDED.email,
      status = 'ativa',
      plano = EXCLUDED.plano,
      sessoes_disponiveis =
        COALESCE(public.assinaturas.sessoes_disponiveis, 0)
        + EXCLUDED.sessoes_disponiveis
    RETURNING id, sessoes_disponiveis
    INTO v_assinatura_id, v_saldo;

    RETURN pg_catalog.jsonb_build_object(
      'resultado', 'pagamento_registrado',
      'assinatura_id', v_assinatura_id,
      'sessoes_adicionadas', v_sessoes,
      'sessoes_disponiveis', v_saldo,
      'creditos_liberados', true
    );
  END IF;

  IF p_tipo_evento IN (
    'PURCHASE_REFUNDED',
    'PURCHASE_CHARGEBACK',
    'PURCHASE_DELAYED',
    'SUBSCRIPTION_CANCELLATION'
  ) AND NULLIF(BTRIM(p_assinatura_codigo), '') IS NOT NULL THEN
    v_status := CASE p_tipo_evento
      WHEN 'PURCHASE_REFUNDED' THEN 'reembolsada'
      WHEN 'PURCHASE_CHARGEBACK' THEN 'chargeback'
      WHEN 'PURCHASE_DELAYED' THEN 'atrasada'
      WHEN 'SUBSCRIPTION_CANCELLATION' THEN 'cancelada'
    END;

    UPDATE public.assinaturas
    SET
      status = v_status,
      sessoes_disponiveis = CASE
        WHEN p_tipo_evento IN (
          'PURCHASE_REFUNDED',
          'PURCHASE_CHARGEBACK'
        ) THEN 0
        ELSE sessoes_disponiveis
      END,
      cancelada_em = CASE
        WHEN p_tipo_evento = 'SUBSCRIPTION_CANCELLATION'
        THEN pg_catalog.now()
        ELSE cancelada_em
      END
    WHERE hotmart_subscription_id = p_assinatura_codigo
    RETURNING id INTO v_assinatura_id;
  END IF;

  RETURN pg_catalog.jsonb_build_object(
    'resultado', 'evento_registrado',
    'tipo', p_tipo_evento,
    'assinatura_encontrada', v_assinatura_id IS NOT NULL,
    'creditos_liberados', false
  );
END;
$function$;
