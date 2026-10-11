import { supabase } from './supabase'

// ─── AUTH ────────────────────────────────────────────────────────────────────

export async function signUp(email, password, name, age) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name, age } },
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
// ─── EDAD, COMPATIBILIDAD Y TESTS EXTRA ─────────────────────────────────────
// Ajustes rápidos (se pueden cambiar sin tocar el resto):
export const YOUNG_MAX_AGE      = 30    // hasta esta edad se considera "joven"
export const COMPAT_THRESHOLD   = 70    // % mínimo para considerar que hay compatibilidad
export const MIN_EXTRA_TESTS    = 3     // mínimo de preguntas antes de dar un veredicto
export const MAX_EXTRA_TESTS    = 6     // tope de preguntas por persona cercana
export const EXTRA_TEST_WEIGHT  = 0.25  // cuánto pesa cada respuesta nueva en tu perfil
const AGE_FREE_GAP   = 3                // diferencia de edad sin penalización (años)
const AGE_PENALTY    = 8                // puntos que resta cada año extra de diferencia
const AGE_WEIGHT     = 0.15             // peso de la edad en la compatibilidad total

export const TRAIT_KEY = { O:'ocean_o', C:'ocean_c', E:'ocean_e', A:'ocean_a', N:'ocean_n' }

export function getAgeGroup(age) {
  const n = Number(age)
  return n && n > YOUNG_MAX_AGE ? 'general' : 'joven'
}

// Solo usa el banco "joven" si las dos personas son jóvenes
export function getPairGroup(profileA, profileB) {
  return getAgeGroup(profileA?.age) === 'joven' && getAgeGroup(profileB?.age) === 'joven'
    ? 'joven'
    : 'general'
}

// Compatibilidad 0–100: similitud de personalidad (OCEAN) + cercanía de edad.
// Devuelve null si no hay datos de personalidad de alguna de las dos personas.
export function getCompatibility(a, b) {
  if (!a || !b) return null
  const diffs = Object.values(TRAIT_KEY)
    .map(k => (a[k] != null && b[k] != null ? Math.abs(a[k] - b[k]) : null))
    .filter(d => d !== null)
  if (diffs.length === 0) return null

  const personality = 100 - diffs.reduce((s, d) => s + d, 0) / diffs.length
  const gap = a.age && b.age ? Math.abs(a.age - b.age) : null
  const ageScore = gap === null
    ? personality
    : Math.max(0, 100 - Math.max(0, gap - AGE_FREE_GAP) * AGE_PENALTY)

  return Math.round(personality * (1 - AGE_WEIGHT) + ageScore * AGE_WEIGHT)
}

