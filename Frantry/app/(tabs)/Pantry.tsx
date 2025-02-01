// PantryList.tsx
import React from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';

// Sample Pantry data (Replace with actual data when backend is integrated)
const pantryData = [
  { id: '1', name: 'Milk', expiryDate: '2025-02-05' },
  { id: '2', name: 'Eggs', expiryDate: '2025-02-03' },
  { id: '3', name: 'Tomatoes', expiryDate: '2025-01-10' },
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
  const renderItem = ({ item }: any) => {
    const status = getExpiryStatus(item.expiryDate);
    return (
      <View style={[styles.itemContainer, styles[status]]}>
        <Text style={styles.itemText}>{item.name}</Text>
        <Text style={styles.expiryText}>Expires on: {item.expiryDate}</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Pantry List</Text>
      <FlatList
        data={pantryData}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
    paddingHorizontal: 16,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  itemContainer: {
    padding: 16,
    marginVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  itemText: {
    fontSize: 18,
  },
  expiryText: {
    fontSize: 14,
    marginTop: 4,
  },
  fresh: {
    backgroundColor: '#f7f0ef', // light green
    borderColor: '#81c784',
    borderWidth: 5,
  },
  close: {
    backgroundColor: '#f7f0ef', // light yellow
    borderColor: '#fff176',
    borderWidth: 5,
  },
  expired: {
    backgroundColor: '#f7f0ef', // light red
    borderColor: '#ea3008',
    borderWidth: 5,
  },
});

export default PantryList;
