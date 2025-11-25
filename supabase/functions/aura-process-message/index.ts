import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { GoogleGenerativeAI } from "npm:@google/generative-ai@^0.2.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const geminiKey = Deno.env.get("GEMINI_API_KEY")!;

    if (!supabaseUrl || !supabaseKey || !geminiKey) {
      throw new Error("Missing environment variables");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const genAI = new GoogleGenerativeAI(geminiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro-latest" });

    const { message } = await req.json();

    if (!message) {
      return new Response(
        JSON.stringify({ reply: "Por favor, envía un mensaje." }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // ------------------------------------------------------------------
    // 1. Obtener usuario de sesión (auth)
    // ------------------------------------------------------------------
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ reply: "No estás autenticado. Por favor, inicia sesión." }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ reply: "Error de autenticación. Por favor, inicia sesión nuevamente." }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // ------------------------------------------------------------------
    // 2. Obtener datos del usuario para contexto
    // ------------------------------------------------------------------
    const { data: perfil } = await supabase
      .from("usuarios")
      .select("nombre, correo")
      .eq("id", user.id)
      .single();

    const { data: tareas } = await supabase
      .from("tareas")
      .select("titulo, fecha_limite, completada")
      .eq("usuario_id", user.id)
      .eq("completada", false)
      .order("fecha_limite", { ascending: true })
      .limit(10);

    const { data: reservas } = await supabase
      .from("reservas")
      .select("fecha, hora_inicio, hora_fin, sala_nombre")
      .eq("usuario_id", user.id)
      .gte("fecha", new Date().toISOString().split("T")[0])
      .order("fecha", { ascending: true })
      .order("hora_inicio", { ascending: true })
      .limit(5);

    // ------------------------------------------------------------------
    // 3. Construir contexto para Gemini
    // ------------------------------------------------------------------
    const contexto = `
Usuario: ${perfil?.nombre || "Usuario"}
Tareas pendientes: ${tareas?.length || 0}
${tareas && tareas.length > 0 ? `Tareas: ${tareas.map((t) => `- ${t.titulo} (${t.fecha_limite})`).join("\n")}` : ""}
Reservas próximas: ${reservas?.length || 0}
${reservas && reservas.length > 0 ? `Reservas: ${reservas.map((r) => `- ${r.sala_nombre || "Sala"} el ${r.fecha} de ${r.hora_inicio} a ${r.hora_fin}`).join("\n")}` : ""}
`;

    // ------------------------------------------------------------------
    // 4. Interpretar la intención con Gemini
    // ------------------------------------------------------------------
    const prompt = `
Eres AURA, un asistente académico personal amigable y útil para estudiantes universitarios.

Contexto del usuario:
${contexto}

Mensaje del usuario: "${message}"

Responde de forma natural y amigable. Puedes:
- Responder preguntas sobre clases, tareas y reservas
- Crear recordatorios si el usuario lo solicita
- Dar consejos de estudio
- Ser empático y motivador

IMPORTANTE: Responde SOLO con texto natural, sin JSON ni formato especial. Sé conversacional y cálido.

Respuesta:`;

    const result = await model.generateContent(prompt);
    const respuesta = result.response.text();

    // ------------------------------------------------------------------
    // 5. Detectar si el usuario quiere crear un recordatorio
    // ------------------------------------------------------------------
    const lowerMessage = message.toLowerCase();
    if (
      lowerMessage.includes("recuérdame") ||
      lowerMessage.includes("recordatorio") ||
      lowerMessage.includes("recordar")
    ) {
      // Intentar extraer fecha y texto del recordatorio
      const recordatorioMatch = message.match(/(?:recuérdame|recordar|recordatorio)\s+(.+?)(?:\s+el\s+(\d{1,2}\/\d{1,2}|\w+))?/i);
      
      if (recordatorioMatch) {
        const textoRecordatorio = recordatorioMatch[1] || message;
        // Por ahora, guardamos para hoy o mañana según el contexto
        const fechaRecordatorio = new Date();
        fechaRecordatorio.setDate(fechaRecordatorio.getDate() + 1); // Mañana por defecto

        await supabase.from("recordatorios").insert({
          user_id: user.id,
          texto: textoRecordatorio.trim(),
          fecha: fechaRecordatorio.toISOString().split("T")[0],
        });

        return new Response(
          JSON.stringify({
            reply: `${respuesta}\n\n✅ He guardado tu recordatorio: "${textoRecordatorio.trim()}"`,
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    // ------------------------------------------------------------------
    // 6. Detectar si el usuario pregunta por tareas
    // ------------------------------------------------------------------
    if (
      lowerMessage.includes("tarea") ||
      lowerMessage.includes("pendiente") ||
      lowerMessage.includes("qué tengo")
    ) {
      if (tareas && tareas.length > 0) {
        const listaTareas = tareas
          .map((t, i) => `${i + 1}. ${t.titulo} - Fecha límite: ${t.fecha_limite}`)
          .join("\n");
        
        return new Response(
          JSON.stringify({
            reply: `${respuesta}\n\n📋 Tus tareas pendientes:\n${listaTareas}`,
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    // ------------------------------------------------------------------
    // 7. Detectar si el usuario pregunta por reservas
    // ------------------------------------------------------------------
    if (
      lowerMessage.includes("reserva") ||
      lowerMessage.includes("salón") ||
          lowerMessage.includes("sala")
    ) {
      if (reservas && reservas.length > 0) {
        const listaReservas = reservas
          .map((r, i) => `${i + 1}. ${r.sala_nombre || "Sala"} - ${r.fecha} de ${r.hora_inicio} a ${r.hora_fin}`)
          .join("\n");
        
        return new Response(
          JSON.stringify({
            reply: `${respuesta}\n\n📅 Tus próximas reservas:\n${listaReservas}`,
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    // ------------------------------------------------------------------
    // Respuesta normal
    // ------------------------------------------------------------------
    return new Response(
      JSON.stringify({ reply: respuesta }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (e) {
    console.error("Error en AURA:", e);
    return new Response(
      JSON.stringify({
        reply: "Lo siento, hubo un error procesando tu solicitud. Por favor, intenta de nuevo.",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

