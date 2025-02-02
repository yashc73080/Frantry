import React, { useState, useEffect, useRef } from 'react';
import { View, Text, FlatList, StyleSheet, Animated } from 'react-native';
import axios from 'axios';

type PantryItem = {
  id: string;
  name: string;
  daysUntilExpiration: number;
};

// Helper function to determine item status based on expiry
const getExpiryStatus = (daysLeft: string) => {
  
  switch(daysLeft){
    case 'high':
        return 'expired';
    case 'medium':
        return 'close';
    default:
      return 'fresh';
  }
};

const PantryList = () => {
  const [pantryData, setPantryData] = useState<PantryItem[]>([]);
  const fadeAnim = useRef(new Animated.Value(0)).current; // Declare ref here

  const [loading, setLoading] = useState(true); // State for loading indicator
  const [error, setError] = useState(''); // State for error message

  useEffect(() => {
    const fetchPantryData = async () => {
      try {
        // Replace with your actual backend API URL
        const response = await axios.get('http://10.74.126.23:5000/api/items/getAllItems');
        setPantryData(response.data as PantryItem[]); // Update state with fetched data
        setLoading(false); // Set loading to false after data is fetched
      } catch (err) {
        setError('Failed to fetch pantry data'); // Handle any errors
        setLoading(false); // Set loading to false even if there's an error
      }
    };

    fetchPantryData(); // Call the fetch function when component mounts
  }, []);

  // Sort pantryData by expiryDate before rendering
  const sortedPantryData = pantryData;

  const renderItem = ({ item }: any) => {
    const status = getExpiryStatus(item.expiryLevel);

    return (
      <Animated.View style={[styles.itemContainer, styles[status], { opacity: fadeAnim }]}>
        <Text style={styles.itemText}>{item.name}</Text>
        <Text style={styles.expiryText}>Days Remaining: {item.daysUntilExpiration}</Text>
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
        keyExtractor={(item, index) => item.id?.toString() || index.toString()} // Fallback to index if id is missing
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
    marginTop: 40, // Added marginTop to push the title down
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
