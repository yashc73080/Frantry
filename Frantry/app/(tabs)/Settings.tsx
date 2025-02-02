import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Avatar, Button, Card, Text } from 'react-native-paper';

export default function SettingsScreen() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const handleAuth = () => setIsLoggedIn(!isLoggedIn);

  return (
    <View style={styles.container}>
      {/* Profile Card */}
      <Card style={styles.card}>
        <Card.Content style={styles.profileContainer}>
          <Avatar.Image
            size={80}
            source={{ uri: 'https://i.pravatar.cc/150?img=3' }}
          />
          <Text style={styles.username}>{isLoggedIn ? 'Jesse Pikman' : 'Guest'}</Text>
          <Text style={styles.email}>{isLoggedIn ? 'jesse.pikman@example.com' : 'Not logged in'}</Text>
        </Card.Content>
      </Card>

      {/* Login / Logout Button */}
      <Button
        mode="contained"
        onPress={handleAuth}
        style={styles.button}
      >
        {isLoggedIn ? 'Logout' : 'Login'}
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  card: {
    marginVertical: 12,
    borderRadius: 10,
    elevation: 5,
  },
  profileContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  username: {
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 8,
  },
  email: {
    fontSize: 14,
    color: 'gray',
  },
  button: {
    marginTop: 20,
    borderRadius: 8,
    paddingVertical: 8,
  },
});
