import ChatInput from "@/app/home/aura/components/ChatInput";
import ChatMessage from "@/app/home/aura/components/ChatMessage";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/utils/supabase";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";

import type { ChatMessage as ChatMessageType } from "@/types/chats";

export default function AuraChat() {
  const { user } = useAuth();
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [loading, setLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // Generar mensaje de bienvenida con Gemini cuando el usuario esté disponible
  useEffect(() => {
    const generarSaludo = async () => {
      if (!user || messages.length > 0) return;

      const nombreUsuario = user.nombre?.split(" ")[0] || "Estudiante";
      const horaActual = new Date().getHours();
      const momentoDia = horaActual < 12 ? "mañana" : horaActual < 18 ? "tarde" : "noche";

      // Mensaje temporal mientras se genera
      const tempMsg: ChatMessageType = {
        id: "welcome-loading",
        sender: "bot",
        text: "Hola... 👋",
      };
      setMessages([tempMsg]);

      try {
        const geminiApiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
        
        if (!geminiApiKey) {
          // Si no hay API key, usar saludo por defecto
          setMessages([
            {
              id: "welcome",
              sender: "bot",
              text: `¡Hola${nombreUsuario ? `, ${nombreUsuario}` : ""}! 👋 Soy AURA, tu asistente académico personal. ¿En qué puedo ayudarte hoy?`,
            },
          ]);
          return;
        }

        // Obtener contexto del usuario para el saludo
        let contextoSaludo = `Usuario: ${nombreUsuario}\nMomento del día: ${momentoDia}`;

        try {
          if (user.id) {
            const { data: tareas } = await supabase
              .from("tareas")
              .select("titulo, fecha_limite")
              .eq("user_id", user.id)
              .limit(3);

            const { data: reservas } = await supabase
              .from("reservas")
              .select("fecha, hora_inicio, sala_nombre")
              .eq("usuario_id", user.id)
              .gte("fecha", new Date().toISOString().split("T")[0])
              .limit(3);

            if (tareas && tareas.length > 0) {
              contextoSaludo += `\nTiene ${tareas.length} tarea${tareas.length > 1 ? "s" : ""} pendiente${tareas.length > 1 ? "s" : ""}`;
            }
            if (reservas && reservas.length > 0) {
              contextoSaludo += `\nTiene ${reservas.length} reserva${reservas.length > 1 ? "s" : ""} programada${reservas.length > 1 ? "s" : ""} para hoy`;
            }
          }
        } catch (contextError) {
          console.warn("⚠️ Error obteniendo contexto para saludo:", contextError);
        }

        const prompt = `Eres AURA, un asistente académico personal amigable y cálido para estudiantes universitarios.

Contexto:
${contextoSaludo}

Genera un saludo personalizado, cálido y motivador para este estudiante. El saludo debe:
- Ser breve (máximo 2-3 oraciones)
- Mencionar el nombre del estudiante de forma natural
- Ser apropiado para la ${momentoDia}
- Incluir un emoji al inicio
- Mencionar que eres AURA, su asistente académico personal
- Preguntar en qué puedes ayudar hoy
- Ser conversacional y amigable

Ejemplo de estilo: "¡Buenos días, [nombre]! ☀️ Soy AURA, tu asistente académico personal. Estoy aquí para ayudarte con tus tareas, reservas y cualquier pregunta que tengas. ¿En qué puedo asistirte hoy?"

Genera SOLO el saludo, sin explicaciones adicionales.`;

        const response = await fetch(
          "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
          {
            method: "POST",
            headers: {
              "x-goog-api-key": geminiApiKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              contents: [
                {
                  parts: [{ text: prompt }],
                },
              ],
            }),
          }
        );

        if (response.ok) {
          const geminiData = await response.json();
          const saludoGenerado = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || 
            `¡Hola${nombreUsuario ? `, ${nombreUsuario}` : ""}! 👋 Soy AURA, tu asistente académico personal. ¿En qué puedo ayudarte hoy?`;

          setMessages([
            {
              id: "welcome",
              sender: "bot",
              text: saludoGenerado,
            },
          ]);
        } else {
          // Si falla, usar saludo por defecto
          setMessages([
            {
              id: "welcome",
              sender: "bot",
              text: `¡Hola${nombreUsuario ? `, ${nombreUsuario}` : ""}! 👋 Soy AURA, tu asistente académico personal. ¿En qué puedo ayudarte hoy?`,
            },
          ]);
        }
      } catch (error: any) {
        console.warn("⚠️ Error generando saludo con Gemini:", error?.message);
        // Usar saludo por defecto si falla
        setMessages([
          {
            id: "welcome",
            sender: "bot",
            text: `¡Hola${nombreUsuario ? `, ${nombreUsuario}` : ""}! 👋 Soy AURA, tu asistente académico personal. ¿En qué puedo ayudarte hoy?`,
          },
        ]);
      }
    };

    generarSaludo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    // Scroll al final cuando hay nuevos mensajes
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  // Función para obtener toda la información del usuario
  const obtenerInformacionUsuario = async (userId: string) => {
    const info = {
      horario: [] as any[],
      tareas: [] as any[],
      recordatorios: [] as any[],
      reservas: [] as any[],
    };

    try {
      // Obtener horario
      const { data: horarioData } = await supabase
        .from("horario")
        .select("*")
        .eq("user_id", userId)
        .order("dia", { ascending: true })
        .order("hora", { ascending: true });
      if (horarioData) info.horario = horarioData;

      // Obtener tareas
      const { data: tareasData } = await supabase
        .from("tareas")
        .select("*")
        .eq("user_id", userId)
        .order("fecha_limite", { ascending: true, nullsFirst: false });
      if (tareasData) info.tareas = tareasData;

      // Obtener recordatorios
      const { data: recordatoriosData } = await supabase
        .from("recordatorios")
        .select("*")
        .eq("user_id", userId)
        .order("fecha", { ascending: true, nullsFirst: false });
      if (recordatoriosData) info.recordatorios = recordatoriosData;

      // Obtener reservas
      const { data: reservasData } = await supabase
        .from("reservas")
        .select("*, salas(nombre)")
        .eq("usuario_id", userId)
        .gte("fecha", new Date().toISOString().split("T")[0])
        .order("fecha", { ascending: true })
        .order("hora_inicio", { ascending: true });
      if (reservasData) info.reservas = reservasData;
    } catch (error: any) {
      console.warn("⚠️ obtenerInformacionUsuario: Error:", error?.message);
    }

    return info;
  };

  // Función para interpretar la intención del usuario y guardar en Supabase
  const interpretarYGuardar = async (mensaje: string, userId: string | undefined) => {
    if (!userId) {
      console.log("⚠️ interpretarYGuardar: No hay userId");
      return;
    }

    const geminiApiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
    if (!geminiApiKey) {
      console.log("⚠️ interpretarYGuardar: No hay API key");
      return;
    }

    try {
      // Usar Gemini para interpretar la intención con schema JSON
      // Ahora puede crear múltiples elementos
      const fechaHoy = new Date().toISOString().split("T")[0];
      const promptInterpretacion = `Analiza el siguiente mensaje del usuario y determina si quiere crear recordatorios, tareas, reservas o actualizar su horario.

IMPORTANTE: Si el usuario pide guardar múltiples cosas (ej: "guarda mi horario completo" o "agrega estas materias"), debes extraer TODOS los elementos.

Mensaje: "${mensaje}"

Fecha de hoy: ${fechaHoy}

Responde SOLO con un JSON válido con esta estructura:
{
  "intencion": "recordatorio" | "tarea" | "reserva" | "horario" | "ninguna",
  "elementos": [
    {
      "texto": "texto del recordatorio" (solo si intencion es "recordatorio"),
      "fecha": "YYYY-MM-DD" (para recordatorio, tarea o reserva. Convierte "mañana", "el viernes", etc. a fecha real),
      "titulo": "título de la tarea" (solo si intencion es "tarea"),
      "descripcion": "descripción de la tarea" (solo si intencion es "tarea"),
      "fecha_limite": "YYYY-MM-DD" (solo si intencion es "tarea"),
      "sala_id": null (solo si intencion es "reserva", puede ser null),
      "hora_inicio": "HH:MM" (solo si intencion es "reserva"),
      "hora_fin": "HH:MM" (solo si intencion es "reserva"),
      "materia": "nombre de la materia" (solo si intencion es "horario"),
      "dia": "lunes|martes|miercoles|jueves|viernes|sabado|domingo" (solo si intencion es "horario"),
      "hora": "HH:MM" (solo si intencion es "horario", hora de inicio),
      "hora_fin": "HH:MM" (solo si intencion es "horario", hora de finalización, puede ser null),
      "salon": "nombre del salón" (solo si intencion es "horario", puede ser null)
    }
  ]
}

Si no hay intención clara de crear algo, devuelve {"intencion": "ninguna", "elementos": []}.
Si el usuario pide guardar múltiples elementos, inclúyelos TODOS en el array "elementos".
Responde SOLO con el JSON, sin texto adicional.`;

      const response = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
        {
          method: "POST",
          headers: {
            "x-goog-api-key": geminiApiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [{ text: promptInterpretacion }],
              },
            ],
            generationConfig: {
              responseMimeType: "application/json",
            },
          }),
        }
      );

      if (!response.ok) {
        console.warn("⚠️ interpretarYGuardar: Error en la llamada a Gemini");
        return;
      }

      const data = await response.json();
      const rawJson = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      
      if (!rawJson) {
        console.warn("⚠️ interpretarYGuardar: No se recibió respuesta de Gemini");
        return;
      }

      // Parsear el JSON (puede venir con markdown code blocks)
      let parsed: any;
      try {
        const cleanedJson = rawJson.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        parsed = JSON.parse(cleanedJson);
      } catch (parseError) {
        console.warn("⚠️ interpretarYGuardar: Error parseando JSON:", parseError);
        return;
      }

      const { intencion, elementos } = parsed;

      if (!intencion || intencion === "ninguna" || !elementos || !Array.isArray(elementos) || elementos.length === 0) {
        console.log("ℹ️ interpretarYGuardar: No hay acción a realizar");
        return;
      }

      console.log("💾 interpretarYGuardar: Intención detectada:", intencion, "con", elementos.length, "elementos");

      // Guardar todos los elementos según la intención
      switch (intencion) {
        case "recordatorio":
          for (const elemento of elementos) {
            if (elemento.texto) {
              const { error } = await supabase.from("recordatorios").insert({
                user_id: userId,
                texto: elemento.texto,
                fecha: elemento.fecha || null,
              });
              if (error) {
                console.error("❌ Error guardando recordatorio:", error);
              } else {
                console.log("✅ Recordatorio guardado:", elemento.texto);
              }
            }
          }
          break;

        case "tarea":
          for (const elemento of elementos) {
            if (elemento.titulo) {
              const { error } = await supabase.from("tareas").insert({
                user_id: userId,
                titulo: elemento.titulo,
                descripcion: elemento.descripcion || null,
                fecha_limite: elemento.fecha_limite || elemento.fecha || null,
              });
              if (error) {
                console.error("❌ Error guardando tarea:", error);
              } else {
                console.log("✅ Tarea guardada:", elemento.titulo);
              }
            }
          }
          break;

        case "reserva":
          for (const elemento of elementos) {
            if (elemento.fecha && elemento.hora_inicio && elemento.hora_fin) {
              const { error } = await supabase.from("reservas").insert({
                usuario_id: userId,
                sala_id: elemento.sala_id || null,
                fecha: elemento.fecha,
                hora_inicio: elemento.hora_inicio,
                hora_fin: elemento.hora_fin,
                estado: "activa",
              });
              if (error) {
                console.error("❌ Error guardando reserva:", error);
              } else {
                console.log("✅ Reserva guardada:", elemento.fecha);
              }
            }
          }
          break;

        case "horario":
          // Si hay múltiples elementos, probablemente es una actualización completa del horario
          // Eliminar primero el horario existente para evitar conflictos de unicidad
          if (elementos.length > 3) {
            console.log("🔄 interpretarYGuardar: Actualización completa de horario, eliminando horario anterior...");
            const { error: deleteError } = await supabase
              .from("horario")
              .delete()
              .eq("user_id", userId);
            if (deleteError) {
              console.warn("⚠️ interpretarYGuardar: Error eliminando horario anterior:", deleteError);
            } else {
              console.log("✅ interpretarYGuardar: Horario anterior eliminado");
            }
          }

          // Insertar todos los elementos del horario
          for (const elemento of elementos) {
            if (elemento.materia && elemento.dia && elemento.hora) {
              const rangoHora = elemento.hora_fin ? `${elemento.hora} - ${elemento.hora_fin}` : elemento.hora;
              
              // Intentar insertar primero
              const { error: insertError } = await supabase.from("horario").insert({
                user_id: userId,
                materia: elemento.materia,
                dia: elemento.dia,
                hora: elemento.hora,
                hora_fin: elemento.hora_fin || null,
                salon: elemento.salon || null,
              });

              if (insertError) {
                // Si hay error de duplicado, intentar actualizar
                if (insertError.code === "23505") {
                  console.log(`🔄 interpretarYGuardar: Duplicado detectado para ${elemento.materia}, intentando actualizar...`);
                  
                  // Intentar actualizar el registro existente
                  // Primero buscar el registro existente
                  const { data: existente, error: searchError } = await supabase
                    .from("horario")
                    .select("id")
                    .eq("user_id", userId)
                    .eq("materia", elemento.materia)
                    .maybeSingle();

                  if (!searchError && existente) {
                    // Actualizar el registro existente
                    const { error: updateError } = await supabase
                      .from("horario")
                      .update({
                        dia: elemento.dia,
                        hora: elemento.hora,
                        hora_fin: elemento.hora_fin || null,
                        salon: elemento.salon || null,
                      })
                      .eq("id", existente.id);

                    if (updateError) {
                      console.error("❌ Error actualizando horario:", updateError);
                    } else {
                      console.log("✅ Horario actualizado:", elemento.materia, elemento.dia, rangoHora);
                    }
                  } else {
                    // Si no se encuentra, intentar eliminar y volver a insertar
                    const { error: deleteError } = await supabase
                      .from("horario")
                      .delete()
                      .eq("user_id", userId)
                      .eq("materia", elemento.materia);

                    if (!deleteError) {
                      const { error: retryInsertError } = await supabase.from("horario").insert({
                        user_id: userId,
                        materia: elemento.materia,
                        dia: elemento.dia,
                        hora: elemento.hora,
                        hora_fin: elemento.hora_fin || null,
                        salon: elemento.salon || null,
                      });

                      if (retryInsertError) {
                        console.error("❌ Error guardando horario después de eliminar duplicado:", retryInsertError);
                      } else {
                        console.log("✅ Horario guardado (después de eliminar duplicado):", elemento.materia, elemento.dia, rangoHora);
                      }
                    } else {
                      console.error("❌ Error eliminando duplicado:", deleteError);
                    }
                  }
                } else {
                  // Otro tipo de error
                  console.error("❌ Error guardando horario:", insertError);
                }
              } else {
                // Insert exitoso
                console.log("✅ Horario guardado:", elemento.materia, elemento.dia, rangoHora);
              }
            }
          }
          break;

        default:
          console.log("ℹ️ interpretarYGuardar: Intención no reconocida:", intencion);
      }
    } catch (error: any) {
      console.warn("⚠️ interpretarYGuardar: Error general:", error?.message);
    }
  };

  const handleSend = async (text: string) => {
    if (!text.trim() || loading) {
      console.log("🚫 handleSend: Mensaje vacío o ya está cargando");
      return;
    }

    console.log("📤 handleSend: Iniciando envío de mensaje:", text.trim());

    const userMsg: ChatMessageType = {
      id: Date.now().toString(),
      sender: "user",
      text: text.trim(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    // Mostrar mensaje de carga
    const loadingMsg: ChatMessageType = {
      id: `loading-${Date.now()}`,
      sender: "bot",
      text: "Pensando...",
    };
    setMessages((prev) => [...prev, loadingMsg]);

    try {
      console.log("🤖 handleSend: Usando Gemini directamente...");
      
      // Obtener TODA la información del usuario
      const infoUsuario = user?.id ? await obtenerInformacionUsuario(user.id) : null;

      // Formatear horario por día
      const formatearHorario = (horario: any[]) => {
        if (!horario || horario.length === 0) return "No hay horario registrado";
        const porDia: Record<string, any[]> = {};
        horario.forEach((h) => {
          if (!porDia[h.dia]) porDia[h.dia] = [];
          porDia[h.dia].push(h);
        });
        return Object.entries(porDia)
          .map(([dia, clases]) => {
            const clasesStr = clases
              .sort((a, b) => a.hora.localeCompare(b.hora))
              .map((c) => {
                const rangoHora = c.hora_fin ? `${c.hora} - ${c.hora_fin}` : c.hora;
                return `${rangoHora} - ${c.materia}${c.salon ? ` (${c.salon})` : ""}`;
              })
              .join(", ");
            return `${dia.charAt(0).toUpperCase() + dia.slice(1)}: ${clasesStr}`;
          })
          .join("\n");
      };

      // Formatear tareas
      const formatearTareas = (tareas: any[]) => {
        if (!tareas || tareas.length === 0) return "No hay tareas pendientes";
        const hoy = new Date().toISOString().split("T")[0];
        const tareasHoy = tareas.filter((t) => t.fecha_limite === hoy);
        const tareasProximas = tareas.filter((t) => t.fecha_limite && t.fecha_limite > hoy).slice(0, 10);
        const tareasVencidas = tareas.filter((t) => t.fecha_limite && t.fecha_limite < hoy);

        let texto = "";
        if (tareasVencidas.length > 0) {
          texto += `⚠️ TAREAS VENCIDAS (${tareasVencidas.length}):\n${tareasVencidas.map((t) => `- ${t.titulo} (venció: ${t.fecha_limite})`).join("\n")}\n\n`;
        }
        if (tareasHoy.length > 0) {
          texto += `📅 HOY (${tareasHoy.length}):\n${tareasHoy.map((t) => `- ${t.titulo}`).join("\n")}\n\n`;
        }
        if (tareasProximas.length > 0) {
          texto += `📋 PRÓXIMAS (${tareasProximas.length}):\n${tareasProximas.map((t) => `- ${t.titulo}${t.fecha_limite ? ` (${t.fecha_limite})` : ""}`).join("\n")}`;
        }
        return texto || "No hay tareas pendientes";
      };

      // Formatear recordatorios
      const formatearRecordatorios = (recordatorios: any[]) => {
        if (!recordatorios || recordatorios.length === 0) return "No hay recordatorios";
        const hoy = new Date().toISOString().split("T")[0];
        const proximos = recordatorios
          .filter((r) => !r.fecha || r.fecha >= hoy)
          .slice(0, 10)
          .map((r) => `- ${r.texto}${r.fecha ? ` (${r.fecha})` : ""}`)
          .join("\n");
        return proximos || "No hay recordatorios próximos";
      };

      // Formatear reservas
      const formatearReservas = (reservas: any[]) => {
        if (!reservas || reservas.length === 0) return "No hay reservas próximas";
        return reservas
          .slice(0, 10)
          .map((r) => {
            const salaNombre = r.salas?.nombre || "Sala";
            return `- ${salaNombre} el ${r.fecha} de ${r.hora_inicio} a ${r.hora_fin}`;
          })
          .join("\n");
      };

      const contexto = `INFORMACIÓN DEL USUARIO:

👤 Nombre: ${user?.nombre || "Usuario"}

📚 HORARIO SEMANAL:
${infoUsuario ? formatearHorario(infoUsuario.horario) : "No hay horario registrado"}

📋 TAREAS:
${infoUsuario ? formatearTareas(infoUsuario.tareas) : "No hay tareas"}

🔔 RECORDATORIOS:
${infoUsuario ? formatearRecordatorios(infoUsuario.recordatorios) : "No hay recordatorios"}

📅 RESERVAS:
${infoUsuario ? formatearReservas(infoUsuario.reservas) : "No hay reservas"}`;

      // Detectar comandos de navegación antes de enviar a Gemini
      const navigationCommands: Record<string, string> = {
        "ver salones": "/home/(tabs)/salones",
        "salones": "/home/(tabs)/salones",
        "mapa": "/home/(tabs)/salones",
        "ver tareas": "/home/(tabs)/tasks",
        "tareas": "/home/(tabs)/tasks",
        "mis tareas": "/home/(tabs)/tasks",
        "ver reservas": "/home/reservas/reservas",
        "reservas": "/home/reservas/reservas",
        "mis reservas": "/home/reservas/reservas",
        "ver perfil": "/home/(tabs)/perfil",
        "perfil": "/home/(tabs)/perfil",
        "home": "/home/(tabs)/home",
        "inicio": "/home/(tabs)/home",
      };

      const lowerText = text.trim().toLowerCase();
      for (const [command, route] of Object.entries(navigationCommands)) {
        if (lowerText.includes(command)) {
          // Abrir el módulo automáticamente
          setTimeout(() => {
            router.push(route as any);
          }, 500);
          // Responder confirmando la acción
          const confirmMsg: ChatMessageType = {
            id: Date.now().toString(),
            sender: "bot",
            text: `Abriendo ${command}...`,
          };
          setMessages((prev) => [...prev, confirmMsg]);
          setLoading(false);
          return;
        }
      }

      const prompt = `Eres AURA, un asistente académico personal amigable y muy útil para estudiantes universitarios.

${contexto}

INSTRUCCIONES IMPORTANTES:
1. Puedes responder preguntas sobre el HORARIO del usuario usando la información de arriba
2. Puedes listar TAREAS pendientes, vencidas o próximas
3. Puedes mostrar RECORDATORIOS del usuario
4. Puedes informar sobre RESERVAS próximas
5. Si el usuario pregunta "¿Cuál es mi próxima clase?" o "¿Qué tengo después?", calcula la próxima clase basándote en el día y hora actual
6. Si pregunta sobre tareas vencidas, muéstralas claramente
7. Puedes dar consejos de estudio, ser empático y motivador
8. Si el usuario quiere crear algo (recordatorio, tarea, etc.), confirma que lo harás pero NO lo crees aquí (ya se creará automáticamente)
9. Si el usuario pide "ver salones", "ver tareas", "ver reservas", etc., confirma que abrirás ese módulo
10. Puedes sugerir rutas optimizadas si el usuario pregunta cómo llegar a algún lugar del campus

Mensaje del usuario: "${text.trim()}"

Responde de forma natural, amigable, útil y específica. Usa la información del contexto para dar respuestas precisas.
Sé conversacional y cálido. Si hay información relevante en el contexto, úsala para responder.

Respuesta:`;

      const geminiApiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
      if (!geminiApiKey) {
        console.error("❌ handleSend: GEMINI_API_KEY no está configurada");
        throw new Error("La API key de Gemini no está configurada. Por favor, configura EXPO_PUBLIC_GEMINI_API_KEY en tu archivo .env");
      }

      console.log("🔑 handleSend: API Key encontrada, llamando a Gemini...");

      const response = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
        {
          method: "POST",
          headers: {
            "x-goog-api-key": geminiApiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [{ text: prompt }],
              },
            ],
          }),
        }
      );

      console.log("📡 handleSend: Respuesta HTTP:", response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ handleSend: Error de Gemini API:", errorText);
        throw new Error(`Error de Gemini API (${response.status}): ${errorText.substring(0, 200)}`);
      }

      const geminiData = await response.json();
      console.log("📦 handleSend: Datos de Gemini recibidos:", JSON.stringify(geminiData).substring(0, 200));
      
      const respuesta = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || 
                 "Lo siento, no pude generar una respuesta. ¿Puedes reformular tu pregunta?";

      if (!respuesta || respuesta.length === 0) {
        console.warn("⚠️ handleSend: Respuesta vacía de Gemini");
        throw new Error("No recibí una respuesta válida de Gemini");
      }

      console.log("✅ handleSend: Respuesta de Gemini recibida (longitud:", respuesta.length, "caracteres)");

      // Intentar interpretar la intención y guardar datos si es necesario
      try {
        await interpretarYGuardar(text.trim(), user?.id);
      } catch (errorGuardar: any) {
        console.warn("⚠️ handleSend: Error al intentar guardar datos:", errorGuardar?.message);
        // No mostramos error al usuario, solo lo registramos
      }

      // Remover mensaje de carga
      setMessages((prev) => prev.filter((msg) => msg.id !== loadingMsg.id));

      const botMsg: ChatMessageType = {
        id: (Date.now() + 1).toString(),
        sender: "bot",
        text: respuesta,
      };

      console.log("✅ handleSend: Mensaje procesado exitosamente");
      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      console.error("💥 handleSend: Excepción capturada");
      console.error("   - Error type:", err?.constructor?.name || "Unknown");
      console.error("   - Error message:", err?.message || "Sin mensaje");
      console.error("   - Error stack:", err?.stack || "Sin stack");
      console.error("   - Error completo:", JSON.stringify(err, null, 2));
      
      // Remover mensaje de carga
      setMessages((prev) => prev.filter((msg) => msg.id !== loadingMsg.id));

      const errorMsg: ChatMessageType = {
        id: (Date.now() + 1).toString(),
        sender: "bot",
        text: `Error: ${err?.message || "Error desconocido"}. Por favor, verifica tu conexión e intenta de nuevo.`,
      };

      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
      console.log("🏁 handleSend: Proceso finalizado");
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>✨ AURA</Text>
        <Text style={styles.headerSubtitle}>Tu asistente académico personal</Text>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={({ item }) => <ChatMessage message={item} />}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Inicia una conversación con AURA</Text>
          </View>
        }
        onContentSizeChange={() => {
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }, 100);
        }}
      />

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#d7b45f" />
          <Text style={styles.loadingText}>AURA está pensando...</Text>
        </View>
      )}

      <ChatInput onSend={handleSend} loading={loading} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0d1f23",
  },
  header: {
    padding: 24,
    paddingTop: 60,
    backgroundColor: "#10282b",
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerTitle: {
    fontSize: 28,
    color: "#d7b45f",
    fontWeight: "600",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#9bc7b4",
  },
  messagesContainer: {
    padding: 16,
    paddingBottom: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyText: {
    color: "#9bc7b4",
    fontSize: 14,
    textAlign: "center",
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: "#15363a",
  },
  loadingText: {
    color: "#9bc7b4",
    fontSize: 12,
    marginLeft: 8,
  },
});
