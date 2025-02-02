import * as React from 'react';
import { BottomNavigation, Text } from 'react-native-paper';
import HomeScreen from './index';
import PantryList from './Pantry';
import Scanner from './scanner';
import SettingsScreen from './Settings';
import RecipesScreen from './Recipes';



const MyComponent = () => {
  const [index, setIndex] = React.useState(0);
  const [routes] = React.useState([
    { key: 'pantry', title: 'My Pantry', focusedIcon: 'wardrobe', unfocusedIcon:'wardrobe-outline' },
    { key: 'scanner', title: 'Camera', focusedIcon: 'camera',unfocusedIcon: 'camera-outline' },
    { key: 'favorites', title: 'Favorites', focusedIcon: 'heart', unfocusedIcon: 'heart-outline' },
    { key: 'settings', title: 'Settings', focusedIcon: 'cog', unfocusedIcon: 'cog-outline' },
    { key: 'recipes', title: 'Recipes', focusedIcon: 'food-croissant', unfocusedIcon: 'food-croissant' }
  ]);

  const renderScene = BottomNavigation.SceneMap({
    pantry: PantryList,
    scanner: Scanner,
    favorites: HomeScreen,
    settings: SettingsScreen,
    recipes: RecipesScreen
  });

  return (
    <BottomNavigation
      navigationState={{ index, routes }}
      onIndexChange={setIndex}
      renderScene={renderScene}
    />
  );
};

export default MyComponent;
