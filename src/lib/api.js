import { supabase } from './supabase'

// ─── AUTH ────────────────────────────────────────────────────────────────────

export async function signUp(email, password, name) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name } },
  })
  if (error) throw error
  return data
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function getSession() {
  const { data } = await supabase.auth.getSession()
  return data.session
}

// ─── PERFIL ──────────────────────────────────────────────────────────────────

export async function getProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  if (error && error.code !== 'PGRST116') throw error
  return data
}

export async function upsertProfile(userId, fields) {
  const { data, error } = await supabase
    .from('profiles')
    .upsert({ id: userId, ...fields, updated_at: new Date().toISOString() })
    .select()
    .single()
  if (error) throw error
  return data
}

// ─── FOTO DE PERFIL ──────────────────────────────────────────────────────────

export async function uploadPhoto(userId, file) {
  const ext = file.name.split('.').pop()
  const path = `${userId}/avatar.${ext}`

  const { error: upErr } = await supabase.storage
    .from('avatars')
    .upload(path, file, { upsert: true })
  if (upErr) throw upErr

  const { data } = supabase.storage.from('avatars').getPublicUrl(path)
  return data.publicUrl
}

// ─── ONBOARDING ──────────────────────────────────────────────────────────────

export async function saveAnswers(userId, answers) {
  const { error } = await supabase
    .from('onboarding_answers')
    .upsert({ user_id: userId, answers, updated_at: new Date().toISOString() })
  if (error) throw error
}

// ─── DESCUBRIMIENTO ──────────────────────────────────────────────────────────
// Devuelve perfiles cercanos (si tienen lat/lng) excluyendo al usuario actual

export async function getNearbyProfiles(userId, lat, lng, radiusKm = 50) {
  // Si hay coordenadas usamos la función RPC con PostGIS
  if (lat && lng) {
    const { data, error } = await supabase.rpc('nearby_profiles', {
      user_id: userId,
      user_lat: lat,
      user_lng: lng,
      radius_km: radiusKm,
    })
    if (error) throw error
    return data
  }

  // Fallback: todos los perfiles excepto el propio
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .neq('id', userId)
    .limit(20)
  if (error) throw error
  return data
}

// ─── MATCH / LIKE ────────────────────────────────────────────────────────────

export async function sendLike(fromId, toId) {
  const { error } = await supabase
    .from('likes')
    .upsert({ from_id: fromId, to_id: toId })
  if (error) throw error

  // ¿Hay like mutuo? → crear match
  const { data: mutual } = await supabase
    .from('likes')
    .select('id')
    .eq('from_id', toId)
    .eq('to_id', fromId)
    .single()

  if (mutual) {
    await supabase.from('matches').upsert({
      user_a: fromId < toId ? fromId : toId,
      user_b: fromId < toId ? toId : fromId,
    })
    return { matched: true }
  }
  return { matched: false }
}

export async function getMatches(userId) {
  const { data, error } = await supabase
    .from('matches')
    .select(`
      *,
      profile_a:profiles!matches_user_a_fkey(*),
      profile_b:profiles!matches_user_b_fkey(*)
    `)
    .or(`user_a.eq.${userId},user_b.eq.${userId}`)
  if (error) throw error

  return data.map(m => ({
    matchId: m.id,
    profile: m.user_a === userId ? m.profile_b : m.profile_a,
    createdAt: m.created_at,
  }))
}

// ─── MENSAJES ────────────────────────────────────────────────────────────────

