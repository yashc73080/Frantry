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

const SERVER_URL = "https://frantry.onrender.com"

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
      const response = await fetch(`${SERVER_URL}/api/items/recipes`);
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
            contentContainerStyle={{ marginTop: 25 }}
            data={[
              {
                id: '1',
                title: 'Spaghetti Carbonara',
                description: 'A classic pasta dish made with eggs, cheese, pancetta, and pepper.',
                content: 'This is a simple yet delicious spaghetti carbonara recipe. Start by cooking the spaghetti in salted boiling water. In a separate pan, cook the pancetta until crispy. In a bowl, whisk together eggs and grated cheese. Once the spaghetti is cooked, drain it and add it to the pan with pancetta. Remove from heat and quickly mix in the egg and cheese mixture, stirring constantly to create a creamy sauce. Season with pepper and serve immediately.',
              },
              {
                id: '2',
                title: 'Chicken Alfredo',
                description: 'A creamy pasta dish made with chicken, cream, and Parmesan cheese.',
                content: 'This is a rich and creamy chicken alfredo recipe. Start by cooking the fettuccine in salted boiling water. In a separate pan, cook the chicken breasts until golden brown and fully cooked. Remove the chicken from the pan and set aside. In the same pan, add butter and minced garlic, cooking until fragrant. Pour in heavy cream and bring to a simmer. Add grated Parmesan cheese and stir until melted and the sauce thickens. Slice the cooked chicken and add it to the sauce. Drain the fettuccine and add it to the pan, tossing to coat the pasta in the creamy sauce. Serve immediately with additional Parmesan cheese on top.',
              },
              {
                id: '3',
                title: 'Beef Stroganoff',
                description: 'A savory dish made with beef, mushrooms, and a creamy sauce.',
                content: 'This is a hearty beef stroganoff recipe. Start by cooking egg noodles in salted boiling water. In a separate pan, sauté sliced mushrooms until they release their moisture and become golden brown. Remove the mushrooms from the pan and set aside. In the same pan, cook thinly sliced beef until browned. Remove the beef and set aside. In the same pan, add butter and minced onions, cooking until softened. Stir in flour to create a roux, then gradually add beef broth, stirring constantly until the sauce thickens. Add sour cream and return the beef and mushrooms to the pan, stirring to combine. Serve the beef stroganoff over the cooked egg noodles and garnish with fresh parsley.',
              },
              {
                id: '4',
                title: 'Vegetable Stir Fry',
                description: 'A quick and healthy dish made with a variety of fresh vegetables.',
                content: 'This is a vibrant vegetable stir fry recipe. Start by preparing a mix of your favorite vegetables such as bell peppers, broccoli, carrots, and snap peas. In a large pan or wok, heat some oil over high heat. Add minced garlic and ginger, cooking until fragrant. Add the vegetables and stir fry for a few minutes until they are tender-crisp. In a small bowl, mix soy sauce, hoisin sauce, and a bit of cornstarch. Pour the sauce over the vegetables and stir to coat evenly. Cook for another minute until the sauce thickens. Serve the vegetable stir fry over steamed rice or noodles.',
              },
              {
                id: '5',
                title: 'Shrimp Scampi',
                description: 'A classic seafood dish made with shrimp, garlic, and lemon butter sauce.',
                content: 'This is a delicious shrimp scampi recipe. Start by cooking linguine in salted boiling water. In a large pan, melt butter and add minced garlic, cooking until fragrant. Add shrimp to the pan and cook until they turn pink. Remove the shrimp and set aside. In the same pan, add white wine and lemon juice, bringing it to a simmer. Return the shrimp to the pan and toss to coat in the sauce. Add cooked linguine to the pan and toss everything together. Garnish with chopped parsley and serve immediately with a wedge of lemon on the side.',
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
    marginTop: 10, // Adjust this value to move the title lower
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
