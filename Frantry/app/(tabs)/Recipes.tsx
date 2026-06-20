import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import api from "@/lib/api";

interface Recipe {
  title: string;
  ingredients: string[];
  steps: string[];
  estimatedTime: string;
}

export default function RecipesScreen() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [emptyPantry, setEmptyPantry] = useState(false);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const fetchRecipes = async () => {
    setLoading(true);
    setError("");
    setEmptyPantry(false);
    setRecipes([]);
    setExpandedIndex(null);

    try {
      const response = await api.get("/api/items/recipes");
      const data = response.data;

      if (data.emptyPantry) {
        setEmptyPantry(true);
      } else {
        setRecipes(data.recipes || []);
        if (data.recipes?.length > 0) setExpandedIndex(0);
      }
    } catch (e: any) {
      setError(
        e?.response?.data?.error ||
          "Could not generate recipes. Make sure you have items in your pantry."
      );
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Recipes</Text>
        <Text style={styles.headerSubtitle}>Generated from your pantry</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2E7D32" />
            <Text style={styles.loadingText}>Generating recipes from your pantry…</Text>
            <Text style={styles.loadingSubText}>This may take up to 30 seconds</Text>
          </View>
        ) : emptyPantry ? (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="fridge-outline" size={72} color="#C8E6C9" />
            <Text style={styles.emptyTitle}>Pantry is empty</Text>
            <Text style={styles.emptySubtitle}>
              Scan some grocery receipts first, then come back for recipe ideas.
            </Text>
          </View>
        ) : error ? (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="alert-circle-outline" size={64} color="#FFCDD2" />
            <Text style={styles.errorTitle}>Could not generate recipes</Text>
            <Text style={styles.errorSubtitle}>{error}</Text>
          </View>
        ) : recipes.length > 0 ? (
          <View style={styles.recipeList}>
            {recipes.map((recipe, index) => (
              <RecipeCard
                key={index}
                recipe={recipe}
                index={index}
                expanded={expandedIndex === index}
                onToggle={() => toggleExpand(index)}
              />
            ))}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="chef-hat" size={72} color="#C8E6C9" />
            <Text style={styles.emptyTitle}>Ready to cook?</Text>
            <Text style={styles.emptySubtitle}>
              Tap "Generate Recipes" to get AI-powered recipe ideas from your pantry items.
            </Text>
          </View>
        )}
      </ScrollView>

      {!loading && (
        <View style={styles.footer}>
          <TouchableOpacity style={styles.generateButton} onPress={fetchRecipes}>
            <MaterialCommunityIcons name="chef-hat" size={20} color="#FFFFFF" />
            <Text style={styles.generateButtonText}>
              {recipes.length > 0 ? "Regenerate Recipes" : "Generate Recipes"}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

function RecipeCard({
  recipe,
  index,
  expanded,
  onToggle,
}: {
  recipe: Recipe;
  index: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  const colors = ["#1B5E20", "#4A148C", "#B71C1C", "#E65100", "#006064"];
  const accentColor = colors[index % colors.length];

  return (
    <View style={styles.recipeCard}>
      <TouchableOpacity
        style={styles.recipeCardHeader}
        onPress={onToggle}
        activeOpacity={0.8}
      >
        <View style={[styles.recipeIndex, { backgroundColor: accentColor }]}>
          <Text style={styles.recipeIndexText}>{index + 1}</Text>
        </View>
        <View style={styles.recipeTitleBlock}>
          <Text style={styles.recipeTitle}>{recipe.title}</Text>
          <View style={styles.recipeMeta}>
            <MaterialCommunityIcons name="clock-outline" size={13} color="#9E9E9E" />
            <Text style={styles.recipeTime}>{recipe.estimatedTime}</Text>
          </View>
        </View>
        <MaterialCommunityIcons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={22}
          color="#9E9E9E"
        />
      </TouchableOpacity>

      {expanded && (
        <View style={styles.recipeBody}>
          {/* Ingredients */}
          <Text style={[styles.sectionLabel, { color: accentColor }]}>Ingredients</Text>
          <View style={styles.ingredientChips}>
            {recipe.ingredients.map((ing, i) => (
              <View key={i} style={styles.chip}>
                <Text style={styles.chipText}>{ing}</Text>
              </View>
            ))}
          </View>

          {/* Steps */}
          <Text style={[styles.sectionLabel, { color: accentColor }]}>Instructions</Text>
          {recipe.steps.map((step, i) => (
            <View key={i} style={styles.stepRow}>
              <View style={[styles.stepNumber, { backgroundColor: accentColor }]}>
                <Text style={styles.stepNumberText}>{i + 1}</Text>
              </View>
              <Text style={styles.stepText}>{step}</Text>
            </View>
          ))}
        </View>
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
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1B5E20",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#81C784",
    marginTop: 2,
    fontWeight: "500",
  },
  content: {
    padding: 16,
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    paddingTop: 60,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#424242",
    textAlign: "center",
  },
  loadingSubText: {
    fontSize: 13,
    color: "#9E9E9E",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    paddingTop: 60,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#424242",
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#9E9E9E",
    textAlign: "center",
    lineHeight: 20,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#B71C1C",
  },
  errorSubtitle: {
    fontSize: 14,
    color: "#9E9E9E",
    textAlign: "center",
    lineHeight: 20,
  },
  recipeList: {
    gap: 12,
  },
  recipeCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  recipeCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12,
  },
  recipeIndex: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  recipeIndexText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 16,
  },
  recipeTitleBlock: {
    flex: 1,
  },
  recipeTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#212121",
  },
  recipeMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 3,
  },
  recipeTime: {
    fontSize: 12,
    color: "#9E9E9E",
  },
  recipeBody: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: "#F5F5F5",
    paddingTop: 12,
    gap: 12,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  ingredientChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 4,
  },
  chip: {
    backgroundColor: "#F1F8E9",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: "#C8E6C9",
  },
  chipText: {
    fontSize: 13,
    color: "#2E7D32",
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 1,
    flexShrink: 0,
  },
  stepNumberText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    color: "#424242",
    lineHeight: 21,
  },
  footer: {
    padding: 16,
    paddingBottom: 24,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E8F5E9",
  },
  generateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#2E7D32",
    borderRadius: 14,
    paddingVertical: 15,
    shadowColor: "#2E7D32",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  generateButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
