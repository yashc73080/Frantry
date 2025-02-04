import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Card, Title, Paragraph, Button } from 'react-native-paper';

export default function HomeScreen() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Header Card with image and welcome text */}
      <Card style={styles.headerCard}>
        <Card.Cover 
          source={require('@/assets/images/partial-react-logo.png')} 
          style={styles.headerImage} 
        />
        <Card.Content style={styles.headerContent}>
          <Title style={styles.headerTitle}>Welcome to Frantry!</Title>
          <Paragraph style={styles.headerParagraph}>
            Discover a smarter way to manage your kitchen. With Frantry, you can scan receipts, view your pantry items and expiry dates, and generate creative recipe ideas—all in one place.
          </Paragraph>
        </Card.Content>
      </Card>

      {/* Steps Cards */}
      <View style={styles.stepsContainer}>
        <Card style={styles.stepCard}>
          <Card.Content>
            <Title>Step 1: Scan Receipts</Title>
            <Paragraph>
              Use the Scanner tab to quickly capture your grocery receipts.
            </Paragraph>
          </Card.Content>
        </Card>

        <Card style={styles.stepCard}>
          <Card.Content>
            <Title>Step 2: View Pantry</Title>
            <Paragraph>
              Easily check your pantry items along with their expiry dates.
            </Paragraph>
          </Card.Content>
        </Card>

        <Card style={styles.stepCard}>
          <Card.Content>
            <Title>Step 3: Get Recipe Ideas</Title>
            <Paragraph>
              Generate creative recipe suggestions based on the ingredients you have.
            </Paragraph>
          </Card.Content>
        </Card>
      </View>

      {/* Optional call-to-action button */}
      <Button mode="contained" style={styles.ctaButton} onPress={() => { /* Handle button press */ }}>
        Get Started
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 32,
    backgroundColor: '#fff',
  },
  headerCard: {
    marginBottom: 24,
    elevation: 4,
    borderRadius: 8,
    overflow: 'hidden',
  },
  headerImage: {
    height: 200,
  },
  headerContent: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 24,
    marginBottom: 8,
  },
  headerParagraph: {
    fontSize: 16,
    textAlign: 'center',
  },
  stepsContainer: {
    marginBottom: 24,
  },
  stepCard: {
    marginBottom: 16,
    elevation: 2,
    borderRadius: 8,
  },
  ctaButton: {
    marginHorizontal: 16,
    borderRadius: 8,
  },
});

