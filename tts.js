// api/tts.js — Proxy ElevenLabs para Sueños Inmobiliarios
// La clave vive en Vercel como variable de entorno: ELEVENLABS_API_KEY
// El navegador NUNCA ve la clave. Solo recibe el audio MP3.

export const config = { runtime: 'edge' };   // Edge Function: mínima latencia

const VOICE_ID  = 'EXAVITQu4vr4xnSDxMaL';  // Sarah — Perfil 2 (Asesora Energética)
const MODEL     = 'eleven_multilingual_v2';
const SETTINGS  = {
  stability:         0.48,
  similarity_boost:  0.82,
  style:             0.35,
  use_speaker_boost: true
};

// Orígenes permitidos — agrega tu dominio de Vercel y cualquier dominio custom
const ALLOWED_ORIGINS = [
  'https://suenos-inmobiliarios.vercel.app',   // ← reemplaza con tu dominio Vercel
  'https://www.suenosinmobiliarios.com',       // ← tu dominio custom (si tienes)
  'http://localhost:3000',                      // para desarrollo local
  'http://127.0.0.1:5500'                       // Live Server VS Code
];

export default async function handler(req) {

  const origin = req.headers.get('origin') || '';

  // CORS: solo desde tus dominios
  const corsHeaders = {
    'Access-Control-Allow-Origin':  ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin'
  };

  // Preflight
  if(req.method === 'OPTIONS'){
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // Solo POST
  if(req.method !== 'POST'){
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
  }

  // Leer texto del body
  let text = '';
  try {
    const body = await req.json();
    text = (body.text || '').trim();
  } catch(e) {
    return new Response('Bad Request', { status: 400, headers: corsHeaders });
  }

  if(!text || text.length > 3000){
    return new Response('Invalid text', { status: 422, headers: corsHeaders });
  }

  // Clave desde variable de entorno (NUNCA desde el cliente)
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if(!apiKey){
    return new Response('Server misconfiguration', { status: 500, headers: corsHeaders });
  }

  // Llamada a ElevenLabs desde el servidor
  const elResp = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}/stream`,
    {
      method:  'POST',
      headers: {
        'xi-api-key':   apiKey,
        'Content-Type': 'application/json',
        'Accept':       'audio/mpeg'
      },
      body: JSON.stringify({
        text,
        model_id:       MODEL,
        voice_settings: SETTINGS
      })
    }
  );

  if(!elResp.ok){
    const err = await elResp.text();
    console.error('ElevenLabs error:', elResp.status, err);
    return new Response('TTS service error', { status: 502, headers: corsHeaders });
  }

  // Devolver el stream de audio directamente al navegador
  return new Response(elResp.body, {
    status:  200,
    headers: {
      ...corsHeaders,
      'Content-Type':  'audio/mpeg',
      'Cache-Control': 'no-store'
    }
  });
}