// Tests extra. Cada opción trae un puntaje 0–100 para el rasgo de la pregunta.
// (N alto = más neuroticismo.)
export const EXTRA_TESTS_JOVEN = [
  { id:"J1", trait:"O", question:"¿Qué prefieres hacer en tu tiempo libre?", options:[
    { label:"🎮 Lo de siempre, que me relaja", score:30 },
    { label:"🎧 Un poco de cada cosa", score:55 },
    { label:"🧭 Probar algo que nunca he hecho", score:85 } ] },
  { id:"J2", trait:"O", question:"Te ofrecen irte un año a otra ciudad o país. ¿Qué haces?", options:[
    { label:"🏠 Me quedo, aquí estoy bien", score:25 },
    { label:"🤔 Lo pienso mucho y quizás", score:55 },
    { label:"✈️ Voy, aunque dé susto", score:90 } ] },
  { id:"J3", trait:"C", question:"Tienes una entrega o examen en una semana. ¿Cómo lo manejas?", options:[
    { label:"⏰ Lo dejo para el día anterior", score:25 },
    { label:"🎢 Depende de mi ánimo", score:50 },
    { label:"📅 Avanzo un poco cada día", score:85 } ] },
  { id:"J4", trait:"C", question:"¿Cómo manejas tus gastos del mes?", options:[
    { label:"🛍️ Vivo el momento y veo a fin de mes", score:20 },
    { label:"🧮 Más o menos los controlo", score:55 },
    { label:"📊 Tengo presupuesto y anoto todo", score:90 } ] },
  { id:"J5", trait:"E", question:"Un sábado en la noche, ¿qué te recarga más?", options:[
    { label:"🛋️ Serie y tranquilidad en casa", score:20 },
    { label:"🍕 Una junta chica con amigos cercanos", score:55 },
    { label:"🎉 Salir donde haya mucha gente", score:90 } ] },
  { id:"J6", trait:"E", question:"En un grupo nuevo (curso, trabajo, equipo), ¿cómo te integras?", options:[
    { label:"👂 Observo mucho antes de hablar", score:25 },
    { label:"🙂 Hablo cuando hay confianza", score:55 },
    { label:"🙋 Soy de los primeros en conversar", score:85 } ] },
  { id:"J7", trait:"A", question:"Un amigo te pide ayuda justo cuando estás muy cargado/a. ¿Qué haces?", options:[
    { label:"⏳ Le digo que ahora no puedo", score:35 },
    { label:"💬 Busco un punto medio", score:65 },
    { label:"🤝 Lo ayudo y ordeno mis cosas después", score:85 } ] },
  { id:"J8", trait:"A", question:"Alguien con quien chateas opina algo que te cae mal. ¿Qué haces?", options:[
    { label:"🚪 Dejo de responderle", score:25 },
    { label:"🗣️ Le explico lo que pienso", score:60 },
    { label:"🧠 Intento entender de dónde viene", score:85 } ] },
  { id:"J9", trait:"N", question:"Mandas un mensaje importante y no te responden por horas. ¿Cómo te sientes?", options:[
    { label:"😌 Tranquilo/a, ya responderá", score:20 },
    { label:"😬 Me empieza a dar vueltas", score:60 },
    { label:"😰 Imagino lo peor", score:85 } ] },
  { id:"J10", trait:"N", question:"Algo te sale mal frente a otras personas. ¿Qué pasa después?", options:[
    { label:"🙃 Lo olvido rápido", score:20 },
    { label:"🔁 Lo repaso un rato", score:55 },
    { label:"🌧️ Me queda dando vueltas varios días", score:85 } ] },
]

export const EXTRA_TESTS_GENERAL = [
  { id:"G1", trait:"O", question:"¿Cómo eliges lo que haces en tu tiempo libre?", options:[
    { label:"🛋️ Mis actividades de siempre", score:30 },
    { label:"🎨 Alterno rutina y novedades", score:55 },
    { label:"🌍 Busco experiencias nuevas", score:85 } ] },
  { id:"G2", trait:"O", question:"Cuando alguien piensa muy distinto a ti, ¿qué sueles hacer?", options:[
    { label:"🧱 Prefiero evitar el tema", score:25 },
    { label:"🙂 Escucho, pero mantengo lo mío", score:55 },
    { label:"🔍 Me da curiosidad y pregunto más", score:90 } ] },
  { id:"G3", trait:"C", question:"¿Cómo organizas tu semana?", options:[
    { label:"🌀 Voy resolviendo sobre la marcha", score:25 },
    { label:"📝 Tengo lo importante anotado", score:65 },
    { label:"🗓️ Agenda y planificación detallada", score:90 } ] },
  { id:"G4", trait:"C", question:"Tienes una meta de largo plazo (ahorro, proyecto, hábito). ¿Cómo avanzas?", options:[
    { label:"⚡ Por impulsos", score:25 },
    { label:"🐢 Constante, aunque lento", score:80 },
    { label:"🎯 Con metas y revisiones periódicas", score:92 } ] },
  { id:"G5", trait:"E", question:"Después de una semana larga, ¿qué te reconforta más?", options:[
    { label:"🏡 Tiempo a solas o en familia", score:25 },
    { label:"☕ Un plan tranquilo con pocas personas", score:55 },
    { label:"🥂 Juntarme con mucha gente", score:88 } ] },
  { id:"G6", trait:"E", question:"En una reunión social donde conoces a pocos, ¿qué haces?", options:[
    { label:"🪑 Me quedo con quienes ya conozco", score:25 },
    { label:"🙂 Converso con quien se acerque", score:55 },
    { label:"🤝 Me presento con varias personas", score:88 } ] },
  { id:"G7", trait:"A", question:"Un compañero comete un error que te afecta. ¿Cómo reaccionas?", options:[
    { label:"😤 Le marco claramente la falla", score:30 },
    { label:"🫂 Lo dejo pasar para no incomodar", score:60 },
    { label:"🗣️ Converso y busco una solución", score:82 } ] },
  { id:"G8", trait:"A", question:"Alguien cercano te pide un favor grande. ¿Qué haces?", options:[
    { label:"🙅 Prefiero poner límites", score:30 },
    { label:"📆 Evalúo si realmente puedo", score:50 },
    { label:"🤲 Lo ayudo aunque me complique", score:88 } ] },
  { id:"G9", trait:"N", question:"Cuando tienes una preocupación importante, ¿cómo va tu cabeza?", options:[
    { label:"🧘 Sigo con mi día sin problema", score:20 },
    { label:"🌀 Me ronda, pero lo manejo", score:55 },
    { label:"🌪️ Me cuesta pensar en otra cosa", score:85 } ] },
  { id:"G10", trait:"N", question:"Ante cambios inesperados (trabajo, planes, rutina)…", options:[
    { label:"🌊 Me adapto con facilidad", score:20 },
    { label:"⚖️ Me incomoda, pero me acomodo", score:55 },
    { label:"😟 Me estresa bastante", score:85 } ] },
]

