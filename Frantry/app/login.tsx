import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { AntDesign } from "@expo/vector-icons";

export default function LoginScreen() {
  const { user, signInWithGoogle } = useAuth();
  const router = useRouter();
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (user) {
      router.replace("/(tabs)");
    }
  }, [user]);

  const handleSignIn = async () => {
    setSigningIn(true);
    setError("");
    try {
      await signInWithGoogle();
    } catch (e: any) {
      setError("Sign-in failed. Please try again.");
      console.error("Sign-in error:", e);
    } finally {
      setSigningIn(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        {/* Logo / App Name */}
        <View style={styles.logoContainer}>
          <Image
            source={require("@/assets/images/icon.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.appName}>Frantry</Text>
          <Text style={styles.tagline}>Smart pantry, zero food waste</Text>
        </View>

        <View style={styles.divider} />

        {/* Feature bullets */}
        <View style={styles.features}>
          <FeatureRow icon="camera" text="Scan grocery receipts instantly" />
          <FeatureRow icon="shoppingcart" text="Track expiry dates automatically" />
          <FeatureRow icon="book" text="Get AI-powered recipe ideas" />
        </View>

        <View style={styles.divider} />

        {/* Google Sign-In button */}
        <TouchableOpacity
          style={[styles.googleButton, signingIn && styles.googleButtonDisabled]}
          onPress={handleSignIn}
          disabled={signingIn}
          activeOpacity={0.85}
        >
          {signingIn ? (
            <ActivityIndicator size="small" color="#3c4043" />
          ) : (
            <AntDesign name="google" size={20} color="#4285F4" />
          )}
          <Text style={styles.googleButtonText}>
            {signingIn ? "Signing in…" : "Sign in with Google"}
          </Text>
        </TouchableOpacity>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Text style={styles.disclaimer}>
          By signing in, you agree to manage your pantry responsibly.
        </Text>
      </View>
    </View>
  );
}

function FeatureRow({ icon, text }: { icon: any; text: string }) {
  return (
    <View style={styles.featureRow}>
      <AntDesign name={icon} size={18} color="#2E7D32" />
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F1F8E9",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 32,
    width: "100%",
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 8,
  },
  logo: {
    width: 72,
    height: 72,
    marginBottom: 12,
    borderRadius: 16,
  },
  appName: {
    fontSize: 32,
    fontWeight: "700",
    color: "#1B5E20",
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 14,
    color: "#558B2F",
    marginTop: 4,
    fontWeight: "500",
  },
  divider: {
    height: 1,
    backgroundColor: "#E8F5E9",
    marginVertical: 20,
  },
  features: {
    gap: 12,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  featureText: {
    fontSize: 15,
    color: "#37474F",
    flex: 1,
  },
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#DADCE0",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  googleButtonDisabled: {
    opacity: 0.6,
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#3c4043",
  },
  errorText: {
    color: "#C62828",
    textAlign: "center",
    marginTop: 12,
    fontSize: 14,
  },
  disclaimer: {
    fontSize: 12,
    color: "#9E9E9E",
    textAlign: "center",
    marginTop: 16,
    lineHeight: 18,
  },
});
