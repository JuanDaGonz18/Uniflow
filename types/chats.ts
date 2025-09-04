// types/chat.ts
export interface Message {
  id: string; // UUID
  text: string;
  sentBy: string; // UUID profile
  media?: {
    url: string;
    type: 'image' | 'video';
  };
  createdAt: string;
  deletedAt: string | null;
  editedAt: string | null;
  seenAt: string | null;
  sentAt: string | null;
  chatId: string;
}

export interface Chat {
  id: string;
  userId: string;
  userId2: string;
  messages: Message[];
}
