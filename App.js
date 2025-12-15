// App.js - Updated to match your existing packages
import 'react-native-gesture-handler'; // MUST BE FIRST IMPORT
import React, { useState, useEffect, useMemo } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { View, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import WelcomeScreen from './src/pages/WelcomeScreen';
import AssessmentFlow from './src/pages/AssessmentFlow';
import ImageCapture from './src/pages/ImageCapture';
import LoginScreen from './src/pages/LoginScreen';

const Stack = createStackNavigator();

const App = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [userToken, setUserToken] = useState(null);
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    // Load authentication state on app start
    const loadAuthState = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        const user = await AsyncStorage.getItem('userData');

        setUserToken(token);
        setUserData(user ? JSON.parse(user) : null);
      } catch (error) {
        console.log('Error loading auth state:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadAuthState();
  }, []);

  // Auth context functions

  const authContext = useMemo(() => ({
    signIn: async data => {
      try {
        await AsyncStorage.setItem('userToken', 'authenticated');
        await AsyncStorage.setItem('userData', JSON.stringify(data));
        setUserToken('authenticated');
        setUserData(data);
      } catch (error) {
        console.log('Sign in error:', error);
        throw error;
      }
    },
    signOut: async () => {
      try {
        await AsyncStorage.multiRemove(['userToken', 'userData']);
        setUserToken(null);
        setUserData(null);
      } catch (error) {
        console.log('Sign out error:', error);
        throw error;
      }
    },
    getUserData: () => userData,
  }));

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#f5f5f5',
        }}
      >
        <ActivityIndicator size="large" color="#fe9c3b" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={userToken ? 'Welcome' : 'Login'}
        screenOptions={{
          headerShown: false,
          cardStyle: { backgroundColor: '#f5f5f5' },
        }}
      >
        {userToken ? (
          // User is authenticated - show main app screens
          <>
            <Stack.Screen name="Welcome">
              {props => (
                <WelcomeScreen
                  {...props}
                  user={userData}
                  authContext={authContext}
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="AssessmentFlow">
              {props => <AssessmentFlow {...props} user={userData} />}
            </Stack.Screen>
            <Stack.Screen name="ImageCapture" component={ImageCapture} />
          </>
        ) : (
          // User is not authenticated - show login
          <Stack.Screen name="Login">
            {props => <LoginScreen {...props} authContext={authContext} />}
          </Stack.Screen>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default App;
