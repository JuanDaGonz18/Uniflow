import { supabase } from "@/utils/supabase";
import { createContext, useContext, useEffect, useState } from "react";

// ----------------------------------------------------------
// MODELO DE USUARIO
// ----------------------------------------------------------
export interface Usuario {
  id: string;
  nombre: string;
  correo: string;
  rol: string;

  username?: string | null;
  bio?: string | null;
  website?: string | null;
  location?: string | null;
  birth_date?: string | null;
  phone?: string | null;
  gender?: string | null;
  avatar_url?: string | null;
}

// ----------------------------------------------------------
// CONTEXTO
// ----------------------------------------------------------
interface AuthContextProps {
  user: Usuario | null;
  isLoading: boolean;
  isLoadingUser: boolean;

  login: (correo: string, password: string) => Promise<void>;
  register: (datos: { nombre: string; correo: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;

  updateUser: (updates: Partial<Usuario> & { password?: string }) => Promise<void>;
  uploadAvatar: (uri: string) => Promise<string | null>;
}

export const AuthContext = createContext({} as AuthContextProps);
export const useAuth = () => useContext(AuthContext);

// ==========================================================
// PROVIDER
// ==========================================================
export const AuthProvider = ({ children }: any) => {
  const [user, setUser] = useState<Usuario | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingUser, setIsLoadingUser] = useState(true);

  // ----------------------------------------------------------
  // 1. Escuchar cambios en la sesión
  // ----------------------------------------------------------
  useEffect(() => {
    loadUser();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) loadUser();
      else {
        setUser(null);
        setIsLoadingUser(false);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  // ----------------------------------------------------------
  // 2. Cargar perfil desde tabla `usuarios`
  // ----------------------------------------------------------
  const loadUser = async () => {
    setIsLoadingUser(true);

    try {
      const { data } = await supabase.auth.getUser();
      const authUser = data?.user;

      if (!authUser) {
        setUser(null);
        return;
      }

      const { data: perfil, error } = await supabase
        .from("usuarios")
        .select("*")
        .eq("id", authUser.id)
        .maybeSingle();

      if (error) throw error;

      if (perfil) setUser(perfil as Usuario);
      else setUser(null);
    } catch (err) {
      console.error("Error cargando usuario:", err);
      setUser(null);
    } finally {
      setIsLoadingUser(false);
    }
  };

  // ----------------------------------------------------------
  // 3. LOGIN
  // ----------------------------------------------------------
  const login = async (correo: string, password: string) => {
    setIsLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: correo,
      password,
    });

    setIsLoading(false);

    if (error) throw error;

    await loadUser();
  };

  // ----------------------------------------------------------
  // 4. REGISTRO
  // ----------------------------------------------------------
  const register = async ({
    nombre,
    correo,
    password,
  }: {
    nombre: string;
    correo: string;
    password: string;
  }) => {
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: correo,
        password,
        options: { data: { nombre } },
      });

      if (error) throw error;

      if (data.user?.id) {
        const { error: e2 } = await supabase.from("usuarios").insert({
          id: data.user.id,
          nombre,
          correo,
          rol: "usuario",
        });
        if (e2) throw e2;
      }

      await loadUser();
    } finally {
      setIsLoading(false);
    }
  };

  // ----------------------------------------------------------
  // 5. LOGOUT
  // ----------------------------------------------------------
  const logout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Supabase signOut error:", error);
        // no lanzar para no bloquear la navegación; opcional: throw error;
      }
    } catch (e) {
      console.error("Error during signOut:", e);
    } finally {
      // limpiar siempre el user en el contexto
      setUser(null);
      // opcional: limpiar storage si fuese necesario
      // await AsyncStorage.removeItem('supabase.auth.token');
    }
  };

  // ----------------------------------------------------------
  // 6. UPDATE de usuario
  // ----------------------------------------------------------
  const updateUser = async (
    updates: Partial<Usuario> & { password?: string }
  ) => {
    if (!user?.id) return;

    setIsLoading(true);

    try {
      // Actualizar contraseña (si viene)
      if (updates.password) {
        const { error: pwError } = await supabase.auth.updateUser({
          password: updates.password,
        });
        if (pwError) throw pwError;
      }

      const { password, ...profileUpdates } = updates;

      const { error } = await supabase
        .from("usuarios")
        .update(profileUpdates)
        .eq("id", user.id);

      if (error) throw error;

      setUser((prev) => (prev ? { ...prev, ...profileUpdates } : prev));
    } finally {
      setIsLoading(false);
    }
  };

  // ----------------------------------------------------------
  // 7. SUBIR AVATAR DESDE URI (EXPO)
  // ----------------------------------------------------------
  const uploadAvatar = async (uri: string): Promise<string | null> => {
    if (!user) return null;

    try {
      // Convertimos el archivo a ArrayBuffer
      const response = await fetch(uri);
      const arrayBuffer = await response.arrayBuffer();

      const fileExt = uri.split(".").pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const path = `avatars/${fileName}`;

      const { error } = await supabase.storage.from("avatars").upload(path, arrayBuffer, {
        contentType: "image/jpeg",
        upsert: true,
      });

      if (error) {
        console.error("uploadAvatar error:", error);
        throw error;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(path);

      // actualizar tabla usuarios
      await supabase.from("usuarios").update({ avatar_url: publicUrl }).eq("id", user.id);
      // actualizar estado local
      setUser((prev) => (prev ? { ...prev, avatar_url: publicUrl } : prev));

      return publicUrl;
    } catch (err) {
      console.error("uploadAvatar error:", err);
      return null;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isLoadingUser,
        login,
        register,
        logout,
        updateUser,
        uploadAvatar,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
