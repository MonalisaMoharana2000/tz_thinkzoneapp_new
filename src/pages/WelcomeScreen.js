// WelcomeScreen.js
import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  SafeAreaView,
  ScrollView,
  BackHandler,
  Alert,
  AppState,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

const { width, height } = Dimensions.get('window');
const isTablet = width >= 768;

const WelcomeScreen = ({ navigation, route, authContext }) => {
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    const handleAppStateChange = nextAppState => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        console.log('App has come to the foreground');
      }
      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener(
      'change',
      handleAppStateChange,
    );

    const backAction = () => {
      if (appState.current === 'active') {
        Alert.alert('Exit App', 'Are you sure you want to exit?', [
          {
            text: 'Cancel',
            onPress: () => null,
            style: 'cancel',
          },
          {
            text: 'YES',
            onPress: () => BackHandler.exitApp(),
          },
        ]);
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction,
    );

    return () => {
      backHandler.remove();
      subscription.remove();
    };
  }, []);

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        onPress: async () => {
          try {
            await authContext.signOut();
            navigation.replace('Login');
          } catch (error) {
            Alert.alert('Error', 'Failed to logout. Please try again.');
          }
        },
        style: 'destructive',
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoCircle}>
            <MaterialIcons
              name="school"
              size={isTablet ? 48 : 40}
              color="#FF6B35"
            />
          </View>
          <Text style={styles.title}>ଓଡ଼ିଆ ପଢିବା ମୂଲ୍ୟାୟନ</Text>
          <Text style={styles.subtitle}>ଶିକ୍ଷାର ମୂଲ୍ୟ ବଢ଼ାଇବା</Text>
        </View>

        {/* Hero Icon */}
        <View style={styles.heroSection}>
          <View style={styles.heroCircle}>
            <MaterialIcons
              name="assessment"
              size={isTablet ? 80 : 64}
              color="#FF6B35"
            />
          </View>
          <Text style={styles.heroText}>ଉନ୍ନତ ଶିକ୍ଷା ପାଇଁ ଆଧୁନିକ ମୂଲ୍ୟାୟନ</Text>
        </View>

        {/* Action Cards */}
        <View style={styles.actionSection}>
          <Text style={styles.sectionTitle}>ମୂଲ୍ୟାୟନ ପ୍ରକାର ଚୟନ କରନ୍ତୁ</Text>

          {/* OCR Card */}
          <TouchableOpacity
            style={[styles.actionCard, styles.ocrCard]}
            onPress={() => navigation.replace('ImageCapture')}
            activeOpacity={0.9}
          >
            <View style={styles.cardContent}>
              <View style={styles.cardIcon}>
                <MaterialIcons
                  name="image"
                  size={isTablet ? 40 : 32}
                  color="#5856D6"
                />
                <View style={styles.cardTag}>
                  <Text style={styles.tagText}>OCR</Text>
                </View>
              </View>
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>ପାଠ୍ୟ ପ୍ରତିରୂପ ମୂଲ୍ୟାୟନ</Text>
                <Text style={styles.cardDescription}>
                  ଛବି ଉଠାଇ ପଢିବା କ୍ଷମତା ପରୀକ୍ଷା କରନ୍ତୁ
                </Text>
              </View>
              <MaterialIcons name="arrow-forward" size={24} color="#5856D6" />
            </View>
          </TouchableOpacity>

          {/* ORF Card */}
          <TouchableOpacity
            style={[styles.actionCard, styles.orfCard]}
            onPress={() => navigation.replace('AssessmentFlow')}
            activeOpacity={0.9}
          >
            <View style={styles.cardContent}>
              <View style={styles.cardIcon}>
                <MaterialIcons
                  name="mic"
                  size={isTablet ? 40 : 32}
                  color="#FF9500"
                />
                <View style={[styles.cardTag, styles.orfTag]}>
                  <Text style={styles.tagText}>ORF</Text>
                </View>
              </View>
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>ମୌଖିକ ପଢିବା ମୂଲ୍ୟାୟନ</Text>
                <Text style={styles.cardDescription}>
                  ଶବ୍ଦ ରେକର୍ଡ କରି ପଢିବା କ୍ଷମତା ପରୀକ୍ଷା କରନ୍ତୁ
                </Text>
              </View>
              <MaterialIcons name="arrow-forward" size={24} color="#FF9500" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Instructions */}
        <View style={styles.instructions}>
          <Text style={styles.instructionsTitle}>ସୂଚନା:</Text>
          <View style={styles.instructionList}>
            <View style={styles.instructionItem}>
              <View style={styles.instructionBullet} />
              <Text style={styles.instructionText}>ଇଣ୍ଟରନେଟ ସଂଯୋଗ ଆବଶ୍ୟକ</Text>
            </View>
            <View style={styles.instructionItem}>
              <View style={styles.instructionBullet} />
              <Text style={styles.instructionText}>
                ମାଇକ୍ରୋଫୋନ ଅନୁମତି ଦିଅନ୍ତୁ (ORF ପାଇଁ)
              </Text>
            </View>
            {/* <View style={styles.instructionItem}>
              <View style={styles.instructionBullet} />
              <Text style={styles.instructionText}>
                ପ୍ରତ୍ୟେକ ରେକର୍ଡିଂ 30 ସେକେଣ୍ଡର
              </Text>
            </View> */}
          </View>
        </View>
      </ScrollView>

      {/* Footer with Logout Button */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>ଓଡ଼ିଶା ସରକାର | ଶିକ୍ଷା ବିଭାଗ</Text>

        {/* Logout Button */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <View style={styles.logoutButtonContent}>
            <MaterialIcons name="logout" size={18} color="#fff" />
            <Text style={styles.logoutButtonText}>ଲଗ୍‌ଆଉଟ୍</Text>
          </View>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120, // Increased to accommodate the footer with button
  },
  header: {
    alignItems: 'center',
    paddingTop: isTablet ? 40 : 30,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: '#FFF8F0',
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
  },
  logoCircle: {
    width: isTablet ? 100 : 80,
    height: isTablet ? 100 : 80,
    borderRadius: isTablet ? 50 : 40,
    backgroundColor: '#FFF0E6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    borderWidth: 3,
    borderColor: '#FFE4CC',
  },
  title: {
    fontSize: isTablet ? 26 : 22,
    fontWeight: '800',
    color: '#FF6B35',
    textAlign: 'center',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: isTablet ? 18 : 16,
    color: '#666666',
    textAlign: 'center',
    fontWeight: '500',
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  heroCircle: {
    width: isTablet ? 140 : 120,
    height: isTablet ? 140 : 120,
    borderRadius: isTablet ? 70 : 60,
    backgroundColor: '#FFF0E6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  heroText: {
    fontSize: isTablet ? 18 : 16,
    color: '#333333',
    textAlign: 'center',
    fontWeight: '600',
    maxWidth: '80%',
    lineHeight: 24,
  },
  actionSection: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: isTablet ? 20 : 18,
    fontWeight: '700',
    color: '#333333',
    textAlign: 'center',
    marginBottom: 20,
  },
  actionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 15,
    borderWidth: 2,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  ocrCard: {
    borderColor: '#E6E5FF',
  },
  orfCard: {
    borderColor: '#FFEACC',
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardIcon: {
    position: 'relative',
  },
  cardTag: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#5856D6',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  orfTag: {
    backgroundColor: '#FF9500',
  },
  tagText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },
  cardText: {
    flex: 1,
    marginLeft: 15,
    marginRight: 10,
  },
  cardTitle: {
    fontSize: isTablet ? 18 : 16,
    fontWeight: '700',
    color: '#333333',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: isTablet ? 14 : 12,
    color: '#666666',
    lineHeight: 18,
  },
  instructions: {
    backgroundColor: '#F0F8FF',
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 20,
    marginBottom: 30,
    borderLeftWidth: 4,
    borderLeftColor: '#4A90E2',
  },
  instructionsTitle: {
    fontSize: isTablet ? 18 : 16,
    fontWeight: '700',
    color: '#4A90E2',
    marginBottom: 15,
  },
  instructionList: {
    gap: 12,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  instructionBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4A90E2',
    marginTop: 8,
    marginRight: 12,
  },
  instructionText: {
    fontSize: isTablet ? 14 : 13,
    color: '#444444',
    flex: 1,
    lineHeight: 20,
  },
  // Updated Footer with Logout Button
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#888888',
    fontWeight: '500',
    marginBottom: 10,
  },
  logoutButton: {
    backgroundColor: '#FF6B35',
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  logoutButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default WelcomeScreen;
