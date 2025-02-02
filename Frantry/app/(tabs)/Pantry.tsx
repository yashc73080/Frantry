import React, { useState, useEffect, useRef } from 'react';
import { View, Text, FlatList, StyleSheet, Animated } from 'react-native';

// Sample Pantry data (Replace with actual data when backend is integrated)
const pantryData = [
  { id: '1', name: 'Milk', expiryDate: '2025-02-05' },
  { id: '2', name: 'Eggs', expiryDate: '2025-02-03' },
  { id: '3', name: 'Tomatoes', expiryDate: '2025-01-10' },
  { id: '4', name: 'Chicken Breast', expiryDate: '2025-02-07' },
  { id: '5', name: 'Bread', expiryDate: '2025-02-01' },
  { id: '6', name: 'Cheese', expiryDate: '2025-02-10' },
  { id: '7', name: 'Lettuce', expiryDate: '2025-02-08' },
  { id: '8', name: 'Carrots', expiryDate: '2025-02-12' },
  { id: '9', name: 'Potatoes', expiryDate: '2025-02-20' },
  { id: '10', name: 'Butter', expiryDate: '2025-02-15' },
  { id: '11', name: 'Cucumbers', expiryDate: '2025-02-18' },
  { id: '12', name: 'Yogurt', expiryDate: '2025-02-22' },
  { id: '13', name: 'Apples', expiryDate: '2025-02-28' },
  { id: '14', name: 'Oranges', expiryDate: '2025-03-05' },
  { id: '15', name: 'Spinach', expiryDate: '2025-02-10' },
  // Add more items as needed
];

// Helper function to determine item status based on expiry
const getExpiryStatus = (expiryDate: string) => {
  const currentDate = new Date();
  const itemExpiryDate = new Date(expiryDate);
  const daysLeft = (itemExpiryDate.getTime() - currentDate.getTime()) / (1000 * 3600 * 24);

  if (daysLeft <= 0) return 'expired'; // Item has expired
  if (daysLeft <= 3) return 'close'; // Item will expire soon
  return 'fresh'; // Item is fresh
};

const PantryList = () => {
  const fadeAnim = useRef(new Animated.Value(0)).current; // Declare ref here

  // Sort pantryData by expiryDate before rendering
  const sortedPantryData = pantryData.sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());

  const renderItem = ({ item }: any) => {
    const status = getExpiryStatus(item.expiryDate);

    return (
      <Animated.View style={[styles.itemContainer, styles[status], { opacity: fadeAnim }]}>
        <Text style={styles.itemText}>{item.name}</Text>
        <Text style={styles.expiryText}>Expires on: {item.expiryDate}</Text>
      </Animated.View>
    );
  };

  // Using useEffect to trigger the fade animation once the component mounts
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]); // Fade animation triggers only once on component mount

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Pantry List</Text>
      <FlatList
        data={sortedPantryData} // Use sorted data here
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
    paddingHorizontal: 16,
    backgroundColor: '#f2e2c4', // Light wood-like background color
  },
  header: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#6b4f32', // Dark brown text for rustic feel
    textAlign: 'center',
    fontFamily: 'Arial',
    textTransform: 'uppercase', // Adding a rustic capitalized feel
  },
  itemContainer: {
    padding: 18,
    marginVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.7)', // Slight transparency for wood-like effect
  },
  itemText: {
    fontSize: 20,
    fontWeight: '500',
    color: '#6b4f32', // Dark brown for the item text
    fontFamily: 'Georgia', // Adding a serif font for rustic charm
  },
  expiryText: {
    fontSize: 14,
    marginTop: 6,
    color: '#777',
    fontFamily: 'Georgia', // Ensuring consistency with the rustic style
  },
  fresh: {
    backgroundColor: '#e8f5e9', // light green
    borderColor: '#66bb6a',
  },
  close: {
    backgroundColor: '#fff9c4', // light yellow
    borderColor: '#fff176',
  },
  expired: {
    backgroundColor: '#ffebee', // light red
    borderColor: '#ef5350',
  },
});

export default PantryList;
