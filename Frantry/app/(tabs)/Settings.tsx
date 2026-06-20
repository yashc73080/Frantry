import React from "react";
import { View, StyleSheet, Alert } from "react-native";
import { Avatar, Button, Card, Text, Divider } from "react-native-paper";
import { useAuth } from "@/contexts/AuthContext";

export default function SettingsScreen() {
  const { user, signOut } = useAuth();

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: signOut },
    ]);
  };

  const displayName = user?.displayName || "User";
  const email = user?.email || "";
  const photoURL = user?.photoURL;

  return (
    <View style={styles.container}>
      <Text style={styles.screenTitle}>Settings</Text>

      <Card style={styles.profileCard}>
        <Card.Content style={styles.profileContent}>
          {photoURL ? (
            <Avatar.Image size={80} source={{ uri: photoURL }} />
          ) : (
            <Avatar.Text
              size={80}
              label={displayName.charAt(0).toUpperCase()}
              style={styles.avatarFallback}
            />
          )}
          <Text style={styles.displayName}>{displayName}</Text>
          <Text style={styles.email}>{email}</Text>
        </Card.Content>
      </Card>

      <Card style={styles.infoCard}>
        <Card.Content>
          <Text style={styles.sectionLabel}>Account</Text>
          <Divider style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoKey}>Email</Text>
            <Text style={styles.infoValue}>{email || "—"}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoKey}>Provider</Text>
            <Text style={styles.infoValue}>Google</Text>
          </View>
        </Card.Content>
      </Card>

      <Button
        mode="outlined"
        onPress={handleSignOut}
        style={styles.signOutButton}
        contentStyle={styles.signOutContent}
        textColor="#C62828"
        icon="logout"
      >
        Sign Out
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    paddingTop: 56,
    backgroundColor: "#F8FAF8",
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1B5E20",
    marginBottom: 24,
  },
  profileCard: {
    marginBottom: 16,
    borderRadius: 16,
    elevation: 2,
    backgroundColor: "#FFFFFF",
  },
  profileContent: {
    alignItems: "center",
    paddingVertical: 24,
  },
  avatarFallback: {
    backgroundColor: "#2E7D32",
  },
  displayName: {
    fontSize: 22,
    fontWeight: "700",
    color: "#212121",
    marginTop: 12,
  },
  email: {
    fontSize: 14,
    color: "#757575",
    marginTop: 4,
  },
  infoCard: {
    marginBottom: 24,
    borderRadius: 16,
    elevation: 2,
    backgroundColor: "#FFFFFF",
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#558B2F",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  divider: {
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  infoKey: {
    fontSize: 15,
    color: "#546E7A",
  },
  infoValue: {
    fontSize: 15,
    color: "#212121",
    fontWeight: "500",
  },
  signOutButton: {
    borderColor: "#C62828",
    borderRadius: 12,
    borderWidth: 1.5,
  },
  signOutContent: {
    paddingVertical: 6,
  },
});
