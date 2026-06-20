import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
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
  const msPerDay = 1000 * 60 * 60 * 24;
  const daysSinceCreated = Math.floor(
    (Date.now() - new Date(item.createdAt).getTime()) / msPerDay
  );
  return Math.max(0, item.daysUntilExpiration - daysSinceCreated);
}

function getExpiryStyle(remainingDays: number) {
  if (remainingDays <= 3)
    return { card: styles.cardRed, badge: styles.badgeRed, label: "Urgent", textLight: true };
  if (remainingDays <= 7)
    return { card: styles.cardYellow, badge: styles.badgeYellow, label: "Soon", textLight: false };
  return { card: styles.cardGreen, badge: styles.badgeGreen, label: "Fresh", textLight: true };
}

function computeExpiryLevel(days: number): "low" | "medium" | "high" {
  if (days <= 2) return "high";
  if (days <= 5) return "medium";
  return "low";
}

export default function PantryList() {
  const [pantryData, setPantryData] = useState<PantryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  // Add item modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDays, setNewDays] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchPantryData = async () => {
    try {
      const response = await api.get("/api/items/getAllItems");
      setPantryData(response.data as PantryItem[]);
      setError("");
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || "Unknown error";
      setError(`Failed to load pantry: ${msg}`);
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

  const deleteItem = (item: PantryItem) => {
    Alert.alert("Remove Item", `Remove "${item.name}" from your pantry?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            await api.delete(`/api/items/${item._id}`);
            setPantryData((prev) => prev.filter((i) => i._id !== item._id));
          } catch (err: any) {
            const msg = err?.response?.data?.error || err?.message || "Unknown error";
            Alert.alert("Error", `Could not delete item: ${msg}`);
          }
        },
      },
    ]);
  };

  const openAddModal = () => {
    setNewName("");
    setNewDays("");
    setModalVisible(true);
  };

  const submitAddItem = async () => {
    const trimmedName = newName.trim();
    const days = parseInt(newDays, 10);

    if (!trimmedName) {
      Alert.alert("Validation", "Please enter an item name.");
      return;
    }
    if (isNaN(days) || days < 0) {
      Alert.alert("Validation", "Please enter a valid number of days (0 or more).");
      return;
    }

    setSaving(true);
    try {
      await api.post("/api/items/addItem", {
        name: trimmedName,
        daysUntilExpiration: days,
        expiryLevel: computeExpiryLevel(days),
      });
      setModalVisible(false);
      setNewName("");
      setNewDays("");
      await fetchPantryData();
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || "Unknown error";
      Alert.alert("Error", `Could not add item: ${msg}`);
    } finally {
      setSaving(false);
    }
  };

  const renderItem = ({ item }: { item: PantryItem }) => {
    const remaining = getRemainingDays(item);
    const { badge, label, textLight } = getExpiryStyle(remaining);

    return (
      <View style={styles.card}>
        <View style={styles.cardLeft}>
          <Text style={styles.itemName}>{item.name}</Text>
          <Text style={styles.itemDays}>
            {remaining === 0
              ? "Expired"
              : `${remaining} day${remaining !== 1 ? "s" : ""} remaining`}
          </Text>
        </View>
        <View style={styles.cardRight}>
          <View style={[styles.badge, badge]}>
            <Text style={[styles.badgeLabel, textLight ? styles.badgeTextLight : styles.badgeTextDark]}>
              {label}
            </Text>
          </View>
          <TouchableOpacity
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
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>My Pantry</Text>
          {!loading && (
            <Text style={styles.headerCount}>
              {pantryData.length} {pantryData.length === 1 ? "item" : "items"}
            </Text>
          )}
        </View>
        <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
          <MaterialCommunityIcons name="plus" size={22} color="#FFFFFF" />
          <Text style={styles.addButtonText}>Add</Text>
        </TouchableOpacity>
      </View>

      {/* List / empty states */}
      {loading ? (
        <View style={styles.centered}>
          <Text style={styles.loadingText}>Loading pantry…</Text>
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <MaterialCommunityIcons name="wifi-off" size={48} color="#BDBDBD" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : pantryData.length === 0 ? (
        <View style={styles.centered}>
          <MaterialCommunityIcons name="fridge-outline" size={64} color="#C8E6C9" />
          <Text style={styles.emptyTitle}>Your pantry is empty</Text>
          <Text style={styles.emptySubtitle}>
            Scan a grocery receipt in the Camera tab, or tap{" "}
            <Text style={{ fontWeight: "700" }}>+ Add</Text> to add items manually.
          </Text>
        </View>
      ) : (
        <FlatList
          data={pantryData}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#2E7D32"
            />
          }
        />
      )}

      {/* Add Item Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Item</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#757575" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Item Name</Text>
            <TextInput
              style={styles.textInput}
              value={newName}
              onChangeText={setNewName}
              placeholder="e.g. Apples, Milk, Bread"
              placeholderTextColor="#BDBDBD"
              autoFocus
              returnKeyType="next"
            />

            <Text style={styles.inputLabel}>Days Until Expiry</Text>
            <TextInput
              style={styles.textInput}
              value={newDays}
              onChangeText={setNewDays}
              placeholder="e.g. 7"
              placeholderTextColor="#BDBDBD"
              keyboardType="number-pad"
              returnKeyType="done"
            />

            {newDays !== "" && !isNaN(parseInt(newDays)) && (
              <View style={styles.previewRow}>
                <Text style={styles.previewLabel}>Expiry level:</Text>
                <ExpiryPreview days={parseInt(newDays)} />
              </View>
            )}

            <TouchableOpacity
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={submitAddItem}
              disabled={saving}
            >
              <Text style={styles.saveButtonText}>{saving ? "Saving…" : "Add to Pantry"}</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function ExpiryPreview({ days }: { days: number }) {
  const level = computeExpiryLevel(days);
  const color = level === "high" ? "#C62828" : level === "medium" ? "#F9A825" : "#2E7D32";
  const label = level === "high" ? "Urgent (≤2 days)" : level === "medium" ? "Soon (3–5 days)" : "Fresh (6+ days)";
  return (
    <View style={[styles.badge, { backgroundColor: color }]}>
      <Text style={[styles.badgeLabel, styles.badgeTextLight]}>{label}</Text>
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
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1B5E20",
  },
  headerCount: {
    fontSize: 13,
    color: "#81C784",
    fontWeight: "600",
    marginTop: 2,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#2E7D32",
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 8,
    shadowColor: "#2E7D32",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  addButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  list: {
    padding: 16,
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
  cardRed: { borderLeftWidth: 4, borderLeftColor: "#C62828" },
  cardYellow: { borderLeftWidth: 4, borderLeftColor: "#F9A825" },
  cardGreen: { borderLeftWidth: 4, borderLeftColor: "#2E7D32" },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 32,
  },
  loadingText: { fontSize: 16, color: "#9E9E9E" },
  errorText: {
    fontSize: 14,
    color: "#9E9E9E",
    textAlign: "center",
    lineHeight: 20,
  },
  retryButton: {
    marginTop: 4,
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: "#2E7D32",
    borderRadius: 20,
  },
  retryText: { color: "#FFFFFF", fontWeight: "700", fontSize: 14 },
  emptyTitle: { fontSize: 20, fontWeight: "600", color: "#424242", marginTop: 8 },
  emptySubtitle: {
    fontSize: 14,
    color: "#9E9E9E",
    textAlign: "center",
    lineHeight: 20,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    gap: 12,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1B5E20",
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#546E7A",
    marginBottom: -4,
  },
  textInput: {
    borderWidth: 1.5,
    borderColor: "#C8E6C9",
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: "#212121",
    backgroundColor: "#F8FAF8",
  },
  previewRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  previewLabel: { fontSize: 13, color: "#757575" },
  saveButton: {
    backgroundColor: "#2E7D32",
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 8,
    shadowColor: "#2E7D32",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { color: "#FFFFFF", fontWeight: "700", fontSize: 16 },
});
