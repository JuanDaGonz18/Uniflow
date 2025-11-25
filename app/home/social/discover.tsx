import { supabase } from '@/utils/supabase';
import { getDiscoverUsers } from '@/utils/userService';
import { useEffect, useState } from 'react';
import { FlatList, Image, Text, View } from 'react-native';

interface User {
  id: string;
  username: string;
  avatar_url: string;
  bio: string;
}

export default function DiscoverPeople() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) return;
    
    setLoading(true);
    const discoveredUsers = await getDiscoverUsers(user.id);
    setUsers(discoveredUsers);
    setLoading(false);
  };

  if (loading) return <Text>Cargando usuarios...</Text>;

  return (
    <FlatList
      data={users}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <View>
          <Image source={{ uri: item.avatar_url }} style={{ width: 100, height: 100 }} />
          <Text>{item.username}</Text>
          <Text>{item.bio}</Text>
        </View>
      )}
    />
  );
}