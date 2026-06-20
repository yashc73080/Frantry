import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import api from "@/lib/api";

type PantryItem = {
  _id: string;
  name: string;
  daysUntilExpiration: number;
  expiryLevel: string;
  createdAt: string;
};

function getRemainingDays(item: PantryItem): number {
  const daysSinceCreated = Math.floor(
    (Date.now() - new Date(item.createdAt).getTime()) / (1000 * 60 * 60 * 24)
  );
  return Math.max(0, item.daysUntilExpiration - daysSinceCreated);
}

function getExpiryStyle(remainingDays: number) {
  if (remainingDays <= 3)
    return { badge: styles.badgeRed, badgeText: styles.badgeTextLight, label: "Urgent" };
  if (remainingDays <= 7)
    return { badge: styles.badgeYellow, badgeText: styles.badgeTextDark, label: "Soon" };
  return { badge: styles.badgeGreen, badgeText: styles.badgeTextLight, label: "Fresh" };
}

export default function PantryList() {
  const [pantryData, setPantryData] = useState<PantryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const fetchPantryData = async () => {
    try {
      const response = await api.get("/api/items/getAllItems");
      setPantryData(response.data as PantryItem[]);
      setError("");
    } catch {
      setError("Failed to load pantry. Pull down to retry.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPantryData();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchPantryData();
    setRefreshing(false);
  }, []);

  const deleteItem = async (item: PantryItem) => {
    Alert.alert("Delete Item", `Remove "${item.name}" from your pantry?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await api.delete(`/api/items/${item._id}`);
            setPantryData((prev) => prev.filter((i) => i._id !== item._id));
          } catch {
            Alert.alert("Error", "Could not delete item. Please try again.");
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: PantryItem }) => {
    const remaining = getRemainingDays(item);
    const { badge, badgeText, label } = getExpiryStyle(remaining);

    return (
      <View style={styles.card}>
        <View style={styles.cardLeft}>
          <Text style={styles.itemName}>{item.name}</Text>
          <Text style={styles.itemDays}>
            {remaining === 0 ? "Expired" : `${remaining} day${remaining !== 1 ? "s" : ""} left`}
          </Text>
        </View>
        <View style={styles.cardRight}>
          <View style={[styles.badge, badge]}>
            <Text style={[styles.badgeLabel, badgeText]}>{label}</Text>
          </View>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => deleteItem(item)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialCommunityIcons name="trash-can-outline" size={20} color="#EF9A9A" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Pantry</Text>
        <Text style={styles.headerCount}>
          {pantryData.length} {pantryData.length === 1 ? "item" : "items"}
        </Text>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <Text style={styles.loadingText}>Loading pantry…</Text>
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <MaterialCommunityIcons name="wifi-off" size={48} color="#BDBDBD" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : pantryData.length === 0 ? (
        <View style={styles.centered}>
          <MaterialCommunityIcons name="package-variant-closed" size={64} color="#C8E6C9" />
          <Text style={styles.emptyTitle}>Your pantry is empty</Text>
          <Text style={styles.emptySubtitle}>Scan a grocery receipt to add items</Text>
        </View>
      ) : (
        <FlatList
          data={pantryData}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2E7D32" />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAF8",
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E8F5E9",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1B5E20",
  },
  headerCount: {
    fontSize: 14,
    color: "#81C784",
    fontWeight: "600",
    paddingBottom: 4,
  },
  list: {
    padding: 16,
    gap: 10,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 10,
  },
  cardLeft: {
    flex: 1,
    marginRight: 12,
  },
  itemName: {
    fontSize: 17,
    fontWeight: "600",
    color: "#212121",
    marginBottom: 4,
  },
  itemDays: {
    fontSize: 13,
    color: "#757575",
  },
  cardRight: {
    alignItems: "flex-end",
    gap: 8,
  },
  badge: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeLabel: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  badgeRed: { backgroundColor: "#C62828" },
  badgeYellow: { backgroundColor: "#F9A825" },
  badgeGreen: { backgroundColor: "#2E7D32" },
  badgeTextLight: { color: "#FFFFFF" },
  badgeTextDark: { color: "#1A1A1A" },
  deleteButton: {
    padding: 4,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 32,
  },
  loadingText: {
    fontSize: 16,
    color: "#9E9E9E",
  },
  errorText: {
    fontSize: 15,
    color: "#9E9E9E",
    textAlign: "center",
    marginTop: 8,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#424242",
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#9E9E9E",
    textAlign: "center",
  },
});
