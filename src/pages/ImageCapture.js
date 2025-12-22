import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Animated,
  Easing,
  RefreshControl,
  Modal,
  FlatList,
} from 'react-native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
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
  const [isProcessing, setIsProcessing] = useState(false);
  const [ocrData, setOcrData] = useState(null);
  const [processingStep, setProcessingStep] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [imgId, setImgId] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [progressAnimation] = useState(new Animated.Value(0));
  const [processingProgress, setProcessingProgress] = useState(0);
  const [selectedTab, setSelectedTab] = useState('table');
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [logs, setLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const [showLogDetails, setShowLogDetails] = useState(false);
  const [isProcessingAsync, setIsProcessingAsync] = useState(false);
  const [asyncProcessingId, setAsyncProcessingId] = useState(null);
  const [showAsyncNotification, setShowAsyncNotification] = useState(false);
  const processingTimeoutRef = useRef(null);
  const [deletingLogs, setDeletingLogs] = useState({});

  const fetchLogs = async () => {
    setLoadingLogs(true);
    try {
      const response = await axios.post(
        'https://ocr.thinkzone.in.net/get-logs',
        {
          user_id: 'USR001',
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        },
      );
      console.log('get data------->', response.data);
      if (response.data && Array.isArray(response.data)) {
        const filteredLogs = response.data.filter(
          log =>
            log.mlResponse &&
            log.mlResponse.length > 1 &&
            !(
              log.mlResponse.length === 1 &&
              log.mlResponse[0]['ଦକ୍ଷତା'] === ':---'
            ),
        );
        setLogs(filteredLogs);
      } else {
        setLogs([]);
      }
    } catch (error) {
      console.error('Error fetching logs:', error);
      Alert.alert('Error', 'Failed to fetch logs. Please try again.');
      setLogs([]);
    } finally {
      setLoadingLogs(false);
    }
  };

  const deleteLog = async (imgId, index) => {
    Alert.alert(
      'Delete Log',
      'Are you sure you want to delete this log? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeletingLogs(prev => ({ ...prev, [imgId]: true }));
              console.log('Attempting to delete log with ID:', imgId);

              const response = await axios.post(
                'https://ocr.thinkzone.in.net/delete-log',
                {
                  imageId: imgId,
                  user_id: 'USR001',
                },
                {
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  timeout: 30000,
                },
              );

              console.log('Delete response:', response.status, response.data);

              // Check if response indicates success
              if (response.status === 200) {
                // Also check the response data for success message
                if (
                  response.data &&
                  response.data.message === 'Delete successful'
                ) {
                  // Remove the deleted log from the state
                  setLogs(prevLogs =>
                    prevLogs.filter(log => log.imgId !== imgId),
                  );

                  // If the deleted log is currently selected in details view, close the details
                  if (selectedLog && selectedLog.imgId === imgId) {
                    setSelectedLog(null);
                    setShowLogDetails(false);
                  }

                  Alert.alert('Success', 'Log deleted successfully');
                } else {
                  // The request succeeded but the server returned an error in the response
                  throw new Error(
                    response.data?.message || 'Failed to delete log on server',
                  );
                }
              } else {
                throw new Error(`Server returned status: ${response.status}`);
              }
            } catch (error) {
              console.error('Error deleting log:', error);

              let errorMessage = 'Failed to delete log. Please try again.';

              if (error.response) {
                // Server responded with an error status
                if (error.response.status === 404) {
                  errorMessage =
                    'Log not found. It may have already been deleted.';

                  // If it's a 404, we should still remove it from the local state
                  // since it doesn't exist on the server
                  setLogs(prevLogs =>
                    prevLogs.filter(log => log.imgId !== imgId),
                  );

                  if (selectedLog && selectedLog.imgId === imgId) {
                    setSelectedLog(null);
                    setShowLogDetails(false);
                  }

                  Alert.alert('Info', errorMessage);
                  return; // Exit early since we handled the 404
                } else if (error.response.status === 400) {
                  errorMessage = 'Invalid request. Please try again.';
                } else if (error.response.status >= 500) {
                  errorMessage = 'Server error. Please try again later.';
                }
              } else if (error.request) {
                // Request was made but no response
                errorMessage =
                  'No response from server. Check your internet connection.';
              } else {
                // Something else happened
                errorMessage = error.message || 'Failed to delete log.';
              }

              Alert.alert('Error', errorMessage);
            } finally {
              setDeletingLogs(prev => ({ ...prev, [imgId]: false }));
            }
          },
        },
      ],
    );
  };

  const handleBackPress = useCallback(() => {
    if (isScanning) {
      return true;
    }

    if (showResults) {
      setShowResults(false);
      setOcrData(null);
      return true;
    }

    if (showPreview && capturedImage && !imageUrl) {
      retakePicture();
      return true;
    }

    if (imageUrl) {
      resetToInitialView();
      return true;
    }

    if (showLogsModal) {
      setShowLogsModal(false);
      return true;
    }

    if (showLogDetails) {
      setShowLogDetails(false);
      return true;
    }

    navigation.navigate('Welcome');
    return true;
  }, [
    isScanning,
    showPreview,
    capturedImage,
    imageUrl,
    showResults,
    navigation,
    showLogsModal,
    showLogDetails,
  ]);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      handleBackPress,
    );

    return () => backHandler.remove();
  }, [handleBackPress]);

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
    requestCameraPermission();
  }, []);

  const simulateProcessing = () => {
    setProcessingProgress(0);

    Animated.timing(progressAnimation, {
      toValue: 1,
      duration: 30000,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start();

    const steps = [
      'Uploading image...',
      'Initializing OCR engine...',
      'Extracting text from image...',
      'Processing Oriya script...',
      'Analyzing competency data...',
      'Structuring assessment results...',
      'Finalizing...',
    ];

    steps.forEach((step, index) => {
      setTimeout(() => {
        setProcessingStep(step);
        setProcessingProgress(((index + 1) / steps.length) * 100);
      }, index * 4000);
    });
  };

  const extractGrades = async url => {
    setIsProcessing(true);
    setProcessingStep('Starting OCR extraction...');
    setShowAsyncNotification(false);

    const imgId = `img_${Date.now()}`;
    setImgId(imgId);

    simulateProcessing();

    if (processingTimeoutRef.current) {
      clearTimeout(processingTimeoutRef.current);
    }

    processingTimeoutRef.current = setTimeout(() => {
      if (isProcessing) {
        setIsProcessingAsync(true);
        setAsyncProcessingId(imgId);
        setShowAsyncNotification(true);
        Alert.alert(
          'Processing is taking longer than expected',
          'Your image is being processed in the background. You can continue with other tasks.',
          [
            {
              text: 'Continue Processing',
              onPress: () => {
                // Continue in background
              },
            },
            {
              text: 'Upload New Image',
              style: 'cancel',
              onPress: () => {
                setIsProcessing(false);
                setIsProcessingAsync(false);
                resetToInitialView();
              },
            },
          ],
        );
      }
    }, 60000);

    try {
      const body = {
        image_url: url,
        img_id: imgId,
        user_id: 'USR001',
      };

      console.log('Sending OCR request with body:', body);

      const extractResponse = await axios.post(
        'https://ocr.thinkzone.in.net/extract-grades',
        body,
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 120000, // Increased timeout to 2 minutes
        },
      );

      if (processingTimeoutRef.current) {
        clearTimeout(processingTimeoutRef.current);
      }

      console.log('OCR Response received:', extractResponse.data);

      if (
        extractResponse.data?.table &&
        Array.isArray(extractResponse.data.table)
      ) {
        const transformedData = {
          userId: 'USR001',
          imgId: imgId,
          imgUrl: url,
          mlResponse: extractResponse.data.table,
          _meta: {
            inserted_at: new Date().toISOString(),
            tokens_total: extractResponse.data.tokens_total || 0,
          },
        };

        console.log('Transformed data:', transformedData);

        setOcrData(transformedData);

        setTimeout(() => {
          setIsProcessing(false);
          setShowResults(true);
          setProcessingStep('');
        }, 1500);
      } else {
        throw new Error('No table data found in response');
      }
    } catch (error) {
      if (processingTimeoutRef.current) {
        clearTimeout(processingTimeoutRef.current);
      }

      console.error('OCR processing error:', error);

      setIsProcessing(false);

      let errorMessage =
        'Failed to extract data from image. Please try again with a clearer image.';

      if (error.code === 'ECONNABORTED') {
        setIsProcessingAsync(true);
        setAsyncProcessingId(imgId);
        setShowAsyncNotification(true);
        Alert.alert(
          'Processing Timeout',
          'The server is taking longer than expected to process your image. You can continue with other tasks.',
          [
            {
              text: 'Upload New Image',
              onPress: () => {
                setIsProcessing(false);
                resetToInitialView();
              },
            },
          ],
        );
      } else if (error.response?.status === 500) {
        errorMessage =
          'Server error. Please try again later or contact support.';
      } else if (error.response?.status === 400) {
        errorMessage =
          'Invalid request. Please check the image URL and try again.';
      } else if (!error.response && error.request) {
        errorMessage =
          'Network error. Please check your internet connection and try again.';
      }

      Alert.alert('Processing Error', errorMessage, [
        { text: 'OK', onPress: () => resetToInitialView() },
      ]);
    }
  };

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

    let fileExtension = 'jpg';
    const uriParts = fileUri.split('.');
    if (uriParts.length > 1) {
      fileExtension = uriParts[uriParts.length - 1].toLowerCase();
      const validExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'];
      if (!validExtensions.includes(fileExtension)) {
        fileExtension = 'jpg';
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
      const fileName = generateUniqueFileName(capturedImage);

      let mimeType = 'image/jpeg';
      if (fileName.endsWith('.png')) {
        mimeType = 'image/png';
      } else if (fileName.endsWith('.gif')) {
        mimeType = 'image/gif';
      } else if (fileName.endsWith('.bmp')) {
        mimeType = 'image/bmp';
      } else if (fileName.endsWith('.webp')) {
        mimeType = 'image/webp';
      }

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

      if (response?.status === 200 && response?.data?.url) {
        const uploadedUrl = response.data.url;
        setImageUrl(uploadedUrl);
        setUploadProgress(100);

        Alert.alert('Success!', 'Image uploaded successfully', [
          {
            text: 'Process Image',
            onPress: () => {
              setShowPreview(false);
              extractGrades(uploadedUrl);
            },
          },
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: resetToInitialView,
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
        errorMessage =
          'No response from server. Please check your internet connection.';
      } else {
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
    setOcrData(null);
    setShowResults(false);
  };

  const resetToInitialView = () => {
    setCapturedImage(null);
    setImageUrl(null);
    setShowPreview(false);
    setUploadProgress(0);
    setOcrData(null);
    setShowResults(false);
    setIsProcessing(false);
    setImgId('');
    setShowLogsModal(false);
    setShowLogDetails(false);
    setSelectedLog(null);
    setIsProcessingAsync(false);
    setShowAsyncNotification(false);
    if (processingTimeoutRef.current) {
      clearTimeout(processingTimeoutRef.current);
    }
  };

  const navigateBack = () => {
    if (showResults) {
      setShowResults(false);
      setOcrData(null);
    } else if (showPreview && capturedImage && !imageUrl) {
      retakePicture();
    } else if (imageUrl) {
      resetToInitialView();
    } else if (showLogsModal) {
      setShowLogsModal(false);
    } else if (showLogDetails) {
      setShowLogDetails(false);
    } else {
      navigation.navigate('Welcome');
    }
  };

  const renderSymbol = symbol => {
    if (!symbol || symbol === ':---' || symbol === '' || symbol === undefined) {
      return <Text style={styles.emptySymbol}>-</Text>;
    }

    switch (symbol.trim()) {
      case '+':
        return (
          <View style={[styles.symbol, styles.plusSymbol]}>
            <Text style={styles.symbolText}>+</Text>
          </View>
        );
      case '▲':
        return (
          <View style={[styles.symbol, styles.triangleSymbol]}>
            <Text style={styles.symbolText}>▲</Text>
          </View>
        );
      case '*':
        return (
          <View style={[styles.symbol, styles.starSymbol]}>
            <Text style={styles.symbolText}>*</Text>
          </View>
        );
      default:
        return <Text style={styles.emptySymbol}>-</Text>;
    }
  };

  const calculateSummary = mlResponse => {
    if (!mlResponse) return { total: 0, plus: 0, triangle: 0, star: 0 };

    let total = 0;
    let plus = 0;
    let triangle = 0;
    let star = 0;

    mlResponse.forEach(row => {
      for (let i = 1; i <= 30; i++) {
        const key = i.toString().split('').join('');
        const value = row[key];
        if (value === '+') plus++;
        if (value === '▲') triangle++;
        if (value === '*') star++;
        if (value && value !== ':---') total++;
      }
    });

    return { total, plus, triangle, star };
  };

  const getCompetencyData = mlResponse => {
    if (!mlResponse) return [];

    const competencies = [];
    let currentCompetency = null;

    mlResponse.forEach(row => {
      if (row['ଦକ୍ଷତା'] && row['ଦକ୍ଷତା'].includes('**')) {
        if (currentCompetency) {
          competencies.push(currentCompetency);
        }
        currentCompetency = {
          name: row['ଦକ୍ଷତା'].replace(/\*\*/g, ''),
          indicators: [],
        };
      } else if (
        row['ସୂଚକାଙ୍କ'] &&
        row['ସୂଚକାଙ୍କ'] !== '' &&
        row['ସୂଚକାଙ୍କ'] !== ':---' &&
        currentCompetency
      ) {
        currentCompetency.indicators.push({
          indicator: row['ସୂଚକାଙ୍କ'],
          scores: Object.keys(row)
            .filter(key => key.match(/^[୦-୯]+$/))
            .map(key => ({ student: key, score: row[key] }))
            .filter(item => item.score && item.score !== ':---'),
        });
      }
    });

    if (currentCompetency) {
      competencies.push(currentCompetency);
    }

    return competencies;
  };

  const formatDate = dateString => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderLogItem = ({ item, index }) => {
    const summary = calculateSummary(item.mlResponse);
    const date = formatDate(
      item._meta?.inserted_at || new Date().toISOString(),
    );
    const isDeleting = deletingLogs[item.imgId] || false;

    return (
      <TouchableOpacity
        style={styles.logItem}
        onPress={() => {
          setSelectedLog(item);
          setShowLogDetails(true);
        }}
        disabled={isDeleting}
      >
        <View style={styles.logHeader}>
          <Icon name="history" size={20} color="#5856D6" />
          <View style={styles.logInfo}>
            <Text style={styles.logImgId}>{item.imgId}</Text>
            <Text style={styles.logDate}>{date}</Text>
          </View>
          <TouchableOpacity
            style={styles.deleteLogButton}
            onPress={() => deleteLog(item.imgId, index)}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <ActivityIndicator size="small" color="#FF3B30" />
            ) : (
              <Icon name="delete" size={20} color="#FF3B30" />
            )}
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderLogDetails = () => {
    if (!selectedLog) return null;

    const summary = calculateSummary(selectedLog.mlResponse);
    const competencies = getCompetencyData(selectedLog.mlResponse);
    const isDeleting = deletingLogs[selectedLog.imgId] || false;

    return (
      <Modal
        visible={showLogDetails}
        animationType="slide"
        onRequestClose={() => !isDeleting && setShowLogDetails(false)}
      >
        <SafeAreaView style={styles.container}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => !isDeleting && setShowLogDetails(false)}
              style={styles.modalBackButton}
              disabled={isDeleting}
            >
              <Icon name="arrow-back" size={24} color="#1C1C1E" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Log Details</Text>
            <TouchableOpacity
              style={styles.deleteLogDetailsButton}
              onPress={() => deleteLog(selectedLog.imgId)}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <ActivityIndicator size="small" color="#FF3B30" />
              ) : (
                <Icon name="delete" size={24} color="#FF3B30" />
              )}
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.logDetailsContainer}>
            <View style={styles.logSummaryCard}>
              <View style={styles.logSummaryHeader}>
                <Icon name="info" size={24} color="#5856D6" />
                <Text style={styles.logSummaryTitle}>Image Details</Text>
              </View>
              <View style={styles.logInfoRow}>
                <Text style={styles.logInfoLabel}>Image ID:</Text>
                <Text style={styles.logInfoValue}>{selectedLog.imgId}</Text>
              </View>
              <View style={styles.logInfoRow}>
                <Text style={styles.logInfoLabel}>Upload Date:</Text>
                <Text style={styles.logInfoValue}>
                  {formatDate(selectedLog._meta?.inserted_at)}
                </Text>
              </View>
            </View>

            {/* <View style={styles.summaryCard}>
              <View style={styles.summaryHeader}>
                <Icon name="assessment" size={24} color="#5856D6" />
                <Text style={styles.summaryTitle}>Assessment Summary</Text>
              </View>

              <View style={styles.summaryStats}>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{summary.total}</Text>
                  <Text style={styles.statLabel}>Total Scores</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <View style={styles.symbolCountRow}>
                    {renderSymbol('+')}
                    <Text style={[styles.statNumber, { color: '#34C759' }]}>
                      {summary.plus}
                    </Text>
                  </View>
                  <Text style={styles.statLabel}>Excellent</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <View style={styles.symbolCountRow}>
                    {renderSymbol('▲')}
                    <Text style={[styles.statNumber, { color: '#FF9500' }]}>
                      {summary.triangle}
                    </Text>
                  </View>
                  <Text style={styles.statLabel}>Good</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <View style={styles.symbolCountRow}>
                    {renderSymbol('*')}
                    <Text style={[styles.statNumber, { color: '#FF3B30' }]}>
                      {summary.star}
                    </Text>
                  </View>
                  <Text style={styles.statLabel}>Needs Improvement</Text>
                </View>
              </View>
            </View> */}

            <View style={styles.tableContainer}>
              <View style={styles.tableHeader}>
                <Text style={styles.tableHeaderText}>Assessment Data</Text>
                <Text style={styles.tableSubHeaderText}>
                  Student scores across all competencies
                </Text>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View>
                  {/* Table Header Row */}
                  <View style={styles.tableRow}>
                    <View style={[styles.tableCell, styles.firstColumn]}>
                      <Text style={styles.columnHeader}>Indicator</Text>
                    </View>
                    {/* Display Odia numerals 1-30 in header */}
                    {[
                      '୧',
                      '୨',
                      '୩',
                      '୪',
                      '୫',
                      '୬',
                      '୭',
                      '୮',
                      '୯',
                      '୧୦',
                      '୧୧',
                      '୧୨',
                      '୧୩',
                      '୧୪',
                      '୧୫',
                      '୧୬',
                      '୧୭',
                      '୧୮',
                      '୧୯',
                      '୨୦',
                      '୨୧',
                      '୨୨',
                      '୨୩',
                      '୨୪',
                      '୨୫',
                      '୨୬',
                      '୨୭',
                      '୨୮',
                      '୨୯',
                      '୩୦',
                    ].map((odiaNum, index) => (
                      <View key={index} style={styles.tableCell}>
                        <Text style={styles.columnHeader}>{odiaNum}</Text>
                      </View>
                    ))}
                  </View>

                  {/* Table Data Rows */}
                  {selectedLog.mlResponse
                    .filter(
                      row =>
                        row['ସୂଚକାଙ୍କ'] &&
                        row['ସୂଚକାଙ୍କ'] !== '' &&
                        row['ସୂଚକାଙ୍କ'] !== ':---',
                    )
                    .map((row, rowIndex) => (
                      <View key={rowIndex} style={styles.tableRow}>
                        <View style={[styles.tableCell, styles.firstColumn]}>
                          <Text style={styles.indicatorText} numberOfLines={2}>
                            {row['ସୂଚକାଙ୍କ']}
                          </Text>
                        </View>

                        {/* Display scores for Odia numerals 1-30 */}
                        {[
                          '୧',
                          '୨',
                          '୩',
                          '୪',
                          '୫',
                          '୬',
                          '୭',
                          '୮',
                          '୯',
                          '୧୦',
                          '୧୧',
                          '୧୨',
                          '୧୩',
                          '୧୪',
                          '୧୫',
                          '୧୬',
                          '୧୭',
                          '୧୮',
                          '୧୯',
                          '୨୦',
                          '୨୧',
                          '୨୨',
                          '୨୩',
                          '୨୪',
                          '୨୫',
                          '୨୬',
                          '୨୭',
                          '୨୮',
                          '୨୯',
                          '୩୦',
                        ].map((odiaNum, colIndex) => {
                          const score = row[odiaNum];
                          return (
                            <View key={colIndex} style={styles.tableCell}>
                              {renderSymbol(score)}
                            </View>
                          );
                        })}
                      </View>
                    ))}
                </View>
              </ScrollView>
            </View>

            <TouchableOpacity
              style={[styles.resultsButton, styles.closeButton]}
              onPress={() => !isDeleting && setShowLogDetails(false)}
              disabled={isDeleting}
            >
              <Icon name="close" size={20} color="#FFFFFF" />
              <Text style={styles.resultsButtonText}>Close</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    );
  };

  const navigateToAllResponses = () => {
    navigation.navigate('AllResponses');
  };

  if (Platform.OS === 'android' && hasCameraPermission === null) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Checking permissions...</Text>
      </View>
    );
  }

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

  if (isProcessing) {
    const progressWidth = progressAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: ['0%', '100%'],
    });

    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.processingContainer}>
          <View style={styles.processingHeader}>
            <Icon name="auto-awesome" size={60} color="#5856D6" />
            <Text style={styles.processingTitle}>Processing Image</Text>
            <Text style={styles.processingSubtitle}>
              Extracting and analyzing competency data...
            </Text>
          </View>

          <View style={styles.processingContent}>
            <View style={styles.processingStepContainer}>
              <ActivityIndicator size="large" color="#5856D6" />
              <Text style={styles.processingStepText}>{processingStep}</Text>
            </View>

            <View style={styles.processingProgressContainer}>
              <View style={styles.progressBarBackground}>
                <Animated.View
                  style={[
                    styles.processingProgressFill,
                    { width: progressWidth },
                  ]}
                />
              </View>
              <Text style={styles.progressPercentage}>
                {Math.round(processingProgress)}%
              </Text>
            </View>

            <View style={styles.timeWarningContainer}>
              <Icon name="schedule" size={24} color="#FF9500" />
              <Text style={styles.timeWarningText}>
                If processing takes more than 1 minute, you can upload a new
                image and check results later.
              </Text>
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (showResults && ocrData) {
    const summary = calculateSummary(ocrData.mlResponse);
    const competencies = getCompetencyData(ocrData.mlResponse);

    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setShowResults(false)}
          >
            <Icon name="arrow-back" size={24} color="#1C1C1E" />
          </TouchableOpacity>
          <Text style={styles.title}>OCR Results</Text>
          <View style={styles.headerPlaceholder} />
        </View>

        <ScrollView
          contentContainerStyle={styles.resultsContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                setTimeout(() => setRefreshing(false), 1000);
              }}
              colors={['#5856D6']}
            />
          }
        >
          <View style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <Icon name="assessment" size={24} color="#5856D6" />
              <Text style={styles.summaryTitle}>Assessment Summary</Text>
            </View>

            <View style={styles.summaryStats}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{summary.total}</Text>
                <Text style={styles.statLabel}>Total Scores</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <View style={styles.symbolCountRow}>
                  {renderSymbol('+')}
                  <Text style={[styles.statNumber, { color: '#34C759' }]}>
                    {summary.plus}
                  </Text>
                </View>
                <Text style={styles.statLabel}>Excellent</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <View style={styles.symbolCountRow}>
                  {renderSymbol('▲')}
                  <Text style={[styles.statNumber, { color: '#FF9500' }]}>
                    {summary.triangle}
                  </Text>
                </View>
                <Text style={styles.statLabel}>Good</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <View style={styles.symbolCountRow}>
                  {renderSymbol('*')}
                  <Text style={[styles.statNumber, { color: '#FF3B30' }]}>
                    {summary.star}
                  </Text>
                </View>
                <Text style={styles.statLabel}>Needs Improvement</Text>
              </View>
            </View>
          </View>

          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[
                styles.tabButton,
                selectedTab === 'table' && styles.activeTab,
              ]}
              onPress={() => setSelectedTab('table')}
            >
              <Icon
                name="grid-on"
                size={20}
                color={selectedTab === 'table' ? '#5856D6' : '#8E8E93'}
              />
              <Text
                style={[
                  styles.tabText,
                  selectedTab === 'table' && styles.activeTabText,
                ]}
              >
                Data Table
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.tabButton,
                selectedTab === 'overview' && styles.activeTab,
              ]}
              onPress={() => setSelectedTab('overview')}
            >
              <Icon
                name="pie-chart"
                size={20}
                color={selectedTab === 'overview' ? '#5856D6' : '#8E8E93'}
              />
              <Text
                style={[
                  styles.tabText,
                  selectedTab === 'overview' && styles.activeTabText,
                ]}
              >
                Competency Overview
              </Text>
            </TouchableOpacity>
          </View>

          {selectedTab === 'table' ? (
            <View style={styles.tableContainer}>
              <View style={styles.tableHeader}>
                <Text style={styles.tableHeaderText}>Full Assessment Data</Text>
                <Text style={styles.tableSubHeaderText}>
                  Student scores across all competencies
                </Text>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View>
                  <View style={styles.tableRow}>
                    <View style={[styles.tableCell, styles.firstColumn]}>
                      <Text style={styles.columnHeader}>Indicator</Text>
                    </View>
                    {Array.from({ length: 30 }, (_, i) => i + 1).map(num => (
                      <View key={num} style={styles.tableCell}>
                        <Text style={styles.columnHeader}>{num}</Text>
                      </View>
                    ))}
                  </View>

                  {ocrData.mlResponse
                    .filter(
                      row =>
                        row['ସୂଚକାଙ୍କ'] &&
                        row['ସୂଚକାଙ୍କ'] !== '' &&
                        row['ସୂଚକାଙ୍କ'] !== ':---',
                    )
                    .map((row, rowIndex) => (
                      <View key={rowIndex} style={styles.tableRow}>
                        <View style={[styles.tableCell, styles.firstColumn]}>
                          <Text style={styles.indicatorText} numberOfLines={3}>
                            {row['ସୂଚକାଙ୍କ']}
                          </Text>
                        </View>
                        {Array.from({ length: 30 }, (_, i) => i + 1).map(
                          num => {
                            const key = num.toString().split('').join('');
                            const score = row[key];
                            return (
                              <View key={num} style={styles.tableCell}>
                                {renderSymbol(score)}
                              </View>
                            );
                          },
                        )}
                      </View>
                    ))}
                </View>
              </ScrollView>
            </View>
          ) : (
            <View style={styles.competencyContainer}>
              {competencies.map((competency, index) => (
                <View key={index} style={styles.competencyCard}>
                  <View style={styles.competencyHeader}>
                    <View style={styles.competencyIcon}>
                      <Icon name="school" size={20} color="#5856D6" />
                    </View>
                    <Text style={styles.competencyName}>{competency.name}</Text>
                  </View>

                  {competency.indicators.map((indicator, idx) => (
                    <View key={idx} style={styles.indicatorItem}>
                      <Text style={styles.indicatorTitle}>
                        {indicator.indicator}
                      </Text>
                      <View style={styles.indicatorScores}>
                        <Text style={styles.scoreCount}>
                          {indicator.scores.length} students assessed
                        </Text>
                        <View style={styles.scoreSymbols}>
                          {indicator.scores
                            .slice(0, 3)
                            .map((score, scoreIdx) => (
                              <View key={scoreIdx} style={styles.miniSymbol}>
                                {renderSymbol(score.score)}
                              </View>
                            ))}
                          {indicator.scores.length > 3 && (
                            <Text style={styles.moreText}>
                              +{indicator.scores.length - 3}
                            </Text>
                          )}
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              ))}
            </View>
          )}

          <View style={styles.resultsActions}>
            <TouchableOpacity
              style={[styles.resultsButton, styles.viewAllResponsesButton]}
              onPress={navigateToAllResponses}
            >
              <Icon name="view-list" size={20} color="white" />
              <Text style={styles.resultsButtonText}>View All Responses</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.resultsButton, styles.newButton]}
              onPress={resetToInitialView}
            >
              <Icon name="add-a-photo" size={20} color="#5856D6" />
              <Text style={[styles.resultsButtonText, { color: '#5856D6' }]}>
                New Image
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={navigateBack}>
            <Icon name="arrow-back" size={24} color="#1C1C1E" />
          </TouchableOpacity>
          <Text style={styles.title}>Image Capture</Text>
          <TouchableOpacity style={styles.historyButton}>
            {/* <Icon name="history" size={24} color="#5856D6" /> */}
          </TouchableOpacity>
        </View>

        {showAsyncNotification && (
          <View style={styles.asyncNotification}>
            <Icon name="schedule" size={20} color="#FF9500" />
            <Text style={styles.asyncNotificationText}>
              Your previous image is still processing. You can upload a new
              image.
            </Text>
            <TouchableOpacity
              onPress={() => setShowAsyncNotification(false)}
              style={styles.asyncCloseButton}
            >
              <Icon name="close" size={16} color="#8E8E93" />
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.mainContent}>
          {showPreview && capturedImage && !imageUrl ? (
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
                    {isUploading ? 'Uploading...' : 'Upload & Process'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : imageUrl && !isProcessing ? (
            <View style={styles.uploadSuccessContainer}>
              <View style={styles.successHeader}>
                <Icon name="check-circle" size={32} color="#4CD964" />
                <Text style={styles.successTitle}>
                  Image Uploaded Successfully!
                </Text>
                <Text style={styles.successSubtitle}>
                  Ready for OCR processing
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.actionButton, styles.processButton]}
                onPress={() => extractGrades(imageUrl)}
              >
                <Icon name="auto-awesome" size={24} color="white" />
                <Text style={styles.actionButtonText}>Process with OCR</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.initialView}>
              <View style={styles.attendanceContent}>
                <View style={styles.attendanceIllustration}>
                  <Icon name="photo-camera" size={80} color="#fe9c3b" />
                  <View style={styles.illustrationCircle} />
                </View>

                <Text style={styles.attendanceDescription}>
                  Capture or select an image to extract competency assessment
                  data
                </Text>

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

                <TouchableOpacity
                  style={[styles.secondaryButton, styles.galleryButton]}
                  onPress={() => {
                    setShowLogsModal(true);
                    fetchLogs();
                  }}
                >
                  <Icon name="photo-library" size={24} color="#007AFF" />
                  <Text
                    style={[styles.secondaryButtonText, { lineHeight: 30 }]}
                  >
                    View History
                  </Text>
                </TouchableOpacity>

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

      {/* Logs Modal */}
      <Modal
        visible={showLogsModal}
        animationType="slide"
        onRequestClose={() => setShowLogsModal(false)}
      >
        <SafeAreaView style={styles.container}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setShowLogsModal(false)}
              style={styles.modalBackButton}
            >
              <Icon name="arrow-back" size={24} color="#1C1C1E" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>OCR History</Text>
            <View style={styles.modalHeaderActions}>
              {/* {logs.length > 0 && (
                <TouchableOpacity
                  style={styles.deleteAllButton}
                  onPress={deleteAllLogs}
                >
                  <Icon name="delete-sweep" size={22} color="#FF3B30" />
                </TouchableOpacity>
              )} */}
              {/* <TouchableOpacity
                onPress={() => {
                  setRefreshing(true);
                  fetchLogs();
                  setTimeout(() => setRefreshing(false), 1000);
                }}
                style={styles.refreshButton}
              >
                <Icon name="refresh" size={24} color="#5856D6" />
              </TouchableOpacity> */}
            </View>
          </View>

          {loadingLogs ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color="#5856D6" />
              <Text style={styles.loadingText}>Loading logs...</Text>
            </View>
          ) : logs.length === 0 ? (
            <View style={styles.centerContainer}>
              <Icon name="history-toggle-off" size={60} color="#8E8E93" />
              <Text style={styles.emptyLogsText}>No logs found</Text>
              <Text style={styles.emptyLogsSubtext}>
                Process some images to see history here
              </Text>
            </View>
          ) : (
            <FlatList
              data={logs}
              renderItem={renderLogItem}
              keyExtractor={item => item.imgId}
              contentContainerStyle={styles.logsList}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={() => {
                    setRefreshing(true);
                    fetchLogs();
                    setTimeout(() => setRefreshing(false), 1000);
                  }}
                  colors={['#5856D6']}
                />
              }
            />
          )}
        </SafeAreaView>
      </Modal>

      {/* Log Details Modal */}
      {renderLogDetails()}
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
  historyButton: {
    padding: 8,
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
  scanButton: {
    backgroundColor: '#5856D6',
  },
  processButton: {
    backgroundColor: '#5856D6',
    marginTop: 20,
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
  uploadSuccessContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  successHeader: {
    alignItems: 'center',
    marginBottom: 40,
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
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
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
  // Processing Styles
  processingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F8F9FA',
  },
  processingHeader: {
    alignItems: 'center',
    marginBottom: 40,
  },
  processingTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1C1C1E',
    marginTop: 20,
    marginBottom: 8,
  },
  processingSubtitle: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
  },
  processingContent: {
    width: '100%',
    alignItems: 'center',
  },
  processingStepContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 16,
    marginBottom: 30,
    width: '100%',
    gap: 15,
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
  processingStepText: {
    fontSize: 16,
    color: '#1C1C1E',
    fontWeight: '500',
    flex: 1,
  },
  processingProgressContainer: {
    width: '100%',
    marginBottom: 30,
  },
  progressBarBackground: {
    width: '100%',
    height: 8,
    backgroundColor: '#E5E5EA',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 10,
  },
  processingProgressFill: {
    height: '100%',
    backgroundColor: '#5856D6',
    borderRadius: 4,
  },
  progressPercentage: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    fontWeight: '600',
  },
  timeWarningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    width: '100%',
    gap: 12,
  },
  timeWarningText: {
    fontSize: 14,
    color: '#E65100',
    flex: 1,
    lineHeight: 20,
  },
  cancelProcessingButton: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#FF3B30',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  cancelProcessingText: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: '600',
  },
  // Async Notification
  asyncNotification: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    marginHorizontal: 20,
    marginTop: 10,
    padding: 12,
    borderRadius: 8,
    gap: 10,
  },
  asyncNotificationText: {
    fontSize: 14,
    color: '#E65100',
    flex: 1,
  },
  asyncCloseButton: {
    padding: 4,
  },
  // Results Styles
  resultsContainer: {
    padding: 20,
  },
  summaryCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E5E5EA',
  },
  symbolCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  activeTab: {
    backgroundColor: 'white',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8E8E93',
  },
  activeTabText: {
    color: '#5856D6',
    fontWeight: '600',
  },
  tableContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  tableHeader: {
    marginBottom: 20,
  },
  tableHeaderText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  tableSubHeaderText: {
    fontSize: 14,
    color: '#8E8E93',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  tableCell: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
  },
  firstColumn: {
    width: 120,
    alignItems: 'flex-start',
  },
  columnHeader: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
  },
  indicatorText: {
    fontSize: 10,
    color: '#1C1C1E',
  },
  symbol: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  plusSymbol: {
    backgroundColor: '#34C75920',
  },
  triangleSymbol: {
    backgroundColor: '#FF950020',
  },
  starSymbol: {
    backgroundColor: '#FF3B3020',
  },
  symbolText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptySymbol: {
    fontSize: 12,
    color: '#C7C7CC',
  },
  competencyContainer: {
    marginBottom: 20,
  },
  competencyCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
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
  competencyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  competencyIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#5856D610',
    justifyContent: 'center',
    alignItems: 'center',
  },
  competencyName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    flex: 1,
  },
  indicatorItem: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  indicatorTitle: {
    fontSize: 14,
    color: '#1C1C1E',
    marginBottom: 8,
    lineHeight: 20,
  },
  indicatorScores: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scoreCount: {
    fontSize: 12,
    color: '#8E8E93',
  },
  scoreSymbols: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  miniSymbol: {
    transform: [{ scale: 0.8 }],
  },
  moreText: {
    fontSize: 12,
    color: '#8E8E93',
    marginLeft: 4,
  },
  resultsActions: {
    gap: 12,
    marginBottom: 30,
  },
  resultsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
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
  shareButton: {
    backgroundColor: '#5856D6',
  },
  viewAllResponsesButton: {
    backgroundColor: '#5856D6',
  },
  viewLogsButton: {
    backgroundColor: '#FF9500',
  },
  closeButton: {
    backgroundColor: '#FF3B30',
    marginTop: 20,
  },
  newButton: {
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#5856D6',
  },
  resultsButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  // Logs Modal Styles
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  modalBackButton: {
    padding: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  modalHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  deleteAllButton: {
    padding: 8,
  },
  refreshButton: {
    padding: 8,
  },
  logsList: {
    padding: 20,
  },
  logItem: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
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
  logHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  logInfo: {
    flex: 1,
  },
  logImgId: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  logDate: {
    fontSize: 12,
    color: '#8E8E93',
  },
  deleteLogButton: {
    padding: 8,
  },
  logStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
  },
  logStat: {
    alignItems: 'center',
    flex: 1,
  },
  logStatValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  logStatLabel: {
    fontSize: 11,
    color: '#8E8E93',
    textAlign: 'center',
  },
  logDetailsContainer: {
    padding: 20,
  },
  logSummaryCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
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
  logSummaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  logSummaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  logInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  logInfoLabel: {
    fontSize: 14,
    color: '#8E8E93',
  },
  logInfoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1C1C1E',
  },
  deleteLogDetailsButton: {
    padding: 8,
  },
  emptyLogsText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#8E8E93',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyLogsSubtext: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});

export default ImageCapture;
