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

const WelcomeScreen = ({ navigation }) => {
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    // Handle app state changes
    const handleAppStateChange = nextAppState => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // App has come to the foreground
        console.log('App has come to the foreground');
      }
      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener(
      'change',
      handleAppStateChange,
    );

    const backAction = () => {
      // Only show exit alert when app is active (in foreground)
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
        return true; // Prevent default back behavior
      }
      return false; // Allow default back behavior when app is not active
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

  return (
    <SafeAreaView style={styles.container}>
      {/* Header Logo/Title */}
      <View style={styles.header}>
        <Text style={styles.title}>Image capture</Text>
        <Text style={styles.subtitle}>ଓଡ଼ିଆ ପଢିବା ମୂଲ୍ୟାୟନ</Text>
      </View>

      {/* Wrap content in ScrollView */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          {/* Illustration/Image */}
          <View style={styles.imageContainer}>
            <View style={styles.iconCircle}>
              <MaterialIcons
                name="mic"
                size={isTablet ? 100 : 80}
                color="#fe9c3b"
              />
            </View>
            <Text style={styles.iconText}>🎤 ଶବ୍ଦ ମୂଲ୍ୟାୟନ</Text>
          </View>

          {/* Features List */}
          <View style={styles.featuresContainer}>
            <View style={styles.featureItem}>
              <MaterialIcons name="check-circle" size={24} color="#4CAF50" />
              <Text style={styles.featureText}>
                ବିଦ୍ୟାଳୟ ଏବଂ ଶ୍ରେଣୀ ଚୟନ କରନ୍ତୁ
              </Text>
            </View>

            <View style={styles.featureItem}>
              <MaterialIcons name="check-circle" size={24} color="#4CAF50" />
              <Text style={styles.featureText}>
                ଶିକ୍ଷାର୍ଥୀ ର ଶବ୍ଦ ରେକର୍ଡିଂ କରନ୍ତୁ
              </Text>
            </View>

            <View style={styles.featureItem}>
              <MaterialIcons name="check-circle" size={24} color="#4CAF50" />
              <Text style={styles.featureText}>ସ୍ୱୟଂଚାଳିତ ମୂଲ୍ୟାୟନ ଫଳାଫଳ</Text>
            </View>
          </View>

          {/* Instructions */}
          <View style={styles.instructionsContainer}>
            <Text style={styles.instructionsTitle}>ସୂଚନା:</Text>
            <Text style={styles.instruction}>1. ଇଣ୍ଟରନେଟ ସଂଯୋଗ ଆବଶ୍ୟକ</Text>
            <Text style={styles.instruction}>2. ମାଇକ୍ରୋଫୋନ ଅନୁମତି ଦିଅନ୍ତୁ</Text>
            <Text style={styles.instruction}>
              3. ପ୍ରତ୍ୟେକ ରେକର୍ଡିଂ 25 ସେକେଣ୍ଡର
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Start Button - Keep outside ScrollView for fixed positioning */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.startButton}
          onPress={() => navigation.replace('ImageCapture')}
        >
          <Text style={styles.startButtonText}>ଆରମ୍ଭ କରନ୍ତୁ</Text>
          <MaterialIcons
            name="arrow-forward"
            size={24}
            color="white"
            style={styles.buttonIcon}
          />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    paddingTop: isTablet ? 40 : 30,
    paddingBottom: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
    backgroundColor: '#fe9c3b',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  title: {
    fontSize: isTablet ? 32 : 28,
    fontWeight: 'bold',
    color: '#050505',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: isTablet ? 20 : 16,
    color: '#050505',
    marginTop: 8,
    fontWeight: '500',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  imageContainer: {
    alignItems: 'center',
    marginVertical: 30,
  },
  iconCircle: {
    width: isTablet ? 180 : 150,
    height: isTablet ? 180 : 150,
    borderRadius: isTablet ? 90 : 75,
    backgroundColor: '#FFF8E1',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  iconText: {
    fontSize: isTablet ? 22 : 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 15,
    textAlign: 'center',
  },
  featuresContainer: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    marginVertical: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
  },
  featureText: {
    fontSize: isTablet ? 18 : 16,
    color: '#444',
    marginLeft: 12,
    flex: 1,
  },
  instructionsContainer: {
    backgroundColor: '#E3F2FD',
    borderRadius: 16,
    padding: 20,
    marginVertical: 10,
    marginBottom: 100,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  instructionsTitle: {
    fontSize: isTablet ? 20 : 18,
    fontWeight: 'bold',
    color: '#0D47A1',
    marginBottom: 10,
  },
  instruction: {
    fontSize: isTablet ? 16 : 14,
    color: '#2c3e50',
    marginVertical: 4,
  },
  footer: {
    padding: 20,
    paddingBottom: isTablet ? 40 : 20,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#f8f9fa',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  startButton: {
    backgroundColor: '#fe9c3b',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: isTablet ? 20 : 18,
    borderRadius: 15,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  startButtonText: {
    color: 'white',
    fontSize: isTablet ? 22 : 20,
    fontWeight: 'bold',
  },
  buttonIcon: {
    marginLeft: 12,
  },
});

export default WelcomeScreen;
