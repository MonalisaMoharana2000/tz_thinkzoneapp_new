import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  Dimensions,
  ScrollView,
  Platform,
  PermissionsAndroid,
  BackHandler,
} from 'react-native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import RNFS from 'react-native-fs';
import Icon from 'react-native-vector-icons/MaterialIcons';
import axios from 'axios';
import DocumentScanner from 'react-native-document-scanner-plugin';

const { width, height } = Dimensions.get('window');

const ImageCapture = ({ navigation }) => {
  const [capturedImage, setCapturedImage] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [imageUrl, setImageUrl] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [backPressCount, setBackPressCount] = useState(0);

  // Handle back button press
  const handleBackPress = useCallback(() => {
    if (isScanning) {
      // Don't exit while scanning
      return true;
    }

    if (showPreview && capturedImage && !imageUrl) {
      // If in preview mode (before upload), go back to initial view
      retakePicture();
      return true;
    }

    if (imageUrl) {
      // If upload successful, reset everything
      resetToInitialView();
      return true;
    }

    // If on initial view, show exit confirmation
    if (backPressCount === 0) {
      setBackPressCount(1);
      Alert.alert(
        'Exit App',
        'Are you sure you want to exit?',
        [
          {
            text: 'Cancel',
            onPress: () => {
              setBackPressCount(0);
            },
            style: 'cancel',
          },
          {
            text: 'Exit',
            onPress: () => BackHandler.exitApp(),
          },
        ],
        { cancelable: false },
      );

      // Reset back press count after 2 seconds
      setTimeout(() => {
        setBackPressCount(0);
      }, 2000);

      return true;
    }

    return false;
  }, [isScanning, showPreview, capturedImage, imageUrl, backPressCount]);

  // Add back handler
  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      handleBackPress,
    );

    // Cleanup function
    return () => {
      backHandler.remove();
      setBackPressCount(0); // Reset on unmount
    };
  }, [handleBackPress]);

  // Request camera permission for Android
  const requestCameraPermission = async () => {
    if (Platform.OS !== 'android') {
      setHasCameraPermission(true);
      return true;
    }

    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA,
        {
          title: 'Camera Permission',
          message: 'App needs access to your camera to take photos.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        },
      );
      const hasPermission = granted === PermissionsAndroid.RESULTS.GRANTED;
      setHasCameraPermission(hasPermission);
      return hasPermission;
    } catch (err) {
      console.warn(err);
      return false;
    }
  };

  useEffect(() => {
    // Check camera permission on mount
    requestCameraPermission();
  }, []);

  const openCamera = async () => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) {
      Alert.alert(
        'Permission Denied',
        'Camera permission is required to take photos.',
      );
      return;
    }

    try {
      launchCamera(
        {
          mediaType: 'photo',
          quality: 0.8,
          cameraType: 'back',
          saveToPhotos: true,
          includeBase64: false,
        },
        handleImagePicked,
      );
    } catch (error) {
      console.error('Error opening camera:', error);
      Alert.alert('Error', 'Failed to open camera. Please try again.');
    }
  };

  const scanDocument = async () => {
    try {
      if (!hasCameraPermission) {
        const permissionGranted = await requestCameraPermission();
        if (!permissionGranted) {
          Alert.alert(
            'Permission Required',
            'You need to grant camera permissions to scan documents',
          );
          return;
        }
      }

      setIsScanning(true);
      const { scannedImages } = await DocumentScanner.scanDocument({
        responseType: 'uri',
        quality: 1.0,
        letUserAdjustCrop: true,
        maxNumDocuments: 1,
      });

      if (scannedImages && scannedImages.length > 0) {
        setCapturedImage(scannedImages[0]);
        setShowPreview(true);
        setIsScanning(false);
      } else {
        setIsScanning(false);
        // User cancelled scanning
      }
    } catch (error) {
      console.error('Document scan error:', error);
      setIsScanning(false);
      Alert.alert('Scanner Error', error.message || 'Failed to scan document.');
    }
  };

  const pickImageFromGallery = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
        includeBase64: false,
      });

      if (result.didCancel) {
        console.log('User cancelled image picker');
      } else if (result.errorCode) {
        console.error('ImagePicker Error: ', result.errorMessage);
        Alert.alert('Error', 'Failed to pick image from gallery');
      } else if (result.assets && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        setCapturedImage(imageUri);
        setShowPreview(true);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image from gallery');
    }
  };

  const handleImagePicked = response => {
    if (response.didCancel) {
      console.log('User cancelled camera');
    } else if (response.errorCode) {
      console.error('Camera Error: ', response.errorMessage);
      Alert.alert('Error', 'Failed to capture image');
    } else if (response.assets && response.assets[0]) {
      const imageUri = response.assets[0].uri;
      setCapturedImage(imageUri);
      setShowPreview(true);
    }
  };

  const generateUniqueFileName = fileUri => {
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(7);

    // Extract file extension from URI
    let fileExtension = 'jpg'; // default
    const uriParts = fileUri.split('.');
    if (uriParts.length > 1) {
      fileExtension = uriParts[uriParts.length - 1].toLowerCase();
      // Ensure valid image extension
      const validExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'];
      if (!validExtensions.includes(fileExtension)) {
        fileExtension = 'jpg'; // fallback to jpg
      }
    }

    return `image_${timestamp}_${randomId}.${fileExtension}`;
  };

  const uploadFile = async () => {
    if (!capturedImage) {
      Alert.alert('No Image', 'Please capture or select an image first');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Generate unique filename
      const fileName = generateUniqueFileName(capturedImage);

      // Determine MIME type based on file extension
      let mimeType = 'image/jpeg'; // default

      if (fileName.endsWith('.png')) {
        mimeType = 'image/png';
      } else if (fileName.endsWith('.gif')) {
        mimeType = 'image/gif';
      } else if (fileName.endsWith('.bmp')) {
        mimeType = 'image/bmp';
      } else if (fileName.endsWith('.webp')) {
        mimeType = 'image/webp';
      }

      // Create FormData
      const formData = new FormData();

      let actualUri = capturedImage;
      if (
        !capturedImage.startsWith('file://') &&
        !capturedImage.startsWith('content://')
      ) {
        actualUri = `file://${capturedImage}`;
      }

      formData.append('file', {
        uri: actualUri,
        type: mimeType,
        name: fileName,
      });

      console.log('Uploading image file:', {
        uri: actualUri,
        type: mimeType,
        name: fileName,
      });

      // Call your API - using your existing endpoint pattern
      const response = await axios.post(
        `https://thinkzone.co/cloud-storage/uploadFile/${fileName}`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          timeout: 60000,
          onUploadProgress: progressEvent => {
            if (progressEvent.total) {
              const percentCompleted = Math.round(
                (progressEvent.loaded * 100) / progressEvent.total,
              );
              setUploadProgress(percentCompleted);
            }
          },
        },
      );

      console.log('Upload response-------->', response.status, response.data);

      if (response?.status === 200 && response?.data?.url) {
        setUploadProgress(100);
        const uploadedUrl = response.data.url;
        setImageUrl(uploadedUrl);

        // Hide captured image preview and show only uploaded image
        setShowPreview(false);
        setCapturedImage(null);

        Alert.alert('Success!', 'Image uploaded successfully', [
          {
            text: 'OK',
          },
        ]);

        return {
          success: true,
          url: uploadedUrl,
        };
      } else {
        throw new Error('No URL returned from API');
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      setUploadProgress(0);

      let errorMessage = 'Failed to upload image. Please try again.';

      if (error.response) {
        console.error('Error response data:', error.response.data);
        console.error('Error response status:', error.response.status);

        if (error.response.status === 413) {
          errorMessage =
            'Image file is too large. Please try with a smaller image.';
        } else if (error.response.status === 406) {
          errorMessage = 'Missing file parameters or invalid image format.';
        } else if (error.response.status === 404) {
          errorMessage = 'Upload endpoint not found.';
        } else if (error.response.status >= 500) {
          errorMessage = 'Server error. Please try again later.';
        }
      } else if (error.request) {
        console.error('No response received:', error.request);
        errorMessage =
          'No response from server. Please check your internet connection.';
      } else {
        console.error('Error setting up request:', error.message);
        errorMessage = error.message || 'Failed to upload image.';
      }

      Alert.alert('Upload Failed', errorMessage);

      return {
        success: false,
        url: null,
        error: errorMessage,
      };
    } finally {
      setIsUploading(false);
    }
  };

  const retakePicture = () => {
    setCapturedImage(null);
    setImageUrl(null);
    setShowPreview(false);
  };

  const resetToInitialView = () => {
    setCapturedImage(null);
    setImageUrl(null);
    setShowPreview(false);
    setUploadProgress(0);
  };

  const navigateBack = () => {
    if (showPreview && capturedImage && !imageUrl) {
      // If in preview mode (before upload), go back to initial view
      retakePicture();
    } else if (imageUrl) {
      // If upload successful, reset everything
      resetToInitialView();
    } else {
      // If on initial view, show exit confirmation
      Alert.alert(
        'Exit App',
        'Are you sure you want to exit?',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Exit',
            onPress: () => {
              if (Platform.OS === 'android') {
                BackHandler.exitApp();
              } else {
                navigation.goBack();
              }
            },
          },
        ],
        { cancelable: false },
      );
    }
  };

  // Show loading while checking permissions
  if (Platform.OS === 'android' && hasCameraPermission === null) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Checking permissions...</Text>
      </View>
    );
  }

  // Show scanning overlay
  if (isScanning) {
    return (
      <View style={styles.scanningContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.scanningText}>Scanning document...</Text>
        <Text style={styles.scanningSubText}>
          Point your camera at the document
        </Text>
        <TouchableOpacity
          style={styles.cancelScanButton}
          onPress={() => setIsScanning(false)}
        >
          <Text style={styles.cancelScanText}>Cancel Scan</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={navigateBack}>
            <Icon name="arrow-back" size={24} color="#1C1C1E" />
          </TouchableOpacity>
          <Text style={styles.title}>Image Capture</Text>
          <View style={styles.headerPlaceholder} />
        </View>

        {/* Main Content */}
        <View style={styles.mainContent}>
          {/* Show captured image preview only if no upload has been successful */}
          {showPreview && capturedImage && !imageUrl ? (
            // Preview Mode (Before Upload)
            <View style={styles.previewContainer}>
              <View style={styles.imagePreviewWrapper}>
                <Image
                  source={{ uri: capturedImage }}
                  style={styles.capturedImage}
                  resizeMode="cover"
                />
                <TouchableOpacity
                  style={styles.retakeButton}
                  onPress={retakePicture}
                  disabled={isUploading}
                >
                  <Icon name="refresh" size={20} color="white" />
                </TouchableOpacity>
              </View>

              <View style={styles.previewActions}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.uploadButton]}
                  onPress={uploadFile}
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <ActivityIndicator color="white" size="small" />
                  ) : (
                    <Icon name="cloud-upload" size={24} color="white" />
                  )}
                  <Text style={styles.actionButtonText}>
                    {isUploading ? 'Uploading...' : 'Upload Image'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, styles.captureNewButton]}
                  onPress={() => {
                    retakePicture();
                    openCamera();
                  }}
                  disabled={isUploading}
                >
                  <Icon name="camera-alt" size={24} color="#007AFF" />
                  <Text style={[styles.actionButtonText, { color: '#007AFF' }]}>
                    Take New Photo
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : imageUrl ? (
            // Upload Successful View (Only show uploaded image)
            <View style={styles.uploadSuccessContainer}>
              <View style={styles.successHeader}>
                <Icon name="check-circle" size={32} color="#4CD964" />
                <Text style={styles.successTitle}>
                  Image Uploaded Successfully!
                </Text>
                <Text style={styles.successSubtitle}>
                  Your image has been uploaded to the cloud
                </Text>
              </View>

              <View style={styles.uploadedImageWrapper}>
                <Image
                  source={{ uri: imageUrl }}
                  style={styles.uploadedImage}
                  resizeMode="contain"
                />
                <View style={styles.imageBadge}>
                  <Icon name="cloud-done" size={16} color="white" />
                  <Text style={styles.imageBadgeText}>Uploaded</Text>
                </View>
              </View>

              <View style={styles.urlContainer}>
                <View style={styles.urlHeader}>
                  <Icon name="link" size={20} color="#007AFF" />
                  <Text style={styles.urlTitle}>Image URL</Text>
                </View>
                <Text
                  style={styles.urlText}
                  numberOfLines={2}
                  ellipsizeMode="middle"
                >
                  {imageUrl}
                </Text>
                <View style={styles.urlActions}>
                  <TouchableOpacity
                    style={[styles.urlButton, styles.copyButton]}
                    onPress={() => {
                      Alert.alert('Copied!', 'URL copied to clipboard');
                    }}
                  >
                    <Icon name="content-copy" size={18} color="white" />
                    <Text style={styles.urlButtonText}>Copy URL</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.urlButton, styles.shareButton]}
                    onPress={() => {
                      // Implement share functionality here
                      Alert.alert('Share', 'Share functionality would go here');
                    }}
                  >
                    <Icon name="share" size={18} color="white" />
                    <Text style={styles.urlButtonText}>Share</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.successActions}>
                <TouchableOpacity
                  style={[styles.successButton, styles.newImageButton]}
                  onPress={resetToInitialView}
                >
                  <Icon name="add-a-photo" size={24} color="#007AFF" />
                  <Text
                    style={[styles.successButtonText, { color: '#007AFF' }]}
                  >
                    Upload Another Image
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.successButton, styles.doneButton]}
                  onPress={() => navigation.navigate('Welcome')}
                >
                  <Icon name="check" size={24} color="white" />
                  <Text style={styles.successButtonText}>Done</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            // Initial View (Camera/Gallery/Scan Options)
            <View style={styles.initialView}>
              <View style={styles.attendanceContent}>
                <View style={styles.attendanceIllustration}>
                  <Icon name="photo-camera" size={80} color="#fe9c3b" />
                  <View style={styles.illustrationCircle} />
                </View>

                <Text style={styles.attendanceDescription}>
                  ଶ୍ରେଣୀଗୃହ ପର୍ଯ୍ୟବେକ୍ଷଣକୁ ସ୍ୱାଗତ । ପର୍ଯ୍ୟବେକ୍ଷଣ ପ୍ରକ୍ରିୟା ଆରମ୍ଭ
                  କରିବା ପୂର୍ବରୁ ଆପଣଙ୍କର ଉପସ୍ଥାନ ରେକର୍ଡ କରିବା ପାଇଁ ଦୟାକରି ଏକ
                  ସେଲ୍ଫି ନିଅନ୍ତୁ ।
                </Text>

                {/* Selfie Button */}
                {/* <TouchableOpacity
                  style={[styles.primaryButton, styles.selfieButton]}
                  onPress={openCamera}
                >
                  <Icon name="camera-alt" size={24} color="#fff" />
                  <Text style={[styles.primaryButtonText, { lineHeight: 30 }]}>
                    ସେଲ୍ଫି ନିଅନ୍ତୁ
                  </Text>
                </TouchableOpacity> */}

                {/* Scan Document Button */}
                <TouchableOpacity
                  style={[styles.primaryButton, styles.scanButton]}
                  onPress={scanDocument}
                  disabled={isScanning}
                >
                  {isScanning ? (
                    <ActivityIndicator color="white" size="small" />
                  ) : (
                    <Icon name="document-scanner" size={24} color="#fff" />
                  )}
                  <Text style={[styles.primaryButtonText, { lineHeight: 30 }]}>
                    {isScanning ? 'Scanning...' : 'Scan Document'}
                  </Text>
                </TouchableOpacity>

                {/* Choose from Gallery Button */}
                <TouchableOpacity
                  style={[styles.secondaryButton, styles.galleryButton]}
                  onPress={pickImageFromGallery}
                >
                  <Icon name="photo-library" size={24} color="#007AFF" />
                  <Text
                    style={[styles.secondaryButtonText, { lineHeight: 30 }]}
                  >
                    Choose from Gallery
                  </Text>
                </TouchableOpacity>

                {/* Info about scanning */}
                <View style={styles.infoContainer}>
                  <Icon name="info" size={18} color="#8E8E93" />
                  <Text style={styles.infoText}>
                    Use "Scan Document" for better quality document images with
                    edge detection and perspective correction
                  </Text>
                </View>

                {/* Go Back Button */}
                <TouchableOpacity
                  style={styles.exitButton}
                  onPress={() => {
                    Alert.alert(
                      'Sure',
                      'Are you sure you want to go back?',
                      [
                        {
                          text: 'Cancel',
                          style: 'cancel',
                        },
                        {
                          text: 'OK',
                          onPress: () => {
                            navigation.navigate('Welcome');
                          },
                        },
                      ],
                      { cancelable: false },
                    );
                  }}
                >
                  <Icon name="exit-to-app" size={20} color="#FF3B30" />
                  <Text style={styles.exitButtonText}>Go back</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Progress Bar (shown only during upload and before success) */}
          {isUploading && !imageUrl && (
            <View style={styles.progressContainer}>
              <Text style={styles.progressLabel}>Uploading...</Text>
              <View style={styles.progressBar}>
                <View
                  style={[styles.progressFill, { width: `${uploadProgress}%` }]}
                />
              </View>
              <Text style={styles.progressText}>{uploadProgress}%</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollContainer: {
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  headerPlaceholder: {
    width: 40,
  },
  mainContent: {
    flex: 1,
    padding: 20,
  },
  initialView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  attendanceContent: {
    alignItems: 'center',
    width: '100%',
  },
  attendanceIllustration: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
    width: 160,
    height: 160,
  },
  illustrationCircle: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(254, 156, 59, 0.1)',
  },
  attendanceDescription: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666666',
    lineHeight: 24,
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    width: '100%',
    marginBottom: 16,
    gap: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#007AFF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  selfieButton: {
    backgroundColor: '#007AFF',
  },
  scanButton: {
    backgroundColor: '#5856D6',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#007AFF',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    width: '100%',
    gap: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  galleryButton: {
    marginBottom: 24,
  },
  secondaryButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F2F2F7',
    padding: 16,
    borderRadius: 12,
    marginTop: 10,
    marginBottom: 30,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#8E8E93',
    lineHeight: 20,
  },
  exitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 12,
    width: '100%',
    gap: 12,
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  exitButtonText: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: '600',
  },
  // Preview Mode Styles (Before Upload)
  previewContainer: {
    width: '100%',
  },
  imagePreviewWrapper: {
    width: '100%',
    height: height * 0.4,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 30,
    position: 'relative',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  capturedImage: {
    width: '100%',
    height: '100%',
  },
  retakeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewActions: {
    gap: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 12,
    gap: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  uploadButton: {
    backgroundColor: '#34C759',
  },
  captureNewButton: {
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  // Progress Bar Styles
  progressContainer: {
    marginTop: 30,
    alignItems: 'center',
  },
  progressLabel: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 8,
  },
  progressBar: {
    width: '100%',
    height: 6,
    backgroundColor: '#E5E5EA',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 3,
  },
  progressText: {
    marginTop: 8,
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '600',
  },
  // Upload Success View Styles
  uploadSuccessContainer: {
    width: '100%',
    alignItems: 'center',
  },
  successHeader: {
    alignItems: 'center',
    marginBottom: 30,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1C1C1E',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
  },
  uploadedImageWrapper: {
    width: '100%',
    height: height * 0.35,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 30,
    position: 'relative',
    backgroundColor: '#F2F2F7',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  uploadedImage: {
    width: '100%',
    height: '100%',
  },
  imageBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 217, 100, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  imageBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  urlContainer: {
    width: '100%',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 30,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  urlHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  urlTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  urlText: {
    fontSize: 14,
    color: '#1C1C1E',
    marginBottom: 20,
    padding: 12,
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  urlActions: {
    flexDirection: 'row',
    gap: 12,
  },
  urlButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  copyButton: {
    backgroundColor: '#007AFF',
  },
  shareButton: {
    backgroundColor: '#5856D6',
  },
  urlButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  successActions: {
    width: '100%',
    gap: 16,
  },
  successButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 12,
    gap: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  newImageButton: {
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  doneButton: {
    backgroundColor: '#007AFF',
  },
  successButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  // Other Styles
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: '#8E8E93',
  },
  scanningContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  scanningText: {
    marginTop: 20,
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  scanningSubText: {
    marginTop: 8,
    fontSize: 14,
    color: '#8E8E93',
  },
  cancelScanButton: {
    marginTop: 30,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#FF3B30',
    borderRadius: 8,
  },
  cancelScanText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ImageCapture;
