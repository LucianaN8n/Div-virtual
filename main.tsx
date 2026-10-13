import React,{useState} from 'react';import{createRoot}from'react-dom/client';import './style.css';
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

type Msg={role:'user'|'assistant',content:string};
const SESSION_MS=30*60*1000;
const STORAGE_KEY='diva-virtual-sessao-piloto-v2';
const chaveSessao=(userId:string)=>`${STORAGE_KEY}-${userId}`;
type SessaoSalva={chosenId:string;startedAt:number;ended:boolean;msgs:Msg[]};
function lerSessao(userId:string):SessaoSalva|null{
 try{const raw=localStorage.getItem(chaveSessao(userId));if(!raw)return null;const s=JSON.parse(raw);
 if(typeof s.startedAt!=='number'||!Array.isArray(s.msgs)||typeof s.chosenId!=='string')return null;
 return s as SessaoSalva;}catch{return null;}
}
function formatarTempo(ms:number){const seg=Math.max(0,Math.ceil(ms/1000));return `${String(Math.floor(seg/60)).padStart(2,'0')}:${String(seg%60).padStart(2,'0')}`;}
function formatarRelatorio(assessment:any,chosen:{name:string;age:number;topic:string},msgs:Msg[],data:Date){
 const linhas:string[]=[
 'INSTITUTO SABER CONSCIENTE',
 'DIVÃ VIRTUAL — RELATÓRIO PEDAGÓGICO DE SIMULAÇÃO',
 '================================================',
 `Paciente fictício: ${chosen.name} (${chosen.age} anos)`,
 `Caso: ${chosen.topic}`,
 `Data: ${data.toLocaleString('pt-BR')}`,
 `Nota geral: ${Number(assessment.notaGeral??0).toFixed(1)}/10`,
 '', 'RESUMO DA SESSÃO',String(assessment.resumo||'') ,'',
 'AVALIAÇÃO POR CRITÉRIO','----------------------'];
 for(const c of assessment.criterios||[]){
 linhas.push('',`${c.nome||'Critério'} — ${Number(c.nota??0).toFixed(1)}/10`,
 `Por que recebeu esta nota: ${c.justificativa||'Não informado.'}`,
 `Pontos positivos: ${c.acerto||'Não informado.'}`,
 `O que pode melhorar: ${c.melhoria||'Não informado.'}`);
 if(c.exemplo)linhas.push(`Exemplo de intervenção: ${c.exemplo}`);
 }
 linhas.push('','PRÓXIMOS PASSOS',String(assessment.proximosPassos||'Não informado.'),
 '', 'TRANSCRIÇÃO DA SIMULAÇÃO','-------------------------');
 msgs.forEach((m,i)=>linhas.push(`${i+1}. ${m.role==='user'?'Terapeuta (aluno)':chosen.name}: ${m.content}`));
 linhas.push('','OBSERVAÇÃO: Relatório produzido por IA para treinamento. Não é nota oficial nem avaliação clínica validada.');
 return linhas.join('\r\n');
}

