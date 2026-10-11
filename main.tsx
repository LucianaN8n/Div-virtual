import React,{useState,useRef} from 'react';import{createRoot}from'react-dom/client';import{CreateMLCEngine}from '@mlc-ai/web-llm';import './style.css';
import { supabase } from './supabase';
const casosDemonstracao=[{id:'ansiedade',name:'Marina',age:32,topic:'Ansiedade e autocobrança',background:'Marina, 32 anos, trabalha com gestão e sente pressão constante para não decepcionar ninguém. Relata insônia e preocupação excessiva. Não revele toda a história de uma vez.'},{id:'luto',name:'Roberto',age:48,topic:'Luto e mudanças',background:'Roberto, 48 anos, perdeu o pai há oito meses, evita falar da perda e se sente culpado por ter se afastado antes do falecimento. Não revele tudo de uma vez.'},{id:'vinculos',name:'Camila',age:27,topic:'Relacionamentos e limites',background:'Camila, 27 anos, relata dificuldade em dizer não, medo de abandono e relacionamentos com muita dependência emocional. Não revele tudo de uma vez.'}];

type PacienteBanco = {
  id: string;
  codigo: string;
  nome_ficticio: string;
  idade: number;
  area: string;
};

async function buscarPacientes() {
  const { data, error } = await supabase
    .from('pacientes')
    .select('id, codigo, nome_ficticio, idade, area');

  if (error) {
    console.error('Erro ao buscar pacientes:', error.message);
    return [];
  }

  return (data ?? []) as PacienteBanco[];
}

