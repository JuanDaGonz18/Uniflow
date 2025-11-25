import { supabase } from "@/utils/supabase";
import { useCallback } from "react";

export interface UsuarioCompat {
  id: string;
  nombre: string;
  carrera?: string;
  semestre?: number;
}

export const useCompatibilidad = () => {
  const calcularCompatibilidad = useCallback(
    async (usuario1Id: string, usuario2Id: string): Promise<number> => {
      try {
        let compatibilidad = 0;

        // 1. Carrera igual (+25%)
        const { data: usr1 } = await supabase
          .from("usuarios")
          .select("carrera, semestre")
          .eq("id", usuario1Id)
          .single();

        const { data: usr2 } = await supabase
          .from("usuarios")
          .select("carrera, semestre")
          .eq("id", usuario2Id)
          .single();

        if (usr1?.carrera === usr2?.carrera) compatibilidad += 25;

        // 2. Semestre igual (+20%)
        if (usr1?.semestre === usr2?.semestre) compatibilidad += 20;

        // 3. Clases compartidas (+30%)
        const { data: clasesUsr1 } = await supabase
          .from("horario")
          .select("materia")
          .eq("usuario_id", usuario1Id);

        const { data: clasesUsr2 } = await supabase
          .from("horario")
          .select("materia")
          .eq("usuario_id", usuario2Id);

        const materiasUsr1 = (clasesUsr1 || []).map((c) => c.materia);
        const materiasComunes = (clasesUsr2 || []).filter((c) =>
          materiasUsr1.includes(c.materia)
        ).length;

        if (materiasComunes > 0) {
          compatibilidad += Math.min(30, materiasComunes * 10);
        }

        // 4. Huecos similares (+25%)
        const { data: huecosUsr1 } = await supabase
          .from("bloques_libres")
          .select("dia, hora_inicio, hora_fin")
          .eq("usuario_id", usuario1Id);

        const { data: huecosUsr2 } = await supabase
          .from("bloques_libres")
          .select("dia, hora_inicio, hora_fin")
          .eq("usuario_id", usuario2Id);

        const huecosComunes = (huecosUsr1 || []).filter((h1) =>
          (huecosUsr2 || []).some(
            (h2) =>
              h1.dia === h2.dia &&
              h1.hora_inicio === h2.hora_inicio &&
              h1.hora_fin === h2.hora_fin
          )
        ).length;

        if (huecosComunes > 0) compatibilidad += 25;

        return Math.min(100, compatibilidad);
      } catch (error) {
        console.error("Error calculando compatibilidad:", error);
        return 0;
      }
    },
    []
  );

  return { calcularCompatibilidad };
};