function App({userId,email}:{userId:string;email:string}){const[chosen,setChosen]=useState(casosDemonstracao[0]);const[msgs,setMsgs]=useState<Msg[]>([]);const[input,setInput]=useState('');const[busy,setBusy]=useState(false);const[status,setStatus]=useState('Pronto para iniciar');const[session,setSession]=useState(false);const[assessment,setAssessment]=useState<any>(null);const[ended,setEnded]=useState(false);const[assessing,setAssessing]=useState(false);
const [ajuda,setAjuda]=useState('');
const [carregandoAjuda,setCarregandoAjuda]=useState(false);
const [mostrarAjuda,setMostrarAjuda]=useState(false);
const [pacientesBanco, setPacientesBanco] = useState<PacienteBanco[]>([]);
const [startedAt,setStartedAt]=useState<number|null>(null);
const [agora,setAgora]=useState(Date.now());
const restante=startedAt===null?SESSION_MS:Math.max(0,SESSION_MS-(agora-startedAt));
const tempoEsgotado=Boolean(session&&startedAt!==null&&restante===0);
const sessaoEncerrada=ended||tempoEsgotado;
React.useEffect(()=>{
 const salvo=lerSessao(userId);if(!salvo)return;
 setStartedAt(salvo.startedAt);setMsgs(salvo.msgs);setSession(true);
 setEnded(salvo.ended||Date.now()-salvo.startedAt>=SESSION_MS);
 setStatus(salvo.ended?'Sessão encerrada.':Date.now()-salvo.startedAt>=SESSION_MS?'Tempo esgotado. Sessão encerrada.':'Sessão restaurada.');
 // Paciente escolhido será restaurado depois de carregar a lista do Supabase.
},[]);
React.useEffect(()=>{
 if(!session||startedAt===null)return;
 const atualizar=()=>setAgora(Date.now());atualizar();
 const intervalo=window.setInterval(atualizar,1000);
 const visibilidade=()=>atualizar();document.addEventListener('visibilitychange',visibilidade);
 return()=>{window.clearInterval(intervalo);document.removeEventListener('visibilitychange',visibilidade);};
},[session,startedAt]);
React.useEffect(()=>{
 if(session&&startedAt!==null){
 try{localStorage.setItem(chaveSessao(userId),JSON.stringify({chosenId:chosen.id,startedAt,ended:sessaoEncerrada,msgs}));}catch{}
 }
},[session,startedAt,chosen.id,sessaoEncerrada,msgs]);
React.useEffect(()=>{
 if(tempoEsgotado&&!ended){setEnded(true);setStatus('Os 30 minutos terminaram. Sessão encerrada. Solicite a avaliação.');setMostrarAjuda(false);}
},[tempoEsgotado,ended]);
const cases = pacientesBanco.length ? pacientesBanco.map(p => ({
 id:p.id, name:p.nome_ficticio, age:p.idade, topic:p.area || 'Caso clínico',
 background:`Paciente fictício ${p.nome_ficticio}, ${p.idade} anos. Área temática: ${p.area}. Revele sua história gradualmente.`
})) : casosDemonstracao;
React.useEffect(() => {
  buscarPacientes().then((pacientes) => {
    setPacientesBanco(pacientes);
    if(pacientes.length){const salvo=lerSessao(userId);const p=pacientes.find(p=>p.id===salvo?.chosenId)||pacientes[0];setChosen({id:p.id,name:p.nome_ficticio,age:p.idade,topic:p.area || 'Caso clínico',background:`Paciente fictício ${p.nome_ficticio}, ${p.idade} anos. Área temática: ${p.area}. Revele sua história gradualmente.`});}
    console.log('Pacientes carregados:', pacientes.length);
  });
}, []);
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
async function start(){if(session&&!ended&&!tempoEsgotado&&!window.confirm('Reiniciar a sessão atual? O histórico desta sessão será substituído.'))return;const { data: { session: authSession } } = await supabase.auth.getSession();

if (!authSession) {
  alert('Entre na sua conta para iniciar uma sessão.');
  return;
}

try {
  const resposta = await fetch('/.netlify/functions/iniciar-sessao', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authSession.access_token}`
    }
  });

  const resultado = await resposta.json();

  if (!resposta.ok || resultado.autorizado !== true) {
    alert(resultado.erro || 'Não foi possível iniciar a sessão.');
    return;
  }
} catch (erro) {
  alert('Falha ao verificar sua assinatura. Tente novamente.');
  return;
}const inicio=Date.now();setStartedAt(inicio);setAgora(inicio);setStatus('Sessão de treinamento iniciada.');setMsgs([{role:'assistant',content:aberturaPaciente(chosen.name,chosen.topic)}]);setAssessment(null);setEnded(false);setAjuda('');setMostrarAjuda(false);setSession(true)}
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
async function send(){
  if(!input.trim()||busy||!session||sessaoEncerrada)return;
  const mensagem=input.trim();
  const next:Msg[]=[...msgs,{role:'user',content:mensagem}];
  setMsgs(next);setInput('');setBusy(true);setStatus('Paciente elaborando resposta...');
  try{
    const response=await fetch('/.netlify/functions/gemini',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        paciente:{nome:chosen.name,idade:chosen.age,titulo:chosen.topic,historia:chosen.background},
        mensagens:next.map(m=>({papel:m.role==='assistant'?'paciente':'aluno',texto:m.content}))
      })
    });
    const data=await response.json().catch(()=>({}));
    if(!response.ok||typeof data.resposta!=='string'||!data.resposta.trim()){
      throw new Error(response.status===429?'Limite de uso do Gemini atingido. Tente novamente mais tarde.':data.error||`Erro HTTP ${response.status}`);
    }
    const reply=data.resposta.trim();
    if(Date.now()-Number(startedAt)>=SESSION_MS){setEnded(true);setStatus('Tempo esgotado. Sessão encerrada.');return;}
     setMsgs(v=>[...v,{role:'assistant',content:reply}]);
    setStatus('Resposta da paciente recebida.');setAjuda('');setMostrarAjuda(false);
  }catch(error){
    const detalhe=error instanceof Error?error.message:'Falha de conexão';
    setStatus(`A IA não respondeu: ${detalhe}. Sua mensagem permanece no histórico; tente novamente.`);
    // Não inventar resposta nem alternar silenciosamente para o modo narrativo.
    setMsgs(v=>v.filter((_,i)=>i!==next.length-1));
    setInput(mensagem);
  }finally{setBusy(false)}
}
async function pedirAjuda(){
  if(!session||sessaoEncerrada||busy||carregandoAjuda)return;
  if(mostrarAjuda){setMostrarAjuda(false);return;}
  setMostrarAjuda(true);
  if(ajuda)return;
  setCarregandoAjuda(true);
  try{
    const response=await fetch('/.netlify/functions/ajuda',{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        paciente:{nome:chosen.name,idade:chosen.age,titulo:chosen.topic},
        mensagens:msgs.map(m=>({papel:m.role==='assistant'?'paciente':'aluno',texto:m.content}))
      })
    });
    const data=await response.json().catch(()=>({}));
    if(!response.ok||typeof data.orientacao!=='string'||!data.orientacao.trim()){
      throw new Error(data.error||`Erro HTTP ${response.status}`);
    }
    setAjuda(data.orientacao.trim());
  }catch(error){
    setAjuda('Não foi possível carregar a orientação agora. Feche e abra a ajuda para tentar novamente.');
  }finally{setCarregandoAjuda(false)}
}
async function evaluate(){
 if(!session||busy||assessing||msgs.filter(m=>m.role==='user').length===0)return;
 setAssessing(true);setStatus('Analisando as intervenções da sessão...');
 try{
  const response=await fetch('/.netlify/functions/avaliacao',{
   method:'POST',headers:{'Content-Type':'application/json'},
   body:JSON.stringify({paciente:{nome:chosen.name,idade:chosen.age,titulo:chosen.topic},
    mensagens:msgs.map(m=>({papel:m.role==='assistant'?'paciente':'aluno',texto:m.content}))})
  });
  const data=await response.json().catch(()=>({}));
  if(!response.ok||!data.avaliacao||!Array.isArray(data.avaliacao.criterios))throw new Error(data.error||`Erro HTTP ${response.status}`);
  setAssessment(data.avaliacao);setStatus('Avaliação pedagógica disponível.');
 }catch(error){setStatus(`Não foi possível gerar a avaliação: ${error instanceof Error?error.message:'Falha de conexão'}. Tente novamente.`)}
 finally{setAssessing(false)}
}
function encerrarSessao(){
 if(!session||busy||assessing||sessaoEncerrada)return;
 if(!window.confirm('Deseja encerrar esta sessão? Não será possível enviar novas mensagens.'))return;
 setEnded(true);setAjuda('');setMostrarAjuda(false);setStatus('Sessão encerrada. Clique em “Analisar atendimento” para receber o relatório.');
}
function download(){
 if(!assessment)return;
 const texto=formatarRelatorio(assessment,chosen,msgs,new Date());
 const blob=new Blob(['\uFEFF',texto],{type:'text/plain;charset=utf-8'});
 const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;
 a.download=`diva-virtual-avaliacao-${chosen.name.toLowerCase().replace(/[^a-z0-9]/g,'-')}.txt`;
 document.body.appendChild(a);a.click();a.remove();window.setTimeout(()=>URL.revokeObjectURL(url),1000);
}
return <main><header><div className="logo">✦</div><div><div className="eyebrow">INSTITUTO SABER CONSCIENTE</div><h1>Divã Virtual <span>2.0</span></h1><p>Laboratório de Prática Clínica Simulada</p></div></header><div className="warning">Versão piloto de treinamento. Não utilize dados de pacientes reais. A avaliação exibida é apenas demonstrativa e não vale como nota acadêmica.</div><section className="layout"><aside className="panel"><h2>Seu treinamento</h2><p className="muted" style={{overflowWrap:"anywhere"}}>Conta: {email}</p><button type="button" onClick={()=>supabase.auth.signOut()} style={{marginBottom:12}}>Sair da conta</button><label>Caso clínico</label><select value={chosen.id} disabled={session} onChange={e=>setChosen(cases.find(c=>c.id===e.target.value) || cases[0])}>{cases.map(c=><option key={c.id} value={c.id}>{c.topic} — {c.name}</option>)}</select><p className="muted">Paciente fictício: {chosen.name}, {chosen.age} anos</p><p className="status">{status}</p>{session&&<div style={{margin:'12px 0',padding:14,border:'1px solid #cfa958',borderRadius:10,background:'#142b49'}}><div style={{fontWeight:700,color:'#e6bd67'}}>Tempo da sessão</div><div role="timer" aria-live="off" style={{fontSize:30,fontWeight:700,letterSpacing:2,color:restante<=5*60*1000?'#ffbf88':'#f1f5fb'}}>{formatarTempo(restante)}</div><small style={{color:'#cbd5e1'}}>{sessaoEncerrada?'Sessão encerrada':restante<=5*60*1000?'Atenção: faltam menos de 5 minutos.':'30 minutos corridos, sem pausa.'}</small></div>}<button className="gold" onClick={start}>{session?'Reiniciar sessão':'Iniciar sessão'}</button><div className="separator"/><h3>Privacidade</h3><p className="muted">As mensagens da simulação e os pedidos de ajuda são processados por IA. Não utilize dados de pessoas reais. O acesso exige conta cadastrada. Nesta versão de testes ainda não há validação de assinatura, créditos nem registro oficial de notas. O cronômetro funciona neste navegador e ainda não possui validação no servidor.</p></aside><section className="panel chat"><div className="chathead"><div><h2>Consultório simulado</h2><p className="muted">{chosen.name} · {chosen.topic}</p></div></div><div className="messages">{!session?<div className="empty">Escolha um caso e clique em “Iniciar sessão” para começar a prática.</div>:msgs.map((m,i)=><div className={'bubble '+(m.role==='user'?'mine':'patient')} key={i}><small>{m.role==='user'?'Terapeuta (aluno)':chosen.name}</small>{m.content}</div>)}{busy&&<p className="muted">Paciente elaborando resposta...</p>}</div><div className="composer"><textarea placeholder="Escreva sua intervenção clínica..." value={input} disabled={!session||sessaoEncerrada||busy} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send()}}}/><button className="gold" onClick={send} disabled={!session||sessaoEncerrada||busy||!input.trim()}>Enviar</button></div>{session&&!sessaoEncerrada&&<div style={{marginTop:12,marginBottom:12}}><button type="button" onClick={pedirAjuda} disabled={busy||carregandoAjuda} style={{border:'1px solid #cfa958',borderRadius:9,padding:'11px 16px',color:'#f1d18b',background:'#162d4b',cursor:'pointer'}}>💡 {carregandoAjuda?'Preparando orientação...':mostrarAjuda?'Fechar ajuda':'Preciso de ajuda'}</button>{mostrarAjuda&&<div style={{marginTop:12,padding:18,border:'1px solid #a98b51',borderRadius:12,background:'#142b49',color:'#f1f5fb',whiteSpace:'pre-wrap',lineHeight:1.65}}><strong style={{color:'#e6bd67'}}>Orientação ao aluno — não enviada à paciente</strong><div style={{marginTop:10}}>{carregandoAjuda?'Analisando o momento da conversa...':ajuda}</div></div>}</div>}<div className="footer"><div style={{display:"flex",gap:10,flexWrap:"wrap"}}><button onClick={encerrarSessao} disabled={!session||sessaoEncerrada||busy||assessing} style={{border:"1px solid #cfa958",color:"#e6bd67"}}>Encerrar sessão</button><button onClick={evaluate} disabled={!session||busy||assessing||msgs.filter(m=>m.role==='user').length===0}>{assessing?"Analisando...":"Analisar atendimento"}</button></div><span className="muted">Pressione Enter para enviar</span></div></section></section>{assessment&&<section className="panel result"><h2>Análise pedagógica do atendimento</h2><p className="warning">Avaliação formativa produzida por IA. As notas são estimativas justificadas, não uma avaliação clínica validada nem nota oficial.</p><div className="score">{Number(assessment.notaGeral||0).toFixed(1)} <small>/ 10</small></div><p style={{whiteSpace:'pre-wrap'}}>{assessment.resumo}</p><div className="metrics">{assessment.criterios.map((c:any,i:number)=><div key={i}><span>{c.nome}</span><strong>{Number(c.nota||0).toFixed(1)}</strong></div>)}</div>{assessment.criterios.map((c:any,i:number)=><div key={i} style={{marginTop:18,padding:16,background:'#142b49',borderRadius:10,border:'1px solid #35506b'}}><h3 style={{color:'#e6bd67'}}>{c.nome} — {Number(c.nota||0).toFixed(1)}/10</h3><p><strong>Por que recebeu essa nota:</strong> {c.justificativa}</p><p><strong>O que fez bem:</strong> {c.acerto}</p><p><strong>O que poderia melhorar:</strong> {c.melhoria}</p>{c.exemplo&&<p><strong>Exemplo de intervenção:</strong> “{c.exemplo}”</p>}</div>)}<h3 style={{marginTop:20}}>Próximos passos</h3><p style={{whiteSpace:'pre-wrap'}}>{assessment.proximosPassos}</p><button onClick={download}>Baixar relatório e transcrição (TXT)</button></section>}<footer>Instituto Saber Consciente · Protótipo educacional com pacientes fictícios · Não é atendimento clínico real</footer></main>}
function Acesso(){
 const [usuario,setUsuario]=useState<{id:string;email:string}|null>(null);
 const [verificando,setVerificando]=useState(true);
 const [modo,setModo]=useState<'entrar'|'cadastrar'|'recuperar'|'nova-senha'>('entrar');
 const [email,setEmail]=useState('');
 const [senha,setSenha]=useState('');
 const [aguardando,setAguardando]=useState(false);
 const [aviso,setAviso]=useState('');
 React.useEffect(()=>{
  let ativo=true;
  supabase.auth.getSession().then(({data,error})=>{
   if(!ativo)return;
   if(error)setAviso('Não foi possível verificar sua conta. Tente atualizar a página.');
   setUsuario(data.session?.user?{id:data.session.user.id,email:data.session.user.email||''}:null);
   setVerificando(false);
  }).catch(()=>{if(ativo){setAviso('Falha ao conectar ao serviço de login.');setVerificando(false);}});
  const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>{
   if(!ativo)return;
   if(_event==='PASSWORD_RECOVERY'){setModo('nova-senha');setUsuario(null);setAviso('Crie uma nova senha para sua conta.');return;}
   setUsuario(session?.user?{id:session.user.id,email:session.user.email||''}:null);
  });
  return()=>{ativo=false;subscription.unsubscribe();};
 },[]);
 async function enviar(e:React.FormEvent){
  e.preventDefault();if(aguardando)return;
  setAguardando(true);setAviso('');
  try{
   if(modo==='nova-senha'){
    const {error}=await supabase.auth.updateUser({password:senha});
    if(error)throw error;
    setAviso('Senha alterada. Você já pode acessar sua conta.');
    setModo('entrar');
    await supabase.auth.signOut();
   }else if(modo==='cadastrar'){
    const {data,error}=await supabase.auth.signUp({email:email.trim(),password:senha,options:{emailRedirectTo:window.location.origin}});
    if(error)throw error;
    setAviso(data.session?'Cadastro realizado.':'Cadastro solicitado! Confira seu e-mail e clique no link de confirmação. Depois volte para entrar.');
    if(!data.session)setModo('entrar');
   }else if(modo==='recuperar'){
    const {error}=await supabase.auth.resetPasswordForEmail(email.trim(),{redirectTo:window.location.origin});
    if(error)throw error;
    setAviso('Se o e-mail estiver cadastrado, você receberá as instruções para recuperar a senha.');
   }else{
    const {error}=await supabase.auth.signInWithPassword({email:email.trim(),password:senha});
    if(error)throw error;
   }
  }catch(err){
   const msg=err instanceof Error?err.message:'Erro desconhecido';
   setAviso(msg.includes('Invalid login credentials')?'E-mail ou senha incorretos.':msg.includes('Email not confirmed')?'Confirme o e-mail antes de entrar.':msg);
  }finally{setAguardando(false);}
 }
 if(verificando)return <main><header><div className="logo">✦</div><div><div className="eyebrow">INSTITUTO SABER CONSCIENTE</div><h1>Divã Virtual</h1></div></header><section className="panel" style={{maxWidth:500,margin:'32px auto'}}>Verificando acesso...</section></main>;
 if(usuario)return <App key={usuario.id} userId={usuario.id} email={usuario.email}/>;
 return <main><header><div className="logo">✦</div><div><div className="eyebrow">INSTITUTO SABER CONSCIENTE</div><h1>Divã Virtual <span>2.0</span></h1><p>Laboratório de Prática Clínica Simulada</p></div></header>
 <section className="panel" style={{maxWidth:480,margin:'42px auto',padding:28}}>
 <h2>{modo==='entrar'?'Acessar minha conta':modo==='cadastrar'?'Criar minha conta':modo==='nova-senha'?'Definir nova senha':'Recuperar senha'}</h2>
 <p className="muted">Use seu e-mail para acessar o ambiente de treinamento.</p>
 <form onSubmit={enviar} style={{display:'grid',gap:14,marginTop:22}}>
 {modo!=='nova-senha'&&<><label htmlFor="email-acesso">E-mail</label><input id="email-acesso" type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)} style={{width:'100%',boxSizing:'border-box',padding:12,borderRadius:8}}/></>}
 {modo!=='recuperar'&&<><label htmlFor="senha-acesso">Senha (mínimo de 8 caracteres)</label><input id="senha-acesso" type="password" autoComplete={modo==='cadastrar'||modo==='nova-senha'?'new-password':'current-password'} minLength={modo==='cadastrar'||modo==='nova-senha'?8:1} required value={senha} onChange={e=>setSenha(e.target.value)} style={{width:'100%',boxSizing:'border-box',padding:12,borderRadius:8}}/></>}
 <button className="gold" type="submit" disabled={aguardando}>{aguardando?'Aguarde...':modo==='entrar'?'Entrar':modo==='cadastrar'?'Cadastrar':modo==='nova-senha'?'Salvar nova senha':'Enviar instruções'}</button>
 </form>
 {aviso&&<p role="status" style={{marginTop:16,whiteSpace:'pre-wrap'}}>{aviso}</p>}
 <div style={{display:'flex',flexWrap:'wrap',gap:12,marginTop:20}}>
 {modo!=='entrar'&&modo!=='nova-senha'&&<button type="button" onClick={()=>{setModo('entrar');setAviso('')}}>Já tenho conta</button>}
 {modo!=='cadastrar'&&modo!=='nova-senha'&&<button type="button" onClick={()=>{setModo('cadastrar');setAviso('')}}>Criar conta</button>}
 {modo!=='recuperar'&&modo!=='nova-senha'&&<button type="button" onClick={()=>{setModo('recuperar');setAviso('')}}>Esqueci minha senha</button>}
 </div><p className="muted" style={{marginTop:22}}>Versão de testes. O cadastro ainda não verifica pagamentos da Hotmart nem limita sessões por plano.</p>
 </section><footer>Instituto Saber Consciente · Ambiente de simulação educacional</footer></main>;
}
createRoot(document.getElementById('root')!).render(<Acesso/>);