export async function getMessages(matchId) {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('match_id', matchId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}

export async function sendMessage(matchId, senderId, text) {
  const { data, error } = await supabase
    .from('messages')
    .insert({ match_id: matchId, sender_id: senderId, text })
    .select()
    .single()
  if (error) throw error
  return data
}

export function subscribeToMessages(matchId, callback) {
  return supabase
    .channel(`messages:${matchId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: `match_id=eq.${matchId}`,
    }, payload => callback(payload.new))
    .subscribe()
}
// ─── BANCO DE TEMAS ──────────────────────────────────────────────────────────
// Organizado por rasgo OCEAN dominante.
// El algoritmo detecta qué rasgo tiene mayor diferencia o similitud y elige el grupo.

export const TOPIC_BANK = {
  // Apertura a la experiencia — curiosidad, creatividad, ideas
  O: [
    { id:"O1", type:"pregunta",       text:"¿Cuál es la idea más rara en la que has creído genuinamente?" },
    { id:"O2", type:"pregunta",       text:"¿Alguna vez algo que odiabas se convirtió en algo que amas?" },
    { id:"O3", type:"esto_o_aquello", text:"¿Explorar un lugar nuevo — o dominar uno que ya conoces?" },
    { id:"O4", type:"cuentame",       text:"Contame de un momento donde algo te cambió la forma de ver el mundo." },
    { id:"O5", type:"debate",         text:"¿Es mejor ser experto en una cosa o saber un poco de todo?" },
  ],
  // Consciencia — orden, metas, disciplina
  C: [
    { id:"C1", type:"pregunta",       text:"¿Tenés un sistema para algo que a los demás les parece caótico?" },
    { id:"C2", type:"pregunta",       text:"¿Cuándo fue la última vez que cambiaste completamente un hábito?" },
    { id:"C3", type:"esto_o_aquello", text:"¿Plan perfecto ejecutado a medias — o plan imperfecto terminado?" },
    { id:"C4", type:"cuentame",       text:"Contame de algo que construiste poco a poco y de lo que estés orgulloso." },
    { id:"C5", type:"debate",         text:"¿La disciplina se aprende o es algo con lo que nacés?" },
  ],
  // Extraversión — energía social, conexión, presencia
  E: [
    { id:"E1", type:"pregunta",       text:"¿Cómo recargás energía después de un día muy intenso socialmente?" },
    { id:"E2", type:"pregunta",       text:"¿Cuál es tu versión favorita de vos mismo — solo o con gente?" },
    { id:"E3", type:"esto_o_aquello", text:"¿Cena con cinco amigos cercanos — o una fiesta con desconocidos interesantes?" },
    { id:"E4", type:"cuentame",       text:"Contame de una conversación con un extraño que te haya marcado." },
    { id:"E5", type:"debate",         text:"¿El silencio en una relación es señal de confianza o de distancia?" },
  ],
  // Amabilidad — confianza, empatía, cooperación
  A: [
    { id:"A1", type:"pregunta",       text:"¿Cómo sabés cuándo realmente confiás en alguien?" },
    { id:"A2", type:"pregunta",       text:"¿Alguna vez pusiste los límites de otro por encima de los tuyos?" },
    { id:"A3", type:"esto_o_aquello", text:"¿Decir una verdad que duele — o una mentira que protege?" },
    { id:"A4", type:"cuentame",       text:"Contame de alguien que te haya sorprendido por su generosidad." },
    { id:"A5", type:"debate",         text:"¿Se puede ser genuinamente altruista o siempre hay algo personal detrás?" },
  ],
  // Neuroticismo — emociones, estabilidad, procesamiento interno
  N: [
    { id:"N1", type:"pregunta",       text:"¿Qué hacés cuando necesitás procesar algo difícil?" },
    { id:"N2", type:"pregunta",       text:"¿Hay algo que te preocupa más de lo que le contás a la gente?" },
    { id:"N3", type:"esto_o_aquello", text:"¿Sentir mucho y a veces explotar — o sentir poco y mantener la calma?" },
    { id:"N4", type:"cuentame",       text:"Contame de un momento donde el miedo te impidió hacer algo que querías." },
    { id:"N5", type:"debate",         text:"¿La ansiedad es una debilidad o una señal de que algo importa?" },
  ],
}

// Íconos por tipo de tema
export const TOPIC_TYPE_META = {
  pregunta:       { icon:"🎯", label:"Pregunta profunda" },
  esto_o_aquello: { icon:"🎲", label:"Esto o aquello" },
  cuentame:       { icon:"📖", label:"Cuéntame algo" },
  debate:         { icon:"🤝", label:"Debate amigable" },
}

// Algoritmo: detecta el rasgo con mayor diferencia entre dos perfiles
// y devuelve 3 temas aleatorios de ese grupo para que el usuario elija
export function selectTopics(profileA, profileB) {
  const traits = ['O','C','E','A','N']
  const keys   = { O:'ocean_o', C:'ocean_c', E:'ocean_e', A:'ocean_a', N:'ocean_n' }

  // Calcular diferencia absoluta por rasgo (si no hay scores, diferencia 0)
  const diffs = traits.map(t => ({
    trait: t,
    diff: Math.abs((profileA[keys[t]] || 50) - (profileB[keys[t]] || 50)),
  }))

  // Ordenar por mayor diferencia → ese rasgo genera la conversación más interesante
  diffs.sort((a, b) => b.diff - a.diff)
  const dominantTrait = diffs[0].trait

  // Mezclar y devolver 3 temas del rasgo dominante
  const pool = [...TOPIC_BANK[dominantTrait]].sort(() => Math.random() - 0.5)
  return { trait: dominantTrait, topics: pool.slice(0, 3) }
}

// ─── PROPUESTAS DE TEMAS ─────────────────────────────────────────────────────

export async function proposeTopic(matchId, proposedBy, topic, trait) {
  const { data, error } = await supabase
    .from('topic_proposals')
    .insert({
      match_id:    matchId,
      proposed_by: proposedBy,
      topic_id:    topic.id,
      topic_text:  topic.text,
      topic_type:  topic.type,
      ocean_trait: trait,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function respondToProposal(proposalId, accept) {
  const { data, error } = await supabase
    .from('topic_proposals')
    .update({
      status:       accept ? 'accepted' : 'rejected',
      responded_at: new Date().toISOString(),
    })
    .eq('id', proposalId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getPendingProposal(matchId) {
  const { data, error } = await supabase
    .from('topic_proposals')
    .select('*')
    .eq('match_id', matchId)
    .eq('status', 'pending')
    .maybeSingle()
  if (error) throw error
  return data
}

export function subscribeToProposals(matchId, callback) {
  return supabase
    .channel(`proposals:${matchId}`)
    .on('postgres_changes', {
      event:  '*',
      schema: 'public',
      table:  'topic_proposals',
      filter: `match_id=eq.${matchId}`,
    }, payload => callback(payload.new))
    .subscribe()
}