type Msg={role:'user'|'assistant',content:string};type Mode='local'|'guided';
function App(){const[chosen,setChosen]=useState(casosDemonstracao[0]);const[mode,setMode]=useState<Mode>('guided');const[msgs,setMsgs]=useState<Msg[]>([]);const[input,setInput]=useState('');const[busy,setBusy]=useState(false);const[status,setStatus]=useState('Pronto para iniciar');const[session,setSession]=useState(false);const engine=useRef<any>(null);const[assessment,setAssessment]=useState<any>(null);const[loading,setLoading]=useState(false);
const [pacientesBanco, setPacientesBanco] = useState<PacienteBanco[]>([]);
const cases = pacientesBanco.length ? pacientesBanco.map(p => ({
 id:p.id, name:p.nome_ficticio, age:p.idade, topic:p.area || 'Caso clínico',
 background:`Paciente fictício ${p.nome_ficticio}, ${p.idade} anos. Área temática: ${p.area}. Revele sua história gradualmente.`
})) : casosDemonstracao;
React.useEffect(() => {
  buscarPacientes().then((pacientes) => {
    setPacientesBanco(pacientes);
    if(pacientes.length){const p=pacientes[0];setChosen({id:p.id,name:p.nome_ficticio,age:p.idade,topic:p.area || 'Caso clínico',background:`Paciente fictício ${p.nome_ficticio}, ${p.idade} anos. Área temática: ${p.area}. Revele sua história gradualmente.`});}
    console.log('Pacientes carregados:', pacientes.length);
  });
}, []);
               const supported=typeof navigator!=='undefined'&&!!(navigator as any).gpu;
async function activateLocal(){if(!supported){setStatus('WebGPU indisponível neste navegador. Use o modo guiado.');return;}setLoading(true);setStatus('Preparando IA local; o primeiro download pode ser grande...');try{engine.current=await CreateMLCEngine('Llama-3.2-1B-Instruct-q4f16_1-MLC',{initProgressCallback:(p:any)=>setStatus(p.text||'Carregando modelo...')});setMode('local');setStatus('IA local pronta. Conversas processadas neste aparelho.');}catch(e){setStatus('Não foi possível iniciar a IA local. Modo guiado disponível.');setMode('guided');}finally{setLoading(false)}}
type Historia = {motivo:string; contexto:string; vinculo:string; conflito:string; lembranca:string; receio:string; recurso:string; abertura:string};
function historiaPaciente(nome:string, area:string):Historia {
 const n=nome.toLowerCase(); const a=(area||'').toLowerCase();
 if(a.includes('diversidade')) return {
  motivo:'Tenho me sentido dividido entre ser eu mesmo e tentar corresponder ao que esperam de mim.',
  contexto:'No trabalho e entre amigos consigo falar com mais liberdade, mas em casa meço cada palavra. Isso tem me deixado exausto.',
  vinculo:'Minha família costuma dizer que me ama, mas algumas conversas fazem parecer que só sou aceito se não falar de partes importantes da minha vida.',
  conflito:'Às vezes me pego antecipando uma rejeição que nem aconteceu. Acabo me afastando antes que alguém tenha a chance de me conhecer.',
  lembranca:'Lembro de um almoço de família em que fizeram comentários sobre como uma pessoa deveria viver. Eu fiquei calado, mas aquilo ficou comigo.',
  receio:'Tenho medo de decepcionar as pessoas que amo e, ao mesmo tempo, de passar a vida tentando não decepcioná-las.',
  recurso:'Tenho uma amizade em que consigo falar sem me vigiar. Quando estou com essa pessoa, percebo como é diferente me sentir seguro.',
  abertura:'Queria entender por que ainda sinto que preciso pedir permissão para ser quem sou.'};
 if(a.includes('mulher')) return {
  motivo:'Parece que preciso dar conta de tudo e ainda demonstrar que está tudo bem.',
  contexto:'Nos últimos meses venho acumulando responsabilidades. Mesmo quando descanso, fico pensando no que deixei de fazer.',
  vinculo:'Minha mãe sempre foi muito exigente consigo mesma. Cresci vendo que pedir ajuda era quase um sinal de fracasso.',
  conflito:'Eu digo sim para evitar conflitos, depois fico ressentida. É como se minhas necessidades viessem sempre por último.',
  lembranca:'Quando era mais nova, ouvi muitas vezes que precisava ser forte e não incomodar ninguém com meus problemas.',
  receio:'Tenho medo de colocar limites e ser vista como egoísta ou ingrata.',
  recurso:'Uma amiga percebeu que eu estava esgotada e perguntou do que eu precisava. Foi difícil até responder.',
  abertura:'Queria descobrir se posso cuidar de mim sem sentir culpa.'};
 if(a.includes('infan')||a.includes('crian')) return {
  motivo:'Às vezes fico triste ou bravo e nem sei explicar direito por quê.',
  contexto:'Na escola algumas coisas me deixam nervoso, especialmente quando sinto que estão rindo de mim.',
  vinculo:'Gosto quando alguém da minha família brinca comigo sem ficar perguntando se fui bem nas tarefas.',
  conflito:'Quando acho que fiz algo errado, prefiro ficar quieto porque tenho medo de levar bronca.',
  lembranca:'Uma vez eu queria contar uma coisa da escola, mas todo mundo estava ocupado. Depois desisti.',
  receio:'Tenho medo de falar e alguém ficar bravo comigo.',
  recurso:'Desenhar me ajuda quando não sei encontrar as palavras.',
  abertura:'Talvez eu consiga explicar melhor se a gente conversar devagar.'};
 if(a.includes('organizacional')||a.includes('trabalho')) return {
  motivo:'Estou levando as preocupações do trabalho para casa e parece que nunca desligo.',
  contexto:'Recebo mensagens fora do expediente e sinto que preciso responder imediatamente, mesmo quando estou com a família.',
  vinculo:'Meu pai valorizava muito quem trabalhava sem reclamar. Acho que aprendi cedo a associar descanso com preguiça.',
  conflito:'Quero reconhecimento, mas tenho medo de dizer que cheguei ao meu limite. Acabo assumindo mais tarefas do que consigo.',
  lembranca:'Em uma reunião, fiquei calado quando atribuíram a mim uma tarefa que não era minha. Passei a noite pensando nisso.',
  receio:'Tenho receio de ser substituído se eu mostrar cansaço ou discordar.',
  recurso:'Quando consigo conversar com um colega de confiança, percebo que não sou o único a sentir essa pressão.',
  abertura:'Queria entender por que minha autoestima parece depender tanto de ser útil.'};
 if(a.includes('luto')) return {
  motivo:'Depois de uma perda importante, tenho dificuldade de seguir com a rotina como antes.',
  contexto:'Alguns dias consigo trabalhar normalmente; em outros, uma música ou um objeto traz tudo de volta.',
  vinculo:'Nossa relação tinha carinho, mas também assuntos que ficaram sem conversa. Isso pesa quando lembro.',
  conflito:'Sinto saudade e culpa ao mesmo tempo. Quando tenho um dia bom, penso que deveria estar mais triste.',
  lembranca:'Lembro de uma conversa simples que tivemos e que hoje parece ter um significado enorme.',
  receio:'Tenho medo de esquecer detalhes da pessoa e de parecer que estou deixando a história para trás.',
  recurso:'Às vezes olhar fotografias com alguém próximo ajuda, embora em outros dias eu prefira não olhar.',
  abertura:'Gostaria de conseguir lembrar com carinho sem sentir que estou traindo a saudade.'};
 if(a.includes('víncul')||a.includes('vincul')||a.includes('relacion')) return {
  motivo:'Tenho dificuldade de dizer o que preciso nas minhas relações.',
  contexto:'Quando alguém demora a responder uma mensagem, começo a imaginar que fiz alguma coisa errada.',
  vinculo:'Em casa, quando havia desentendimento, as pessoas paravam de conversar por dias. Acho que aprendi a temer o silêncio.',
  conflito:'Para não perder as pessoas, cedo demais. Depois fico magoado por não ter conseguido me posicionar.',
  lembranca:'Uma vez concordei com algo que não queria só para evitar uma discussão. Ainda penso naquele momento.',
  receio:'Tenho medo de que, se eu disser não, deixem de gostar de mim.',
  recurso:'Há uma pessoa com quem consigo discordar sem que a relação acabe. Isso me surpreende.',
  abertura:'Queria conseguir me relacionar sem ficar o tempo todo tentando adivinhar o que o outro quer.'};
 const variacao=n.length%3;
 return {
  motivo:['Tenho me cobrado muito e ultimamente parece que nunca faço o suficiente.','Ando preocupado com coisas pequenas, mas não consigo simplesmente parar de pensar nelas.','Tenho sentido uma tristeza difícil de explicar, mesmo quando aparentemente está tudo bem.'][variacao],
  contexto:'Tenho dormido pior e me pego revendo conversas antigas, imaginando o que deveria ter dito.',
  vinculo:'Na minha família havia muita preocupação com o que os outros pensavam. Errar parecia algo muito grave.',
  conflito:'Uma parte de mim quer mudar, mas outra acha que vou decepcionar alguém se fizer escolhas diferentes.',
  lembranca:'Lembro de uma ocasião em que tentei explicar como estava me sentindo e ouvi que estava exagerando.',
  receio:'Tenho medo de não corresponder às expectativas e de descobrir que nem sei quais são as minhas.',
  recurso:'Quando consigo escrever o que sinto, algumas coisas ficam um pouco mais claras.',
  abertura:'Queria compreender por que sou tão duro comigo mesmo.'};
}
function aberturaPaciente(nome:string,area:string){const h=historiaPaciente(nome,area);return `Olá, meu nome é ${nome}. ${h.motivo} Não sei muito bem por onde começar, mas achei importante vir conversar.`}
function start(){setMsgs([{role:'assistant',content:aberturaPaciente(chosen.name,chosen.topic)}]);setAssessment(null);setSession(true);setStatus('Sessão de treinamento iniciada')}
function guidedReply(text:string,count:number){
 const t=text.toLocaleLowerCase('pt-BR');const h=historiaPaciente(chosen.name,chosen.topic);
 if(/suic|me matar|automutil|tirar minha vida|risco imediato/.test(t))return 'É difícil falar disso. [Orientação pedagógica: interrompa a simulação para avaliar risco, priorizar segurança e procurar supervisão e serviços humanos apropriados. Este simulador não atende emergências.]';
 if(/obrigad|encerrar|terminar|próxima sessão|até a próxima|nos vemos/.test(t))return count>3?`Obrigado por me escutar. ${h.abertura}`:'Obrigado por me ouvir. Acho que ainda tenho bastante coisa para conversar.';
 const respostas:{padrao:RegExp;opcoes:string[]}[]=[
  {padrao:/fam[ií]lia|m[aã]e|pai|respons[aá]ve|casa|parent/,opcoes:[h.vinculo,h.lembranca]},
  {padrao:/inf[aâ]ncia|crian[cç]a|pequen|passado|lembran[cç]a|antes/,opcoes:[h.lembranca,h.vinculo]},
  {padrao:/trabalho|emprego|chefe|colega|escola|faculdade|rotina/,opcoes:[h.contexto,h.conflito]},
  {padrao:/medo|receio|assusta|preocupa|incomoda|dif[ií]cil|sofr|ang[uú]stia/,opcoes:[h.receio,h.conflito]},
  {padrao:/relacionamento|parceir|namor|casamento|amizade|amig|v[ií]nculo|rejei[cç]/,opcoes:[h.vinculo,h.conflito]},
  {padrao:/o que te trouxe|por que veio|procurou|busca|motivo|que aconteceu|conte mais/,opcoes:[h.motivo,h.contexto,h.abertura]},
  {padrao:/quando|desde quando|come[cç]ou|primeira vez|h[aá] quanto tempo/,opcoes:[h.contexto,h.lembranca]},
  {padrao:/como se sente|o que sente|sentindo|sentimento|emo[cç][aã]o|como foi/,opcoes:[h.conflito,h.receio]},
  {padrao:/quem te ajuda|apoio|acolh|segur|al[ií]vio|melhor|lidar|consegue/,opcoes:[h.recurso,h.abertura]},
  {padrao:/quer|gostaria|espera|deseja|precisa|mudan[cç]a|objetivo/,opcoes:[h.abertura,h.recurso]}
 ];
 const usadas=msgs.filter(m=>m.role==='assistant').map(m=>m.content);
 const escolha=(opcoes:string[])=>opcoes.find(r=>!usadas.includes(r))||opcoes[count%opcoes.length];
 for(const r of respostas)if(r.padrao.test(t))return escolha(r.opcoes);
 return escolha([h.contexto,h.conflito,h.lembranca,h.receio,h.vinculo,h.recurso,h.abertura]);
}
async function send(){if(!input.trim()||busy||!session)return;const next=[...msgs,{role:'user' as const,content:input.trim()}];setMsgs(next);setInput('');setBusy(true);try{let reply='';if(mode==='local'&&engine.current){const response=await engine.current.chat.completions.create({messages:[{role:'system',content:`Você representa APENAS um paciente fictício em treinamento de escuta clínica, nunca o terapeuta. ${chosen.background} História fictícia para interpretação: ${JSON.stringify(historiaPaciente(chosen.name,chosen.topic))}. Responda com base na pergunta e na conversa anterior; revele detalhes progressivamente, sem repetir respostas. Responda em português brasileiro, com naturalidade, em 1 a 4 frases. Não dê feedback ao aluno nem diagnósticos. Evite alegar ser pessoa real. Se houver risco imediato, sinalize necessidade de ajuda humana.`},...next.map(m=>({role:m.role,content:m.content}))],temperature:.8,max_tokens:180});reply=response.choices[0]?.message?.content||'Pode repetir sua pergunta?';}else{reply=guidedReply(input,next.filter(m=>m.role==='user').length)}setMsgs(v=>[...v,{role:'assistant',content:reply}]);}catch{setStatus('Erro na IA local. Você pode continuar no modo guiado.');setMode('guided');setMsgs(v=>[...v,{role:'assistant',content:'Pode me perguntar de outra forma?'}]);}finally{setBusy(false)}}
function evaluate(){const u=msgs.filter(m=>m.role==='user').map(m=>m.content);const joined=u.join(' ').toLowerCase();const questions=u.filter(x=>x.includes('?')).length;const words=u.join(' ').trim().split(/\s+/).filter(Boolean).length;const scores=[Math.min(10,2+u.length*.6+(joined.match(/entendo|imagino|acolh|obrigad|escut|compreendo/g)||[]).length),Math.min(10,2+questions*1.2),Math.min(10,2+(joined.match(/quando|como|o que|percebe|sent|história|historia|relação|relacao/g)||[]).length*.8),Math.min(10,5+(joined.match(/respeit|limite|consent|sigilo|seguran/g)||[]).length),Math.min(10,2+(joined.match(/encerrar|próxima|proxima|retomar|resum|obrigad/g)||[]).length*1.5)];const weights=[.25,.2,.25,.2,.1];const value=scores.reduce((a,s,i)=>a+s*weights[i],0);setAssessment({scores:scores.map(x=>Math.round(x*10)/10),value:Math.round(value*10)/10,turns:u.length,words});}
function download(){if(!assessment)return;const report={tipo:'RELATÓRIO DE TREINO — NÃO É NOTA OFICIAL',caso:chosen.topic,modo:mode,data:new Date().toISOString(),resultado:assessment,transcricao:msgs,observacao:'Pontuação heurística ilustrativa. Não substitui avaliação humana. Registro local não é verificável.'};const blob=new Blob([JSON.stringify(report,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='diva-virtual-treino.json';a.click();URL.revokeObjectURL(url)}
return <main><header><div className="logo">✦</div><div><div className="eyebrow">INSTITUTO SABER CONSCIENTE</div><h1>Divã Virtual <span>2.0</span></h1><p>Laboratório de Prática Clínica Simulada</p></div></header><div className="warning">Versão piloto de treinamento. Não utilize dados de pacientes reais. A avaliação exibida é apenas demonstrativa e não vale como nota acadêmica.</div><section className="layout"><aside className="panel"><h2>Seu treinamento</h2><label>Caso clínico</label><select value={chosen.id} disabled={session} onChange={e=>setChosen(cases.find(c=>c.id===e.target.value) || cases[0])}>{cases.map(c=><option key={c.id} value={c.id}>{c.topic} — {c.name}</option>)}</select><p className="muted">Paciente fictício: {chosen.name}, {chosen.age} anos</p><h3>Modo de atendimento</h3><button className={mode==='guided'?'selected':''} onClick={()=>setMode('guided')} disabled={busy}>Cenários narrativos · sem IA</button><button onClick={activateLocal} disabled={loading||busy}>{loading?'Carregando...':'Ativar IA local (WebGPU)'}</button><p className="muted">{supported?'Navegador indica suporte a WebGPU.':'Este navegador não anuncia WebGPU.'}</p><p className="status">{status}</p><button className="gold" onClick={start}>{session?'Reiniciar sessão':'Iniciar sessão'}</button><div className="separator"/><h3>Privacidade</h3><p className="muted">O chat permanece na memória desta página. Fechar ou atualizar pode apagar a sessão. Não há login nem envio de notas nesta versão.</p></aside><section className="panel chat"><div className="chathead"><div><h2>Consultório simulado</h2><p className="muted">{chosen.name} · {chosen.topic}</p></div><span className="pill">{mode==='local'?'IA local':'Narrativo'}</span></div><div className="messages">{!session?<div className="empty">Escolha um caso e clique em “Iniciar sessão” para começar a prática.</div>:msgs.map((m,i)=><div className={'bubble '+(m.role==='user'?'mine':'patient')} key={i}><small>{m.role==='user'?'Terapeuta (aluno)':chosen.name}</small>{m.content}</div>)}{busy&&<p className="muted">Paciente elaborando resposta...</p>}</div><div className="composer"><textarea placeholder="Escreva sua intervenção clínica..." value={input} disabled={!session||busy} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send()}}}/><button className="gold" onClick={send} disabled={!session||busy||!input.trim()}>Enviar</button></div><div className="footer"><button onClick={evaluate} disabled={!session||busy||msgs.length<3}>Analisar treino</button><span className="muted">Pressione Enter para enviar</span></div></section></section>{assessment&&<section className="panel result"><h2>Feedback preliminar do treino</h2><p className="warning">Pontuação ilustrativa baseada em regras simples. Não é uma avaliação clínica validada nem pode compor a nota oficial.</p><div className="score">{assessment.value.toFixed(1)} <small>/ 10</small></div><div className="metrics">{['Acolhimento','Perguntas','Investigação','Ética','Encerramento'].map((label,i)=><div key={label}><span>{label}</span><strong>{assessment.scores[i].toFixed(1)}</strong></div>)}</div><p>Intervenções realizadas: {assessment.turns}. Recomendação: peça supervisão pedagógica para analisar a qualidade das intervenções, o contexto e a postura ética.</p><button onClick={download}>Exportar registro de treino (JSON)</button></section>}<footer>Instituto Saber Consciente · Protótipo educacional com cenários narrativos sem API paga · Não substitui supervisão profissional</footer></main>}
createRoot(document.getElementById('root')!).render(<App/>);
