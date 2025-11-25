import { supabase } from './supabase';

export async function getDiscoverUsers(currentUserId: string, limit = 20) {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, username, avatar_url, bio')
      .neq('id', currentUserId)
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('❌ Error al obtener usuarios:', error);
    return [];
  }
}

export async function getUserById(userId: string) {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('❌ Error al obtener usuario:', error);
    return null;
  }
}