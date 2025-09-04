// utils/chatService.ts
import { Message } from '@/types/chats';
import { supabase } from '@/utils/supabase';

// Crear un chat
export async function createChat(userId: string, userId2: string) {
  return await supabase
    .from('chats')
    .insert([{ user_id: userId, user_id2: userId2 }])
    .select()
    .single();
}

// Enviar mensaje
export async function sendMessage(chatId: string, userId: string, text: string, media?: any) {
  return await supabase
    .from('messages')
    .insert([{ chat_id: chatId, sent_by: userId, text, media }])
    .select()
    .single();
}

// Obtener mensajes de un chat
export async function getMessages(chatId: string) {
  return await supabase
    .from('messages')
    .select('*')
    .eq('chat_id', chatId)
    .order('created_at', { ascending: true });
}

// Suscripción en tiempo real
export function subscribeToMessages(chatId: string, callback: (message: Message) => void) {
  return supabase
    .channel(`chat-${chatId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatId}` },
      (payload) => {
        callback(payload.new as Message);
      }
    )
    .subscribe();
}
