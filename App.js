// App.js
import 'react-native-gesture-handler'; // MUST BE FIRST IMPORT
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import WelcomeScreen from './src/pages/WelcomeScreen'; // Your screen component
import AssessmentFlow from './src/pages/AssessmentFlow';
import ImageCapture from './src/pages/ImageCapture';

const Stack = createStackNavigator();

const App = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Welcome"
        screenOptions={{
          headerShown: false,
          cardStyle: { backgroundColor: '#f5f5f5' },
        }}
      >
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
        <Stack.Screen name="AssessmentFlow" component={AssessmentFlow} />
        <Stack.Screen name="ImageCapture" component={ImageCapture} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default App;
