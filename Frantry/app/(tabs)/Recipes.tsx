import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Card, Button } from 'react-native-paper';
import Typewriter from 'react-native-typewriter';

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
      const response = await fetch('http://10.74.126.23:5000/api/items/recipes');
      const text = await response.json();
      console.log(text.recipe);
      const fetchedRecipe: Recipe = {
        id: '1',
        title: text.title,
        description: 'This recipe was fetched from the API.',
        content: text.content, // assuming API returns { recipeContent: 'Some recipe string here' }
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
          <Text style={styles.recipeDescription}>{item.description}</Text>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="black" />
        </View>
      ) : selectedRecipe ? (
        // When a recipe is selected, show the content in a scrollable area,
        // with a fixed "Back to Recipes" button at the bottom.
        <>
          <ScrollView contentContainerStyle={styles.recipeDetailScroll}>
            <View style={styles.recipeDetail}>
              <Text style={styles.recipeDetailTitle}>{selectedRecipe.title}</Text>
              <Typewriter style={styles.recipeDetailDescription} typing={1} minDelay={20}>
                {selectedRecipe.content}
              </Typewriter>
            </View>
          </ScrollView>
          <View style={styles.fixedBackButtonContainer}>
            <Button
              mode="contained"
              onPress={() => setSelectedRecipe(null)}
              style={styles.backButton}
            >
              Back to Recipes
            </Button>
          </View>
        </>
      ) : (
        <View style={styles.content}>
          <FlatList
            data={[
              {
                id: '1',
                title: 'Spaghetti Carbonara',
                description: 'A classic pasta dish.',
                content: 'This is a simple yet delicious spaghetti carbonara recipe.',
              },
            ]}
            renderItem={renderRecipeItem}
            keyExtractor={(item) => item.id}
          />
        </View>
      )}

      {/* Display the "Generate Recipe" button only when no recipe is selected */}
      {!isLoading && !selectedRecipe && (
        <View style={styles.footer}>
          <Button mode="contained" onPress={fetchRecipe} style={styles.fetchButton}>
            Generate Recipe
          </Button>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recipeDetailScroll: {
    flexGrow: 1,
    paddingBottom: 80, // Reserve space for the fixed back button
  },
  content: {
    flex: 1,
  },
  card: {
    marginVertical: 12,
    borderRadius: 10,
    elevation: 5,
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
    width: '100%',
    alignItems: 'flex-start',
    paddingVertical: 20,
  },
  recipeDetailTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'left',
  },
  recipeDetailDescription: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'left',
  },
  fixedBackButtonContainer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
  },
  backButton: {
    borderRadius: 8,
  },
  footer: {
    paddingBottom: 20,
  },
  fetchButton: {
    borderRadius: 8,
  },
});

export default RecipesScreen;