// Elige la siguiente pregunta no respondida, priorizando el rasgo donde
// ustedes dos más se diferencian (es donde hace falta más información).
export function nextExtraTest(group, answeredIds, me, other) {
  const bank = (group === 'joven' ? EXTRA_TESTS_JOVEN : EXTRA_TESTS_GENERAL)
    .filter(q => !answeredIds.includes(q.id))
  if (bank.length === 0) return null
  const diffOf = t => Math.abs((me?.[TRAIT_KEY[t]] ?? 50) - (other?.[TRAIT_KEY[t]] ?? 50))
  return [...bank].sort((a, b) => diffOf(b.trait) - diffOf(a.trait))[0]
}

// Mezcla tu puntaje actual del rasgo con la respuesta nueva
export function refineTrait(current, score) {
  return Math.round((current ?? 50) * (1 - EXTRA_TEST_WEIGHT) + score * EXTRA_TEST_WEIGHT)
}

// ─── BANCO DE TEMAS ──────────────────────────────────────────────────────────
// Organizado por rasgo OCEAN dominante.
// Pensado para un público joven (aprox. 18–30 años): temas de la vida actual
// como estudios/primer trabajo, independizarse, redes, IA, amistades y futuro.
// Se usa cuando AMBAS personas tienen 30 años o menos (ver getPairGroup).
// El algoritmo detecta qué rasgo tiene mayor diferencia o similitud y elige el grupo.

