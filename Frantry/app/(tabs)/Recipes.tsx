import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Card, Button } from 'react-native-paper';

// Define types for recipe data
interface Recipe {
  id: string;
  title: string;
  description: string;
  content: string; // Content of the recipe
}

const RecipesScreen: React.FC = () => {
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Function to fetch the recipe from the API
  const fetchRecipe = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('https://example.com/getRecipe');
      const data = await response.json();
      const fetchedRecipe: Recipe = {
        id: '1',
        title: 'Generated Recipe',
        description: 'This recipe was fetched from the API.',
        content: data.recipeContent, // assuming API returns { recipeContent: 'Some recipe string here' }
      };
      setSelectedRecipe(fetchedRecipe);
    } catch (error) {
      console.error('Error fetching recipe:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle selecting a recipe
  const handleSelectRecipe = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
  };

  // Render each recipe item in the list
  const renderRecipeItem = ({ item }: { item: Recipe }) => (
    <TouchableOpacity onPress={() => handleSelectRecipe(item)}>
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.recipeTitle}>{item.title}</Text>
          <Text style={styles.recipeDescription}>
            {item.description}
          </Text>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {isLoading ? (
        <ActivityIndicator size="large" color="black" />
      ) : selectedRecipe ? (
        <View style={styles.recipeDetail}>
          <Text style={styles.recipeDetailTitle}>
            {selectedRecipe.title}
          </Text>
          <Text style={styles.recipeDetailDescription}>
            {selectedRecipe.content}
          </Text>
          <Button mode="contained" onPress={() => setSelectedRecipe(null)} style={styles.backButton}>
            Back to Recipes
          </Button>
        </View>
      ) : (
        <View>
          <Button mode="contained" onPress={fetchRecipe} style={styles.fetchButton}>
            Generate Recipe
          </Button>
          <FlatList
            data={[{
                id: '1',
                title: 'Spaghetti Carbonara',
                description: 'A classic pasta dish.',
                content: 'This is a simple yet delicious spaghetti carbonara recipe.' // Add the content field
            }]}
            renderItem={renderRecipeItem}
            keyExtractor={(item) => item.id}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  card: {
    marginVertical: 12,
    borderRadius: 10,
    elevation: 5, // Adds shadow for Android
  },
  recipeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  recipeDescription: {
    fontSize: 14,
    marginTop: 5,
  },
  recipeDetail: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  recipeDetailTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  recipeDetailDescription: {
    fontSize: 16,
    marginBottom: 20,
  },
  backButton: {
    marginTop: 20,
    borderRadius: 8,
  },
  fetchButton: {
    marginBottom: 20,
    borderRadius: 8,
  },
});

export default RecipesScreen;
