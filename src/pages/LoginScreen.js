// src/pages/LoginScreen.js
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Dimensions,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'react-native-linear-gradient';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import axios from 'axios';
import { API } from '../environments/Api';

const { width, height } = Dimensions.get('window');

const LoginScreen = ({ navigation, authContext }) => {
  const [authId, setAuthId] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState({
    authId: false,
    password: false,
  });
  const passwordInputRef = useRef(null);
  const handleLogin = async () => {
    if (!authId.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter both phone number and password');
      return;
    }

    setIsLoading(true);

    try {
      const body = {
        authId: authId.trim(),
        password: password.trim(),
        appVersion: '1.0.0',
      };

      const response = await API.post(`/authCoordinator`, body);

      if (
        response.status === 200 &&
        response.data?.message === 'coordinator auth success'
      ) {
        const coordinatorData = response.data.coordinator;
        const token = response.data.token;

        const userData = {
          coordinatorId: coordinatorData.coordinatorId || authId.trim(),
          coordinatorName: coordinatorData.coordinatorName || 'Coordinator',
          phoneNumber: coordinatorData.phoneNumber || authId.trim(),
          emailId: coordinatorData.emailId,
          gender: coordinatorData.gender,
          coordinatorImage: coordinatorData.coordinatorImage,
          token: token,
          ...coordinatorData,
        };

        await authContext.signIn(userData);

        navigation.navigate('Welcome');
      } else {
        Alert.alert(
          'Login Failed',
          response.data?.message || 'Invalid credentials',
        );
      }
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert('Login Error', 'Failed to login. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#fe9c3b" barStyle="light-content" />

      <LinearGradient
        colors={['#fe9c3b', '#ff8a00', '#ff6b00']}
        style={styles.gradientBackground}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <View style={styles.content}>
            {/* Header Section */}
            <View style={styles.header}>
              <View style={styles.logoContainer}>
                <MaterialIcons name="school" size={50} color="#fff" />
              </View>
              <Text style={styles.title}>THINKZONE</Text>
              <Text style={styles.subtitle}>
                Foundational Literacy & Numeracy
              </Text>
            </View>

            {/* Login Form Card */}
            <View style={styles.formCard}>
              <Text style={styles.formTitle}>Coordinator Login</Text>
              <Text style={styles.formSubtitle}>
                Access assessment tools and student data
              </Text>

              {/* Phone Number / ID Input */}
              <View
                style={[
                  styles.inputContainer,
                  isFocused.authId && styles.inputContainerFocused,
                ]}
              >
                <MaterialIcons
                  name="phone"
                  size={22}
                  color={isFocused.authId ? '#fe9c3b' : '#999'}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Phone Number"
                  placeholderTextColor="#999"
                  value={authId}
                  onChangeText={setAuthId}
                  onFocus={() => setIsFocused({ ...isFocused, authId: true })}
                  onBlur={() => setIsFocused({ ...isFocused, authId: false })}
                  keyboardType="phone-pad"
                  autoCapitalize="none"
                  editable={!isLoading}
                  returnKeyType="next"
                  onSubmitEditing={() => passwordInputRef.current?.focus()}
                />
              </View>

              {/* Password Input */}
              <View
                style={[
                  styles.inputContainer,
                  isFocused.password && styles.inputContainerFocused,
                ]}
              >
                <MaterialIcons
                  name="lock"
                  size={22}
                  color={isFocused.password ? '#fe9c3b' : '#999'}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor="#999"
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => setIsFocused({ ...isFocused, password: true })}
                  onBlur={() => setIsFocused({ ...isFocused, password: false })}
                  secureTextEntry={!showPassword}
                  editable={!isLoading}
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                  ref={passwordInputRef}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeButton}
                  disabled={isLoading}
                >
                  <MaterialIcons
                    name={showPassword ? 'visibility' : 'visibility-off'}
                    size={22}
                    color="#666"
                  />
                </TouchableOpacity>
              </View>

              {/* Login Button */}
              <TouchableOpacity
                style={[
                  styles.loginButton,
                  isLoading && styles.loginButtonDisabled,
                ]}
                onPress={handleLogin}
                disabled={isLoading}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#fe9c3b', '#ff8a00']}
                  style={styles.buttonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Text style={styles.loginButtonText}>SIGN IN</Text>
                      <MaterialIcons
                        name="arrow-forward"
                        size={20}
                        color="#fff"
                      />
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {/* App Info */}
              <View style={styles.infoContainer}>
                <View style={styles.infoRow}>
                  <MaterialIcons name="update" size={14} color="#2196F3" />
                  <Text style={styles.infoText}>
                    Version 1.0.0 • Last updated: Dec 2025
                  </Text>
                </View>
              </View>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerSubtext}>
                For technical support: support@tz.in
              </Text>
            </View>
          </View>
        </KeyboardAvoidingView>
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  gradientBackground: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: 25,
    paddingVertical: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
    textAlign: 'center',
  },
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 25,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 25,
    elevation: 10,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  formSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#f8f9fa',
    height: 56,
  },
  inputContainerFocused: {
    borderColor: '#fe9c3b',
    backgroundColor: '#fff',
  },
  inputIcon: {
    marginLeft: 18,
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    height: '100%',
    paddingRight: 15,
  },
  eyeButton: {
    padding: 15,
  },
  demoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF9E6',
    padding: 12,
    borderRadius: 10,
    marginBottom: 25,
    marginTop: 5,
    borderWidth: 1,
    borderColor: '#FFE4B5',
  },
  demoText: {
    fontSize: 12,
    color: '#E65100',
    marginLeft: 8,
    fontWeight: '500',
  },
  loginButton: {
    borderRadius: 12,
    overflow: 'hidden',
    height: 56,
    marginBottom: 20,
    shadowColor: '#fe9c3b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  buttonGradient: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 10,
  },
  infoContainer: {
    alignItems: 'center',
    marginTop: 15,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
  },
  footer: {
    alignItems: 'center',
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
  },
  footerText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginBottom: 4,
    fontWeight: '500',
  },
  footerSubtext: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
  },
});

export default LoginScreen;