export const TOPIC_BANK_JOVEN = {
  // Apertura a la experiencia — curiosidad, creatividad, ideas
  O: [
    { id:"O1", type:"pregunta",       text:"¿Qué cosa te obsesionó de la nada y terminó siendo parte de quién sos?" },
    { id:"O2", type:"pregunta",       text:"¿Cuál es el rabbit hole de internet en el que más te has perdido?" },
    { id:"O3", type:"esto_o_aquello", text:"¿Irte un año a vivir a otro país sin plan — o quedarte construyendo algo acá?" },
    { id:"O4", type:"esto_o_aquello", text:"¿Descubrir música nueva cada semana — o escuchar por décima vez tu playlist favorita?" },
    { id:"O5", type:"cuentame",       text:"Contame de algo que pensabas que \"no era para vos\" y terminó encantándote." },
    { id:"O6", type:"debate",         text:"¿La IA nos va a volver más creativos o más flojos?" },
    { id:"O7", type:"debate",         text:"¿Es mejor probar de todo a los veinte o encontrar tu vocación lo antes posible?" },
  ],
  // Consciencia — orden, metas, disciplina
  C: [
    { id:"C1", type:"pregunta",       text:"¿Tenés un sistema (notas, calendario, listas) que a los demás les parece exagerado o caótico?" },
    { id:"C2", type:"pregunta",       text:"¿Cuál fue el último hábito que lograste cambiar de verdad y qué te ayudó?" },
    { id:"C3", type:"esto_o_aquello", text:"¿Planificar cada detalle de un viaje — o llegar y ver qué pasa?" },
    { id:"C4", type:"esto_o_aquello", text:"¿Entregar todo antes de la fecha — o rendir mejor con la presión de último minuto?" },
    { id:"C5", type:"cuentame",       text:"Contame de una meta o proyecto que fuiste armando de a poco y del que estés orgulloso." },
    { id:"C6", type:"debate",         text:"¿Se puede tener una vida ordenada y espontánea a la vez, o hay que elegir?" },
    { id:"C7", type:"debate",         text:"¿Descansar sin culpa es un lujo o una necesidad en esta etapa de la vida?" },
  ],
  // Extraversión — energía social, conexión, presencia
  E: [
    { id:"E1", type:"pregunta",       text:"¿Cómo recargás energía después de una semana muy social o muy cargada?" },
    { id:"E2", type:"pregunta",       text:"¿Cómo se ve tu plan perfecto para un sábado en la noche?" },
    { id:"E3", type:"esto_o_aquello", text:"¿Fiesta con mucha gente — o una junta chica con tus personas de siempre?" },
    { id:"E4", type:"esto_o_aquello", text:"¿Mensaje de texto — o nota de voz / llamada?" },
    { id:"E5", type:"cuentame",       text:"Contame de una conversación con alguien que recién conocías y que te haya marcado." },
    { id:"E6", type:"debate",         text:"¿Se puede mantener una amistad solo por chat y redes, o hace falta verse?" },
    { id:"E7", type:"debate",         text:"¿Es más difícil hacer amigos nuevos después de los veinte?" },
  ],
  // Amabilidad — confianza, empatía, cooperación
  A: [
    { id:"A1", type:"pregunta",       text:"¿Cómo sabés que ya confiás de verdad en alguien?" },
    { id:"A2", type:"pregunta",       text:"¿Qué es lo que más valorás de un amigo cercano?" },
    { id:"A3", type:"esto_o_aquello", text:"¿Decirle una verdad incómoda a un amigo — o dejar que la descubra solo?" },
    { id:"A4", type:"esto_o_aquello", text:"¿Hablar de frente un conflicto — o dejar que se enfríe solo?" },
    { id:"A5", type:"cuentame",       text:"Contame de alguien que te haya sorprendido con un gesto generoso." },
    { id:"A6", type:"debate",         text:"¿Dejar de responderle a alguien (ghosting) puede ser a veces lo más sano?" },
    { id:"A7", type:"debate",         text:"¿Se puede ser genuinamente altruista o siempre hay algo personal detrás?" },
  ],
  // Neuroticismo — emociones, estabilidad, procesamiento interno
  N: [
    { id:"N1", type:"pregunta",       text:"¿Qué hacés cuando necesitás procesar algo difícil?" },
    { id:"N2", type:"pregunta",       text:"¿Qué es lo que más te inquieta de los próximos cinco años de tu vida?" },
    { id:"N3", type:"esto_o_aquello", text:"¿Hablar de lo que sentís apenas lo sentís — o esperar a tenerlo más claro?" },
    { id:"N4", type:"esto_o_aquello", text:"¿Desconectarte del celular un fin de semana — o seguir al día con todo y con todos?" },
    { id:"N5", type:"cuentame",       text:"Contame de un momento donde el miedo te frenó de hacer algo que querías." },
    { id:"N6", type:"debate",         text:"¿Las redes sociales nos hacen compararnos de más o también nos inspiran?" },
    { id:"N7", type:"debate",         text:"¿La ansiedad es una debilidad o una señal de que algo te importa?" },
  ],
}

// Banco general: preguntas más amplias, para cuando alguna de las dos personas
// tiene más de 30 años o se mezclan edades distintas.
export const TOPIC_BANK_GENERAL = {
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

// Alias por compatibilidad con código anterior
export const TOPIC_BANK = TOPIC_BANK_JOVEN

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
  // Banco según edades: joven si ambas personas tienen 30 o menos
  const group = getPairGroup(profileA, profileB)
  const bank  = group === 'joven' ? TOPIC_BANK_JOVEN : TOPIC_BANK_GENERAL
  const pool  = [...bank[dominantTrait]].sort(() => Math.random() - 0.5)
  return { trait: dominantTrait, topics: pool.slice(0, 3), group }
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