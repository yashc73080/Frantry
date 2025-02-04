import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, Animated, RefreshControl } from 'react-native';
import axios from 'axios';

const SERVER_URL = "https://frantry.onrender.com"

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
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false); // State for pull-to-refresh

  // Function to fetch pantry data
  const fetchPantryData = async () => {
    try {
      const response = await axios.get(`${SERVER_URL}/api/items/getAllItems`);
      setPantryData(response.data as PantryItem[]);
      setLoading(false);
      setError('');
    } catch (err) {
      setError('Failed to fetch pantry data');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPantryData();
  }, []);

  // Pull-to-refresh function
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchPantryData();
    setRefreshing(false);
  }, []);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const renderItem = ({ item }: any) => {
    const status = getExpiryStatus(item.expiryLevel);

    return (
      <Animated.View style={[styles.itemContainer, styles[status], { opacity: fadeAnim }]}>
        <Text style={styles.itemText}>{item.name}</Text>
        <Text style={styles.expiryText}>Days Remaining: {item.daysUntilExpiration}</Text>
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Pantry List</Text>
      <FlatList
        data={pantryData}
        keyExtractor={(item, index) => item.id?.toString() || index.toString()}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
    paddingHorizontal: 16,
    backgroundColor: '#f2e2c4',
  },
  header: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#6b4f32',
    textAlign: 'center',
    fontFamily: 'Arial',
    textTransform: 'uppercase',
    marginTop: 40,
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
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
  },
  itemText: {
    fontSize: 20,
    fontWeight: '500',
    color: '#6b4f32',
    fontFamily: 'Georgia',
  },
  expiryText: {
    fontSize: 14,
    marginTop: 6,
    color: '#777',
    fontFamily: 'Georgia',
  },
  fresh: {
    backgroundColor: '#e8f5e9',
    borderColor: '#66bb6a',
  },
  close: {
    backgroundColor: '#fff9c4',
    borderColor: '#fff176',
  },
  expired: {
    backgroundColor: '#ffebee',
    borderColor: '#ef5350',
  },
  errorText: {
    textAlign: 'center',
    color: 'red',
    marginTop: 10,
  },
});

export default PantryList;
