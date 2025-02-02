// Language: typescript
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function BlurTabBarBackground() {
  return (
    <BlurView
      tint="systemChromeMaterial"
      intensity={100}
      style={StyleSheet.absoluteFill}
    />
  );
}

export function useBottomTabOverflow() {
  // Try to get the tab bar height; fallback to 0 if not available.
  let tabHeight = 0;
  try {
    tabHeight = useBottomTabBarHeight();
  } catch (error) {
    tabHeight = 0;
  }
  const { bottom } = useSafeAreaInsets();
  return tabHeight ? tabHeight - bottom : 0;
}