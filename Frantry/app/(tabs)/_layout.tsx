import * as React from "react";
import { BottomNavigation } from "react-native-paper";
import HomeScreen from "./index";
import PantryList from "./Pantry";
import Scanner from "./scanner";
import SettingsScreen from "./Settings";
import RecipesScreen from "./Recipes";

const MyComponent = () => {
  const [index, setIndex] = React.useState(0);
  const [routes] = React.useState([
    { key: "pantry", title: "My Pantry", focusedIcon: "wardrobe", unfocusedIcon: "wardrobe-outline" },
    { key: "scanner", title: "Camera", focusedIcon: "camera", unfocusedIcon: "camera-outline" },
    { key: "recipes", title: "Recipes", focusedIcon: "food-croissant", unfocusedIcon: "food-croissant" },
    { key: "settings", title: "Settings", focusedIcon: "cog", unfocusedIcon: "cog-outline" },
  ]);

  const renderScene = BottomNavigation.SceneMap({
    pantry: PantryList,
    scanner: Scanner,
    recipes: RecipesScreen,
    settings: SettingsScreen,
  });

  return (
    <BottomNavigation
      navigationState={{ index, routes }}
      onIndexChange={setIndex}
      renderScene={renderScene}
      barStyle={{ backgroundColor: "#FFFFFF" }}
      activeColor="#2E7D32"
      inactiveColor="#78909C"
    />
  );
};

export default MyComponent;
