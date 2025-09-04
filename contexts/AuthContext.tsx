import { User } from "@/types/common.type";
import { supabase } from "@/utils/supabase";
import { createContext, useContext, useEffect, useState } from "react";

interface AuthContextProps {
  user: User | null;
  saldo: number;
  ultimoMovimiento: string | null;
  isLoading: boolean;
  isLoadingUser: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (user: User, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<User> & { password?: string }) => Promise<void>;
  setSaldo: React.Dispatch<React.SetStateAction<number>>;
  resetPassword: (email: string, newPassword: string) => Promise<void>;
  updateSaldo: (
    nuevoSaldo: number,
    tipo?: "Depósito" | "Retiro",
    descripcion?: string
  ) => Promise<void>;
  uploadProfileImage: (file: File) => Promise<string | null>;
}

export const AuthContext = createContext({} as AuthContextProps);
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: any) => {
  const [user, setUser] = useState<User | null>(null);
  const [saldo, setSaldo] = useState<number>(0);
  const [ultimoMovimiento, setUltimoMovimiento] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingUser, setIsLoadingUser] = useState(true);

  useEffect(() => {
    getUser();
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) getUser();
        else {
          setUser(null);
          setSaldo(0);
          setUltimoMovimiento(null);
          setIsLoadingUser(false);
        }
      }
    );
    return () => listener.subscription.unsubscribe();
  }, []);

  const getUser = async () => {
    setIsLoadingUser(true);
    try {
      const { data } = await supabase.auth.getUser();
      const authUser = data?.user;

      if (!authUser) {
        setUser(null);
        return;
      }

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", authUser.id)
        .maybeSingle();

      if (error) throw error;

      if (profile) {
        const sanitizedProfile: User = {
          id: profile.id,
          email: profile.email ?? "",
          name: profile.name ?? "",
          username: profile.username ?? "",
          bio: profile.bio ?? null,
          website: profile.website ?? null,
          location: profile.location ?? null,
          birth_date: profile.birth_date ?? null,
          phone: profile.phone ?? null,
          gender: profile.gender ?? null,
          role: profile.role ?? "PLAYER",
          points: profile.points ?? 0,
          last_active: profile.last_active ?? "",
          avatar_url: profile.avatar_url ?? null,
        };
        setUser(sanitizedProfile);
        setSaldo(Number(sanitizedProfile.points) || 0);
      } else {
        setUser(null);
        setSaldo(0);
      }
    } catch (err) {
      console.error("Error cargando usuario:", err);
      setUser(null);
      setSaldo(0);
    } finally {
      setIsLoadingUser(false);
    }
  };

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setIsLoading(false);
    if (error) throw error;
    await getUser();
  };

  const register = async (newUser: User, password: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: newUser.email,
        password,
        options: { data: { name: newUser.name } },
      });
      if (error) throw error;

      if (data.user?.id) {
        const { error: profileError } = await supabase.from("profiles").upsert({
          id: data.user.id,
          email: newUser.email,
          name: newUser.name ?? "",
          username: newUser.username ?? newUser.email.split("@")[0],
          bio: newUser.bio ?? null,
          website: newUser.website ?? null,
          location: newUser.location ?? null,
          birth_date: newUser.birth_date ?? null,
          phone: newUser.phone ?? null,
          gender: newUser.gender ?? null,
          role: newUser.role ?? "PLAYER",
          points: 0,
          last_active: new Date().toISOString(),
          avatar_url: null,
        });
        if (profileError) throw profileError;
        await getUser();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    await supabase.auth.signOut();
    setUser(null);
    setSaldo(0);
    setUltimoMovimiento(null);
    setIsLoading(false);
  };

  const updateUser = async (
    updates: Partial<User> & { password?: string }
  ) => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      if (updates.password) {
        const { error: pwError } = await supabase.auth.updateUser({
          password: updates.password,
        });
        if (pwError) console.error("Error updating password:", pwError.message);
      }
      const { password, ...profileUpdates } = updates;
      const { error } = await supabase
        .from("profiles")
        .update({ ...profileUpdates, updated_at: new Date().toISOString() })
        .eq("id", user.id);
      if (error) throw error;

      // ✅ actualiza el estado local con los nuevos datos
      setUser((prev) => (prev ? { ...prev, ...profileUpdates } : prev));
    } finally {
      setIsLoading(false);
    }
  };

  const resetPassword = async (_email: string, newPassword: string) => {
    setIsLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setIsLoading(false);
    if (error) throw error;
  };

  const uploadProfileImage = async (file: File): Promise<string | null> => {
    if (!user?.id) return null;

    const filePath = `avatars/${user.id}-${Date.now()}`;
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, file, { upsert: true });

    if (uploadError) throw uploadError;

    const { data: publicUrlData } = supabase.storage
      .from("avatars")
      .getPublicUrl(filePath);

    const avatarUrl = publicUrlData.publicUrl;

    const { error: profileError } = await supabase
      .from("profiles")
      .update({ avatar_url: avatarUrl })
      .eq("id", user.id);

    if (profileError) throw profileError;

    // ✅ actualiza el estado inmediatamente
    setUser((prev) => (prev ? { ...prev, avatar_url: avatarUrl } : prev));

    return avatarUrl;
  };

  const getUltimoMovimiento = async () => {
    if (!user?.id) return;
    const { data, error } = await supabase
      .from("movimientos")
      .select("monto, tipo, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      const signo = data.tipo === "Depósito" ? "+" : "-";
      const montoAbs = Math.abs(data.monto);
      const fecha = new Date(data.created_at).toLocaleDateString();
      setUltimoMovimiento(`${data.tipo} ${signo}$${montoAbs} (${fecha})`);
    }
  };

  useEffect(() => {
    getUltimoMovimiento();
  }, [user, saldo]);

  const updateSaldo = async (
    nuevoSaldo: number,
    _tipo?: "Depósito" | "Retiro",
    descripcion?: string
  ) => {
    if (!user?.id) return;

    const diferencia = nuevoSaldo - saldo;

    const { error: profileError } = await supabase
      .from("profiles")
      .update({ points: nuevoSaldo })
      .eq("id", user.id);

    if (profileError) throw profileError;

    if (diferencia !== 0) {
      const movTipo = diferencia > 0 ? "Depósito" : "Retiro";

      const { error: movError } = await supabase.from("movimientos").insert({
        user_id: user.id,
        tipo: movTipo,
        monto: Math.abs(diferencia),
        descripcion:
          descripcion ?? `${movTipo} de $${Math.abs(diferencia).toFixed(2)}`,
      });

      if (movError) throw movError;

      const signo = movTipo === "Depósito" ? "+" : "-";
      const fecha = new Date().toLocaleDateString();
      setUltimoMovimiento(
        `${movTipo} ${signo}$${Math.abs(diferencia)} (${fecha})`
      );
    }

    setSaldo(nuevoSaldo);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        saldo,
        ultimoMovimiento,
        isLoading,
        isLoadingUser,
        login,
        register,
        logout,
        updateUser,
        setSaldo,
        resetPassword,
        updateSaldo,
        uploadProfileImage,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
