export interface User {
  id: string;
  email: string;
  name: string;
  username: string;
  bio: string | null;
  website: string | null;
  location: string | null;
  birth_date: string | null;
  phone: string | null;
  gender: string | null;
  role: "PLAYER" | "ADMIN" | "CLIENT";
  points: number;
  last_active: string;
  avatar_url?: string | null;
}