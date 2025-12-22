import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  FlatList,
  Modal,
  TextInput,
  Animated,
  Alert,
  Platform,
  PermissionsAndroid,
  BackHandler,
  ImageBackground,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import AudioRecord from 'react-native-audio-record';
import Sound from 'react-native-sound';
import axios from 'axios';
import {
  getDistricts,
  getBlocks,
  getClusters,
  getSchools,
} from '../api/SchoolsApi';
import { API } from '../environments/Api';

let Picker;
try {
  Picker = require('@react-native-picker/picker').Picker;
} catch (error) {
  console.log('Picker import error:', error);
  Picker = ({
    selectedValue,
    onValueChange,
    children,
    style,
    enabled = true,
  }) => (
    <View style={[styles.pickerContainer, style]}>
      <Text>Picker not available</Text>
    </View>
  );
}

const { width, height } = Dimensions.get('window');
const isTablet = width >= 768;

const AssessmentFlow = ({ navigation, user: propUser }) => {
  const [currentSection, setCurrentSection] = useState('schoolInfo');
  const [districts, setDistricts] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [clusters, setClusters] = useState([]);
  const [schools, setSchools] = useState([]);
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [gender, setGender] = useState('male');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedDistrictCode, setSelectedDistrictCode] = useState('');
  const [selectedBlock, setSelectedBlock] = useState('');
  const [selectedBlockCode, setSelectedBlockCode] = useState('');
  const [selectedCluster, setSelectedCluster] = useState('');
  const [selectedClusterCode, setSelectedClusterCode] = useState('');
  const [selectedSchool, setSelectedSchool] = useState('');
  const [selectedUdiseCode, setSelectedUdiseCode] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('');

  const [isLoadingData, setIsLoadingData] = useState(false);
  const [user, setUser] = useState(propUser);

  const [selectedStudentRoll, setSelectedStudentRoll] = useState(null);
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [completedStudents, setCompletedStudents] = useState([]);
  const [pendingStudents, setPendingStudents] = useState([]);
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [studentNumber, setStudentNumber] = useState('');
  const [isSavingStudent, setIsSavingStudent] = useState(false);

  const [recording, setRecording] = useState(false);
  const [filePath, setFilePath] = useState('');
  const [audioSavedLocally, setAudioSavedLocally] = useState(false);
  const [soundObj, setSoundObj] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [timeLeft, setTimeLeft] = useState(25);
  const [currentWordIndex, setCurrentWordIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);
  const [wordStatus, setWordStatus] = useState({});
  const [audioReady, setAudioReady] = useState(false);
  const [audioInitialized, setAudioInitialized] = useState(false);
  const [canStopAudio, setCanStopAudio] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('idle');
  const [audioUrl, setAudioUrl] = useState('');

  const [textData, setTextData] = useState(null);
  const [loadingText, setLoadingText] = useState(false);
  const [textId, setTextId] = useState('');
  const [textBody, setTextBody] = useState('');
  const [textVersion, setTextVersion] = useState('');
  const [textHeading, setTextHeading] = useState('');
  const [textDuration, setTextDuration] = useState('');

  const [draftRecordings, setDraftRecordings] = useState([]);
  const [showDraftsModal, setShowDraftsModal] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);

  const [selectedDraft, setSelectedDraft] = useState(null);
  const [batchUploading, setBatchUploading] = useState(false);
  const [currentUploadIndex, setCurrentUploadIndex] = useState(0);
  const [uploadProgress, setUploadProgress] = useState({});
  const [batchUploadResults, setBatchUploadResults] = useState([]);
  const DRAFT_STORAGE_KEY = 'assessment_drafts';
  const timerRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const audioInitPromiseRef = useRef(null);
  const audioInitCompletedRef = useRef(false);

  // New state for enhanced draft UI
  const [draftDetailModalVisible, setDraftDetailModalVisible] = useState(false);
  const [selectedDraftForDetail, setSelectedDraftForDetail] = useState(null);
  const [playingDraftId, setPlayingDraftId] = useState(null);
  const [uploadingDraftId, setUploadingDraftId] = useState(null);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        if (propUser) {
          setUser(propUser);
          return;
        }

        const userDataString = await AsyncStorage.getItem('userData');
        if (userDataString) {
          const userData = JSON.parse(userDataString);
          setUser(userData);
        }
      } catch (error) {
        console.error('Error loading user data from AsyncStorage:', error);
      }
    };

    loadUserData();
  }, [propUser]);

  useFocusEffect(
    React.useCallback(() => {
      const loadUserOnFocus = async () => {
        try {
          const userDataString = await AsyncStorage.getItem('userData');
          if (userDataString) {
            const userData = JSON.parse(userDataString);
            setUser(userData);
          }
        } catch (error) {
          console.error('Error refreshing user data:', error);
        }
      };

      loadUserOnFocus();
    }, []),
  );

  useEffect(() => {
    const backAction = () => {
      if (currentSection === 'schoolInfo') {
        navigation.navigate('Welcome');
        return true;
      } else if (currentSection === 'studentSelection') {
        setCurrentSection('schoolInfo');
        return true;
      } else if (currentSection === 'assessment') {
        Alert.alert(
          'ପଛକୁ ଯାଆନ୍ତୁ',
          'ଆପଣ ନିଶ୍ଚିତ କି ପଛକୁ ଯିବେ? ସେଭ୍ ହୋଇନଥିବା ରେକର୍ଡିଂ ନଷ୍ଟ ହେବ।',
          [
            { text: 'ବାତିଲ୍', style: 'cancel' },
            {
              text: 'ହଁ',
              onPress: () => setCurrentSection('studentSelection'),
            },
          ],
        );
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction,
    );

    return () => backHandler.remove();
  }, [currentSection, navigation]);

  // New function to show draft details
  const showDraftDetails = draft => {
    setSelectedDraftForDetail(draft);
    setDraftDetailModalVisible(true);
  };

  // Enhanced batch upload function
  const batchUploadDrafts = async () => {
    if (draftRecordings.length === 0) {
      Alert.alert('Info', 'No drafts to upload');
      return;
    }

    Alert.alert(
      'ବହୁ ଡ୍ରାଫ୍ଟ ଅପଲୋଡ୍',
      `ଆପଣ ${draftRecordings.length} ଟି ଡ୍ରାଫ୍ଟ ସର୍ଭରକୁ ଅପଲୋଡ୍ କରିବାକୁ ଚାହୁଁଛନ୍ତି। ଏହା କିଛି ସମୟ ନେଇପାରେ।`,
      [
        { text: 'ବାତିଲ୍', style: 'cancel' },
        {
          text: 'ଅପଲୋଡ୍ କରନ୍ତୁ',
          onPress: async () => {
            setBatchUploading(true);
            setCurrentUploadIndex(0);
            setUploadProgress({});
            setBatchUploadResults([]);

            let successfulUploads = 0;
            let failedUploads = 0;

            for (let i = 0; i < draftRecordings.length; i++) {
              const draft = draftRecordings[i];
              setCurrentUploadIndex(i + 1);

              setUploadProgress(prev => ({
                ...prev,
                [draft.id]: {
                  status: 'uploading',
                  message: 'ଅପଲୋଡ୍ ହେଉଛି...',
                },
              }));

              try {
                const uploadResult = await uploadSingleDraftToServer(draft);

                if (uploadResult.success) {
                  successfulUploads++;
                  setUploadProgress(prev => ({
                    ...prev,
                    [draft.id]: {
                      status: 'success',
                      message: 'ସଫଳତାର ସହ ଅପଲୋଡ୍ ହେଲା',
                    },
                  }));

                  // Update local state immediately for this student
                  setCompletedStudents(prev => {
                    if (!prev.includes(draft.rollNumber.toString())) {
                      return [...prev, draft.rollNumber.toString()];
                    }
                    return prev;
                  });

                  setStudents(prevStudents =>
                    prevStudents.map(student =>
                      student.rollNumber?.toString() ===
                      draft.rollNumber?.toString()
                        ? { ...student, hasORF: true }
                        : student,
                    ),
                  );

                  setPendingStudents(prev =>
                    prev.filter(roll => roll !== draft.rollNumber?.toString()),
                  );
                } else {
                  failedUploads++;
                  setUploadProgress(prev => ({
                    ...prev,
                    [draft.id]: {
                      status: 'error',
                      message: uploadResult.message || 'ଅପଲୋଡ୍ ବିଫଳ',
                    },
                  }));
                }
              } catch (error) {
                failedUploads++;
                setUploadProgress(prev => ({
                  ...prev,
                  [draft.id]: {
                    status: 'error',
                    message: 'ଅପଲୋଡ୍ ବିଫଳ',
                  },
                }));
              }

              await new Promise(resolve => setTimeout(resolve, 1000));
            }

            Alert.alert(
              'ଅପଲୋଡ୍ ସମାପ୍ତ',
              `ଅପଲୋଡ୍ ସମାପ୍ତ!${
                successfulUploads > 0 ? `\n${successfulUploads} ଟି ସଫଳ` : ''
              }${failedUploads > 0 ? `\n${failedUploads} ଟି ବିଫଳ` : ''}`,
              [{ text: 'ଠିକ୍ ଅଛି' }],
            );

            // Refresh data from server to get the latest status
            await refreshStudentData();

            // Also refresh the drafts list
            await loadDraftRecordings();

            setBatchUploading(false);
          },
        },
      ],
    );
  };

  // Single draft upload function
  const uploadSingleDraftToServer = async draft => {
    try {
      const uploadFileName = `draft_${draft.studentId}_${
        draft.class
      }_${Date.now()}.wav`;

      const uploadResult = await UploadFileToCloud(
        draft.filePath,
        uploadFileName,
      );

      if (uploadResult.success && uploadResult.url) {
        const body = {
          coordinatorId: user?.coordinatorId || 'COORD001',
          studentId: draft.studentId,
          rollNumber: draft.rollNumber,
          class: draft.class,
          blockCode: draft.blockCode,
          block: draft.block,
          districtCode: draft.districtCode,
          district: draft.district,
          academicSession: '2025-2026',
          textId: draft.textId,
          textHeading: draft.textHeading,
          textBody: draft.textBody || [],
          audioUrl: uploadResult.url,
          audioDuration: draft.audioDuration || draft.duration || 0,
          textVersion: draft.textVersion || '1.1.0',
          textDuration: draft.textDuration,
          assessmentType: 'ORF',
          assessmentDate: new Date().toISOString(),
          status: 'completed',
        };

        const response = await API.post(`saveOrf`, body);

        if (response.status === 201) {
          // Remove draft from AsyncStorage after successful upload
          const existingDraftsString = await AsyncStorage.getItem(
            DRAFT_STORAGE_KEY,
          );
          if (existingDraftsString) {
            const existingDrafts = JSON.parse(existingDraftsString);
            const updatedDrafts = existingDrafts.filter(d => d.id !== draft.id);

            await AsyncStorage.setItem(
              DRAFT_STORAGE_KEY,
              JSON.stringify(updatedDrafts),
            );
            setDraftRecordings(updatedDrafts);
          }

          // Return success
          return {
            success: true,
            message: 'ସଫଳତାର ସହ ଅପଲୋଡ୍ ହେଲା',
          };
        } else {
          return {
            success: false,
            message: 'ସର୍ଭର ତ୍ରୁଟି',
          };
        }
      } else {
        return {
          success: false,
          message: uploadResult.error || 'ଫାଇଲ୍ ଅପଲୋଡ୍ ବିଫଳ',
        };
      }
    } catch (error) {
      console.error('Error uploading draft:', error);

      // Update draft with failed attempt
      const existingDraftsString = await AsyncStorage.getItem(
        DRAFT_STORAGE_KEY,
      );
      if (existingDraftsString) {
        const existingDrafts = JSON.parse(existingDraftsString);
        const draftIndex = existingDrafts.findIndex(d => d.id === draft.id);

        if (draftIndex !== -1) {
          existingDrafts[draftIndex] = {
            ...existingDrafts[draftIndex],
            uploadAttempts:
              (existingDrafts[draftIndex].uploadAttempts || 0) + 1,
            lastUploadAttempt: new Date().toISOString(),
            lastError: error.message,
          };

          await AsyncStorage.setItem(
            DRAFT_STORAGE_KEY,
            JSON.stringify(existingDrafts),
          );
          setDraftRecordings(existingDrafts);
        }
      }

      return {
        success: false,
        message: error.message || 'ଅପଲୋଡ୍ ବିଫଳ',
      };
    }
  };

  const UploadFileToCloud = async (fileUri, fileName) => {
    try {
      const formData = new FormData();
      let mimeType = 'audio/wav';

      if (fileName.endsWith('.mp3')) {
        mimeType = 'audio/mpeg';
      } else if (fileName.endsWith('.m4a') || fileName.endsWith('.aac')) {
        mimeType = 'audio/mp4';
      }

      let actualUri = fileUri;
      if (!fileUri.startsWith('file://') && !fileUri.startsWith('content://')) {
        actualUri = `file://${fileUri}`;
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
        },
      );

      return {
        success: response?.status === 200,
        url: response?.data?.url,
      };
    } catch (error) {
      console.error('Error uploading file:', error);
      return { success: false, url: null, error: error.message };
    }
  };

  useEffect(() => {
    fetchDistricts();
  }, []);

  const fetchDistricts = async () => {
    try {
      setIsLoadingData(true);
      const response = await getDistricts();
      if (response?.status === 200) {
        setDistricts(response?.data);
      }
      setIsLoadingData(false);
    } catch (err) {
      console.log('err--->', err);
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    if (selectedDistrict && selectedDistrictCode) {
      fetchBlocks(selectedDistrict, selectedDistrictCode);
    }
  }, [selectedDistrict, selectedDistrictCode]);

  const fetchBlocks = async (district, districtCode) => {
    try {
      setIsLoadingData(true);
      const response = await getBlocks(district, districtCode);
      if (response?.status === 200) {
        setBlocks(response?.data);
        setSelectedBlock('');
        setSelectedBlockCode('');
        setSelectedCluster('');
        setSelectedClusterCode('');
        setSelectedSchool('');
        setSchools([]);
        setClusters([]);
      }
      setIsLoadingData(false);
    } catch (err) {
      console.log('err fetching blocks--->', err);
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    if (
      selectedBlock &&
      selectedBlockCode &&
      selectedDistrict &&
      selectedDistrictCode
    ) {
      fetchClusters(
        selectedDistrict,
        selectedDistrictCode,
        selectedBlock,
        selectedBlockCode,
      );
    }
  }, [selectedBlock, selectedBlockCode]);

  const fetchClusters = async (district, districtCode, block, blockCode) => {
    try {
      setIsLoadingData(true);
      const response = await getClusters(
        district,
        districtCode,
        block,
        blockCode,
      );
      if (response?.status === 200) {
        setClusters(response?.data);
        setSelectedCluster('');
        setSelectedClusterCode('');
        setSelectedSchool('');
        setSchools([]);
      }
      setIsLoadingData(false);
    } catch (err) {
      console.log('err fetching clusters--->', err);
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    if (
      selectedCluster &&
      selectedClusterCode &&
      selectedBlock &&
      selectedBlockCode &&
      selectedDistrict &&
      selectedDistrictCode
    ) {
      fetchSchools(
        selectedDistrict,
        selectedDistrictCode,
        selectedBlock,
        selectedBlockCode,
        selectedCluster,
        selectedClusterCode,
      );
    }
  }, [selectedCluster, selectedClusterCode]);

  const fetchSchools = async (
    district,
    districtCode,
    block,
    blockCode,
    cluster,
    clusterCode,
  ) => {
    try {
      setIsLoadingData(true);
      const response = await getSchools(
        district,
        districtCode,
        block,
        blockCode,
        cluster,
        clusterCode,
      );
      if (response?.status === 200) {
        setSchools(response?.data);
        setSelectedSchool('');
      }
      setIsLoadingData(false);
    } catch (err) {
      console.log('err fetching schools--->', err);
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    setClasses([
      { classId: '1', className: '1' },
      { classId: '2', className: '2' },
      { classId: '3', className: '3' },
      { classId: '4', className: '4' },
      { classId: '5', className: '5' },
    ]);
  }, []);

  const fetchStudents = async (classId, school) => {
    setIsLoadingData(true);

    try {
      const apiUrl = `/getStudsWithOrf?blockCode=${selectedBlockCode}&class=${classId}`;
      const response = await API.get(apiUrl);

      if (response.status === 200 && response.data && response.data.success) {
        const studentsData = response.data.data || [];
        const formattedStudents = [];
        const completed = [];
        const pending = [];

        if (Array.isArray(studentsData)) {
          studentsData.forEach((student, index) => {
            const studentObj = {
              id: student.studentId || `student-${index}`,
              studentId: student.studentId,
              studentName: student.studentName || `Student ${index + 1}`,
              rollNumber: student.rollNumber || index + 1,
              class: student.class || classId,
              hasORF: student.orfCompleted || false,
              assessmentDate: student.assessmentDate,
              assessmentScore: student.assessmentScore,
              udiseCode: student.udiseCode,
              school: student.school,
              district: student.district,
              block: student.block,
              cluster: student.cluster,
              gender: student.gender,
            };

            formattedStudents.push(studentObj);

            if (student.orfCompleted === true) {
              completed.push(studentObj.rollNumber?.toString());
            } else {
              pending.push(studentObj.rollNumber?.toString());
            }
          });
        }

        formattedStudents.sort((a, b) => {
          const rollA = parseInt(a.rollNumber) || 0;
          const rollB = parseInt(b.rollNumber) || 0;
          return rollA - rollB;
        });

        setStudents(formattedStudents);
        setCompletedStudents(completed);
        setPendingStudents(pending);
      } else {
        setStudents([]);
        setCompletedStudents([]);
        setPendingStudents([]);
      }
    } catch (error) {
      console.error('Error fetching students with ORF status:', error);
      await fetchAllStudentsFallback(classId);
    } finally {
      setIsLoadingData(false);
    }
  };

  const fetchAllStudentsFallback = async classId => {
    try {
      const udiseCode = getUdiseCodeFromSelectedSchool();
      if (!udiseCode) return;

      const fallbackResponse = await API.get(
        `/getAllStudents?udiseCode=${udiseCode}&class=${classId}`,
      );

      if (fallbackResponse.status === 200 && fallbackResponse.data) {
        const fallbackData =
          fallbackResponse.data.data || fallbackResponse.data || [];
        const formattedStudents = fallbackData.map((student, index) => ({
          id: student.studentId || `student-${index}`,
          studentId: student.studentId,
          studentName:
            student.studentName || student.name || `Student ${index + 1}`,
          rollNumber: student.rollNumber || student.rollNo || index + 1,
          class: classId,
          hasORF: false,
        }));

        setStudents(formattedStudents);
        setCompletedStudents([]);
        setPendingStudents(
          formattedStudents.map(s => s.rollNumber?.toString()),
        );
      }
    } catch (fallbackError) {
      console.error('Fallback API also failed:', fallbackError);
      setStudents([]);
      setCompletedStudents([]);
      setPendingStudents([]);
    }
  };

  const saveStudentToServer = async studentData => {
    try {
      setIsSavingStudent(true);
      const response = await API.post(`/createTempStudent`, studentData);

      if (response.status === 201) {
        if (selectedClass) {
          await fetchStudents(selectedClass, selectedSchool);
        }
        Alert.alert('', 'ରୋଲ୍ ନମ୍ୱର ସଫଳତାର ସହ ଦାଖଲ ହୋଇଛି ।', [
          {
            text: 'OK',
            onPress: () => {
              setIsAddModalVisible(false);
              setStudentNumber('');
            },
          },
        ]);
      } else {
        Alert.alert('Error', 'RollNumber Error', [
          {
            text: 'OK',
            onPress: () => {
              setIsAddModalVisible(false);
              setStudentNumber('');
            },
          },
        ]);
      }
      return response.data;
    } catch (error) {
      console.error('Error saving student:', error.response);
      if (error.response.status === 409) {
        Alert.alert(
          `${error.response.data.error}`,
          `${error.response.data.message}`,
          [
            {
              text: 'OK',
              onPress: () => {
                setStudentNumber('');
              },
            },
          ],
        );
      } else {
        Alert.alert('Error', 'Failed to save student. Please try again.');
      }
      throw error;
    } finally {
      setIsSavingStudent(false);
    }
  };

  const handleAddStudent = async () => {
    if (!studentNumber.trim()) return;

    const studentData = {
      rollNumber: parseInt(studentNumber),
      gender: gender,
      studentName: `ନୂତନ ଶିକ୍ଷାର୍ଥୀ ${selectedClass}-${studentNumber}`,
      class: selectedClass,
      academicSession: '2025-2026',
      district: selectedDistrict,
      districtCode: selectedDistrictCode,
      block: selectedBlock,
      blockCode: selectedBlockCode,
    };

    await saveStudentToServer(studentData);
  };

  const handleStartAssessment = () => {
    console.log('Starting assessment for:', {
      student: selectedStudent,
      roll: selectedStudentRoll,
      class: selectedClass,
      school: selectedSchool,
    });
  };

  useEffect(() => {
    const initializeAudio = async () => {
      try {
        audioInitPromiseRef.current = (async () => {
          await AudioRecord.init({
            sampleRate: 16000,
            channels: 1,
            bitsPerSample: 16,
            wavFile: 'recorded_audio.wav',
          });

          await new Promise(res => setTimeout(res, 300));

          audioInitCompletedRef.current = true;
          setAudioInitialized(true);
          console.log('AudioRecord initialized (confirmed)');
        })();

        await audioInitPromiseRef.current;
      } catch (error) {
        console.error('Failed to initialize AudioRecord:', error);
        Alert.alert('Error', 'Failed to initialize audio recording');
      }
    };

    initializeAudio();

    return () => {
      if (soundObj) {
        soundObj.release();
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const requestPermission = async () => {
    try {
      if (Platform.OS === 'android') {
        const permissions = [PermissionsAndroid.PERMISSIONS.RECORD_AUDIO];
        const results = await PermissionsAndroid.requestMultiple(permissions);
        return (
          results[PermissionsAndroid.PERMISSIONS.RECORD_AUDIO] ===
          PermissionsAndroid.RESULTS.GRANTED
        );
      }
      return true;
    } catch (error) {
      console.error('Permission request error:', error);
      return false;
    }
  };

  let audioInitPromise = null;
  const startRecording = async () => {
    try {
      const hasPermission = await requestPermission();
      if (!hasPermission) return Alert.alert('Permission denied');

      if (!audioInitPromise) {
        audioInitPromise = (async () => {
          await AudioRecord.init({
            sampleRate: 16000,
            channels: 1,
            bitsPerSample: 16,
            wavFile: 'recorded_audio.wav',
          });
          await new Promise(r => setTimeout(r, 300));
        })();
        setAudioInitialized(true);
      }

      await audioInitPromise;

      setRecording(true);
      setTimeLeft(0);
      setCurrentWordIndex(-1);
      setWordStatus({});
      setAudioSavedLocally(false);

      let recordingDuration = 0;
      timerRef.current = setInterval(() => {
        recordingDuration++;
        setTimeLeft(recordingDuration);
      }, 1000);

      try {
        await AudioRecord.start();
      } catch (err) {
        console.warn('Start failed, retrying once...', err);
        await new Promise(r => setTimeout(r, 500));
        await AudioRecord.start();
      }
    } catch (error) {
      console.error('Failed to start recording:', error);
      setRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      Alert.alert(
        'Recording Error',
        'Failed to start recording. Please try again.',
      );
    }
  };

  const stopRecording = async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    try {
      setIsLoading(true);
      const audioFile = await AudioRecord.stop();
      setFilePath(audioFile);
      setRecording(false);
      setAudioSavedLocally(true);

      Alert.alert(
        'Recording Saved Locally',
        'Recording completed. Click "Save to Server" to upload it to the cloud.',
        [{ text: 'OK' }],
      );
    } catch (error) {
      setAudioSavedLocally(false);
      console.error('Error in stopRecording:', error);
      Alert.alert('Error', 'Failed to save recording.');
    } finally {
      setIsLoading(false);
    }
  };

  const playAudio = () => {
    try {
      if (soundObj) {
        soundObj.release();
      }

      if (!filePath) {
        Alert.alert('Error', 'No audio file found');
        return;
      }

      let audioUri = filePath;
      if (!audioUri.startsWith('file://')) {
        audioUri = `file://${audioUri}`;
      }

      const newSound = new Sound(audioUri, '', error => {
        if (error) {
          console.error('Failed to load audio:', error);
          Alert.alert('Playback Error', 'Failed to load audio file');
          setPlaying(false);
          return;
        }

        newSound.play(success => {
          if (success) {
            console.log('Audio finished playing');
          } else {
            console.log('Audio playback failed');
            Alert.alert('Playback Error', 'Failed to play audio');
          }
          newSound.release();
          setPlaying(false);
          setCanStopAudio(false);
          setSoundObj(null);
        });

        setPlaying(true);
        setCanStopAudio(true);
      });

      setSoundObj(newSound);
    } catch (error) {
      console.error('Error in playAudio:', error);
      Alert.alert('Error', 'Failed to play audio');
      setPlaying(false);
    }
  };

  const pauseAudio = () => {
    try {
      if (soundObj && playing) {
        soundObj.pause();
        setPlaying(false);
        setCanStopAudio(true);
      }
    } catch (error) {
      console.error('Error in pauseAudio:', error);
    }
  };

  const stopAudio = () => {
    try {
      if (soundObj) {
        soundObj.stop();
        soundObj.release();
        setPlaying(false);
        setCanStopAudio(false);
        setSoundObj(null);
      }
    } catch (error) {
      console.error('Error in stopAudio:', error);
    }
  };

  const formatTime = seconds => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const generateUniqueFileName = (forDraft = false) => {
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(7);

    if (forDraft && selectedStudentId) {
      return `draft_${selectedStudentId}_${selectedClass}_${timestamp}_${randomId}.wav`;
    }

    return `assessment_${selectedStudentRoll}_${selectedClass}_${timestamp}_${randomId}.wav`;
  };

  useEffect(() => {
    loadDraftRecordings();
  }, []);

  const loadDraftRecordings = async () => {
    try {
      const draftsString = await AsyncStorage.getItem(DRAFT_STORAGE_KEY);
      if (draftsString) {
        const drafts = JSON.parse(draftsString);
        const sortedDrafts = drafts.sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
        );
        setDraftRecordings(sortedDrafts);
      } else {
        setDraftRecordings([]);
      }
    } catch (error) {
      console.error('Error loading draft recordings:', error);
      setDraftRecordings([]);
    }
  };

  const saveDraftRecording = async draftData => {
    try {
      setIsSavingDraft(true);

      const draftId = `draft_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      const newDraft = {
        id: draftId,
        fileName: draftData.fileName || generateUniqueFileName(),
        filePath: draftData.filePath,
        localFilePath: draftData.filePath,
        studentId: draftData.studentId,
        studentName: draftData.studentName || `Student ${draftData.rollNumber}`,
        rollNumber: draftData.rollNumber,
        class: draftData.class,
        blockCode: draftData.blockCode,
        block: draftData.block,
        districtCode: draftData.districtCode,
        district: draftData.district,
        textId: draftData.textId,
        textHeading: draftData.textHeading,
        textBody: draftData.textBody,
        textVersion: draftData.textVersion,
        textDuration: draftData.textDuration,
        duration: draftData.duration || timeLeft,
        audioDuration: draftData.duration || timeLeft,
        recordingDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'draft',
        fileSize: draftData.fileSize || '0 KB',
        uploadAttempts: 0,
        lastUploadAttempt: null,
      };

      const existingDraftsString = await AsyncStorage.getItem(
        DRAFT_STORAGE_KEY,
      );
      let existingDrafts = [];

      if (existingDraftsString) {
        existingDrafts = JSON.parse(existingDraftsString);

        const existingDraftIndex = existingDrafts.findIndex(
          draft =>
            draft.studentId === newDraft.studentId &&
            draft.textId === newDraft.textId &&
            draft.status === 'draft',
        );

        if (existingDraftIndex !== -1) {
          existingDrafts[existingDraftIndex] = {
            ...existingDrafts[existingDraftIndex],
            ...newDraft,
            updatedAt: new Date().toISOString(),
          };
        } else {
          existingDrafts.push(newDraft);
        }
      } else {
        existingDrafts = [newDraft];
      }

      await AsyncStorage.setItem(
        DRAFT_STORAGE_KEY,
        JSON.stringify(existingDrafts),
      );

      const sortedDrafts = existingDrafts.sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
      );
      setDraftRecordings(sortedDrafts);

      console.log('Draft saved successfully:', newDraft.id);
      return newDraft;
    } catch (error) {
      console.error('Error saving draft:', error);
      Alert.alert(
        'ତ୍ରୁଟି',
        'ଡ୍ରାଫ୍ଟ ସେଭ୍ କରିବାରେ ବିଫଳ ହେଲା।\nଦୟାକରି ପୁଣି ଚେଷ୍ଟା କରନ୍ତୁ।',
      );
      return null;
    } finally {
      setIsSavingDraft(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      if (currentSection === 'studentSelection') {
        loadDraftRecordings();
        if (selectedClass && selectedBlockCode) {
          fetchStudents(selectedClass, selectedBlockCode);
        }
      }
    }, [currentSection, selectedClass, selectedBlockCode]),
  );

  const handleSaveDraft = async () => {
    if (!filePath || !audioSavedLocally) {
      Alert.alert('ରେକର୍ଡିଂ ନାହିଁ', 'ଦୟାକରି ପ୍ରଥମେ ରେକର୍ଡିଂ କରନ୍ତୁ।');
      return;
    }

    if (!selectedStudentRoll || !selectedStudentId) {
      Alert.alert(
        'ଶିକ୍ଷାର୍ଥୀ ନିର୍ବାଚନ କରନ୍ତୁ',
        'ଦୟାକରି ପ୍ରଥମେ ଜଣେ ଶିକ୍ଷାର୍ଥୀ ଚୟନ କରନ୍ତୁ।',
      );
      return;
    }

    if (!textId) {
      Alert.alert(
        'ପାଠ୍ୟ ନାହିଁ',
        'ପାଠ୍ୟ ସାମଗ୍ରୀ ଲୋଡ୍ ହେଉନାହିଁ।\nଦୟାକରି ଅପେକ୍ଷା କରନ୍ତୁ।',
      );
      return;
    }

    try {
      let fileSize = 'Unknown';
      try {
        const fs = require('react-native-fs');
        const fileInfo = await fs.stat(filePath);
        const sizeInKB = Math.round(fileInfo.size / 1024);
        fileSize = `${sizeInKB} KB`;
      } catch (error) {
        console.log('Could not get file size:', error);
      }

      const draftData = {
        fileName: generateUniqueFileName(),
        filePath: filePath,
        studentId: selectedStudentId,
        studentName: selectedStudent,
        rollNumber: selectedStudentRoll,
        class: selectedClass,
        blockCode: selectedBlockCode,
        block: selectedBlock,
        districtCode: selectedDistrictCode,
        district: selectedDistrict,
        textId: textId,
        textHeading: textHeading,
        textBody: textBody,
        textVersion: textVersion,
        textDuration: textDuration,
        duration: timeLeft,
        fileSize: fileSize,
      };

      const savedDraft = await saveDraftRecording(draftData);

      if (savedDraft) {
        await loadDraftRecordings();
        if (selectedClass && selectedBlockCode) {
          await fetchStudents(selectedClass, selectedBlockCode);
        }

        setFilePath('');
        setAudioSavedLocally(false);
        setSoundObj(null);
        setPlaying(false);
        setTimeLeft(0);
        setUploadStatus('idle');
        setAudioUrl('');
        setCurrentWordIndex(-1);
        setWordStatus({});

        setCurrentSection('studentSelection');
      }
    } catch (error) {
      console.error('Error in handleSaveDraft:', error);
      Alert.alert('ତ୍ରୁଟି', 'ଡ୍ରାଫ୍ଟ ସେଭ୍ କରିବାରେ ବିଫଳ ହେଲା।');
    }
  };

  const deleteDraftRecording = async draftId => {
    try {
      Alert.alert(
        'ଡ୍ରାଫ୍ଟ ଡିଲିଟ୍ କରନ୍ତୁ',
        'ଆପଣ ନିଶ୍ଚିତ କି ଏହି ଡ୍ରାଫ୍ଟ ଡିଲିଟ୍ କରିବେ?\nଏହା ପଛକୁ ଆଣିହେବ ନାହିଁ।',
        [
          {
            text: 'ବାତିଲ୍',
            style: 'cancel',
          },
          {
            text: 'ଡିଲିଟ୍ କରନ୍ତୁ',
            onPress: async () => {
              try {
                const existingDraftsString = await AsyncStorage.getItem(
                  DRAFT_STORAGE_KEY,
                );
                if (existingDraftsString) {
                  const existingDrafts = JSON.parse(existingDraftsString);
                  const updatedDrafts = existingDrafts.filter(
                    draft => draft.id !== draftId,
                  );

                  await AsyncStorage.setItem(
                    DRAFT_STORAGE_KEY,
                    JSON.stringify(updatedDrafts),
                  );

                  const sortedDrafts = updatedDrafts.sort(
                    (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
                  );
                  setDraftRecordings(sortedDrafts);

                  Alert.alert('ସଫଳତା', 'ଡ୍ରାଫ୍ଟ ସଫଳତାର ସହିତ ଡିଲିଟ୍ ହୋଇଛି।');
                }
              } catch (error) {
                console.error('Error deleting draft:', error);
                Alert.alert('ତ୍ରୁଟି', 'ଡ୍ରାଫ୍ଟ ଡିଲିଟ୍ କରିବାରେ ବିଫଳ ହେଲା।');
              }
            },
            style: 'destructive',
          },
        ],
      );
    } catch (error) {
      console.error('Error in deleteDraftRecording:', error);
      Alert.alert('Error', 'ଡ୍ରାଫ୍ଟ ଡିଲିଟ୍ କରିବାରେ ବିଫଳ ହେଲା');
    }
  };

  const uploadDraftToServer = async draft => {
    setUploadingDraftId(draft.id);
    const result = await uploadSingleDraftToServer(draft);
    setUploadingDraftId(null);

    if (result.success) {
      Alert.alert('ସଫଳତା', 'ରେକର୍ଡିଂ ସଫଳତାର ସହିତ ସର୍ଭରକୁ ଅପଲୋଡ୍ ହୋଇଛି!', [
        { text: 'ଠିକ୍ ଅଛି' },
      ]);
      await refreshStudentData();
    } else {
      Alert.alert(
        'ଅପଲୋଡ୍ ବିଫଳ',
        result.message || 'ଡ୍ରାଫ୍ଟ ଅପଲୋଡ୍ କରିବାରେ ବିଫଳ ହେଲା।',
      );
    }
  };

  const playDraftAudio = async draft => {
    try {
      if (soundObj) {
        soundObj.release();
        setSoundObj(null);
        setPlayingDraftId(null);
      }

      if (!draft.filePath) {
        Alert.alert('Error', 'Audio file not found');
        return;
      }

      let audioUri = draft.filePath;
      if (!audioUri.startsWith('file://')) {
        audioUri = `file://${audioUri}`;
      }

      setPlayingDraftId(draft.id);
      const newSound = new Sound(audioUri, '', error => {
        if (error) {
          console.error('Failed to load draft audio:', error);
          Alert.alert('Playback Error', 'Failed to load draft audio file');
          setPlayingDraftId(null);
          return;
        }

        newSound.play(success => {
          if (success) {
            console.log('Draft audio finished playing');
          } else {
            console.log('Draft audio playback failed');
            Alert.alert('Playback Error', 'Failed to play draft audio');
          }
          newSound.release();
          setPlayingDraftId(null);
          setSoundObj(null);
        });
      });

      setSoundObj(newSound);
    } catch (error) {
      console.error('Error in playDraftAudio:', error);
      Alert.alert('Error', 'Failed to play draft audio');
      setPlayingDraftId(null);
    }
  };

  const clearAllDrafts = async () => {
    try {
      if (draftRecordings.length === 0) {
        Alert.alert('Info', 'No drafts to clear');
        return;
      }

      Alert.alert(
        'ସମସ୍ତ ଡ୍ରାଫ୍ଟ ଡିଲିଟ୍ କରନ୍ତୁ',
        'ଆପଣ ନିଶ୍ଚିତ କି ସମସ୍ତ ଡ୍ରାଫ୍ଟ ଡିଲିଟ୍ କରିବେ?\nଏହା ପଛକୁ ଆଣିହେବ ନାହିଁ।',
        [
          {
            text: 'ବାତିଲ୍',
            style: 'cancel',
          },
          {
            text: 'ସମସ୍ତ ଡିଲିଟ୍ କରନ୍ତୁ',
            onPress: async () => {
              try {
                await AsyncStorage.removeItem(DRAFT_STORAGE_KEY);
                setDraftRecordings([]);
                Alert.alert('ସଫଳତା', 'ସମସ୍ତ ଡ୍ରାଫ୍ଟ ସଫଳତାର ସହିତ ଡିଲିଟ୍ ହୋଇଛି।');
              } catch (error) {
                console.error('Error clearing all drafts:', error);
                Alert.alert('Error', 'Failed to clear all drafts');
              }
            },
            style: 'destructive',
          },
        ],
      );
    } catch (error) {
      console.error('Error in clearAllDrafts:', error);
      Alert.alert('Error', 'Failed to clear drafts');
    }
  };

  const refreshStudentData = async () => {
    if (selectedClass && selectedBlockCode) {
      try {
        // Show loading state
        setIsLoadingData(true);

        // Fetch updated data from server
        await fetchStudents(selectedClass, selectedBlockCode);

        console.log('Student data refreshed successfully from server');
      } catch (error) {
        console.error('Error refreshing student data:', error);
      } finally {
        setIsLoadingData(false);
      }
    }
  };

  const handleManualSave = async () => {
    if (!filePath) {
      Alert.alert('No Recording', 'Please record audio first before saving.');
      return;
    }

    try {
      setIsLoading(true);
      setUploadStatus('uploading');

      const fileName = generateUniqueFileName();
      const uploadResult = await UploadFileToCloud(filePath, fileName);

      if (uploadResult.success) {
        setUploadStatus('success');
        setAudioUrl(uploadResult.url);

        const body = {
          coordinatorId: user?.coordinatorId || 'COORD001',
          studentId: selectedStudentId,
          rollNumber: selectedStudentRoll,
          class: selectedClass,
          blockCode: selectedBlockCode,
          block: selectedBlock,
          districtCode: selectedDistrictCode,
          district: selectedDistrict,
          academicSession: '2025-2026',
          textId: textId,
          textHeading: textHeading,
          textBody: textBody || [],
          audioUrl: uploadResult.url,
          audioDuration: timeLeft,
          textVersion: textVersion || '1.1.0',
          textDuration: textDuration,
        };

        const response = await API.post(`saveOrf`, body);

        if (response.status === 201) {
          Alert.alert('Success', 'Recording saved and uploaded successfully!', [
            {
              text: 'OK',
              onPress: async () => {
                setCurrentSection('studentSelection');
                await refreshStudentData();
                setFilePath('');
                setSoundObj(null);
                setPlaying(false);
                setWordStatus({});
                setCurrentWordIndex(-1);
                setUploadStatus('idle');
                setAudioUrl('');
              },
            },
          ]);
        }
        setCompletedStudents(prev => [...prev, selectedStudentRoll.toString()]);
      } else {
        setUploadStatus('error');
        Alert.alert(
          'Save Failed',
          `Failed to save recording: ${uploadResult.error || 'Unknown error'}`,
        );
      }
    } catch (error) {
      console.error('Error in manual save:', error);
      setUploadStatus('error');
      Alert.alert('Error', 'Failed to save recording.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTextData = async grade => {
    try {
      setLoadingText(true);
      const apiUrl = `/getTextGrid/shuffled?userId=${
        user?.userId || 'user123'
      }&class=${grade}`;

      const response = await API.get(apiUrl);

      if (response.status === 200) {
        const { textId, textHeading, textBody, textVersion, textDuration } =
          response.data.data;
        setTextId(textId);
        setTextBody(textBody);
        setTextVersion(textVersion);
        setTextHeading(textHeading);
        setTextDuration(textDuration);

        setTextData({
          textId,
          textHeading,
          textBody,
          textVersion,
          title: `ପଠନ ବିଷୟ: ଶ୍ରେଣୀ ${grade} ପାଠ୍ୟ`,
        });

        return textBody;
      } else {
        throw new Error('Failed to fetch text data');
      }
    } catch (error) {
      console.error('Error fetching text data:', error);
    } finally {
      setLoadingText(false);
    }
  };

  useEffect(() => {
    if (selectedGrade && currentSection === 'assessment') {
      fetchTextData(selectedClass);
    }
  }, [selectedGrade, currentSection, selectedClass]);

  // New function to render draft details modal
  const renderDraftDetailsModal = () => (
    <Modal
      visible={draftDetailModalVisible}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setDraftDetailModalVisible(false)}
    >
      <View style={styles.draftDetailModalOverlay}>
        <View style={styles.draftDetailModalContainer}>
          {selectedDraftForDetail && (
            <>
              <View style={styles.draftDetailHeader}>
                <View style={styles.draftDetailHeaderLeft}>
                  <MaterialIcons name="folder" size={28} color="#FF9800" />
                  <Text style={styles.draftDetailTitle}>ଡ୍ରାଫ୍ଟ ବିବରଣୀ</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setDraftDetailModalVisible(false)}
                  style={styles.draftDetailCloseButton}
                >
                  <MaterialIcons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.draftDetailContent}>
                {/* Student Info Card */}
                <View style={styles.draftDetailCard}>
                  <View style={styles.draftDetailCardHeader}>
                    <MaterialIcons name="person" size={20} color="#4a6fa5" />
                    <Text style={styles.draftDetailCardTitle}>
                      ଶିକ୍ଷାର୍ଥୀ ତଥ୍ୟ
                    </Text>
                  </View>
                  <View style={styles.draftDetailInfoGrid}>
                    <View style={styles.draftDetailInfoItem}>
                      <Text style={styles.draftDetailInfoLabel}>ନାମ:</Text>
                      <Text style={styles.draftDetailInfoValue}>
                        {selectedDraftForDetail.studentName}
                      </Text>
                    </View>
                    <View style={styles.draftDetailInfoItem}>
                      <Text style={styles.draftDetailInfoLabel}>
                        ରୋଲ୍ ନମ୍ବର:
                      </Text>
                      <Text style={styles.draftDetailInfoValue}>
                        {selectedDraftForDetail.rollNumber}
                      </Text>
                    </View>
                    <View style={styles.draftDetailInfoItem}>
                      <Text style={styles.draftDetailInfoLabel}>ଶ୍ରେଣୀ:</Text>
                      <Text style={styles.draftDetailInfoValue}>
                        Class {selectedDraftForDetail.class}
                      </Text>
                    </View>
                    <View style={styles.draftDetailInfoItem}>
                      <Text style={styles.draftDetailInfoLabel}>ସ୍କୁଲ୍:</Text>
                      <Text style={styles.draftDetailInfoValue}>
                        {selectedDraftForDetail.block}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Recording Info Card */}
                <View style={styles.draftDetailCard}>
                  <View style={styles.draftDetailCardHeader}>
                    <MaterialIcons name="mic" size={20} color="#4CAF50" />
                    <Text style={styles.draftDetailCardTitle}>
                      ରେକର୍ଡିଂ ତଥ୍ୟ
                    </Text>
                  </View>
                  <View style={styles.draftDetailInfoGrid}>
                    <View style={styles.draftDetailInfoItem}>
                      <Text style={styles.draftDetailInfoLabel}>ଅବଧି:</Text>
                      <Text style={styles.draftDetailInfoValue}>
                        {selectedDraftForDetail.duration || 0} ସେକେଣ୍ଡ
                      </Text>
                    </View>
                    <View style={styles.draftDetailInfoItem}>
                      <Text style={styles.draftDetailInfoLabel}>
                        ଫାଇଲ୍ ସାଇଜ୍:
                      </Text>
                      <Text style={styles.draftDetailInfoValue}>
                        {selectedDraftForDetail.fileSize || 'Unknown'}
                      </Text>
                    </View>
                    <View style={styles.draftDetailInfoItem}>
                      <Text style={styles.draftDetailInfoLabel}>
                        ରେକର୍ଡିଂ ତାରିଖ:
                      </Text>
                      <Text style={styles.draftDetailInfoValue}>
                        {new Date(
                          selectedDraftForDetail.recordingDate,
                        ).toLocaleDateString()}
                      </Text>
                    </View>
                    <View style={styles.draftDetailInfoItem}>
                      <Text style={styles.draftDetailInfoLabel}>ପାଠ୍ୟ ID:</Text>
                      <Text style={styles.draftDetailInfoValue}>
                        {selectedDraftForDetail.textId?.substring(0, 10)}...
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Audio Preview */}
                <View style={styles.draftDetailCard}>
                  <View style={styles.draftDetailCardHeader}>
                    <MaterialIcons
                      name="play-circle"
                      size={20}
                      color="#9C27B0"
                    />
                    <Text style={styles.draftDetailCardTitle}>
                      ଅଡିଓ ପ୍ରିଭ୍ୟୁ
                    </Text>
                  </View>
                  <View style={styles.audioPreviewContainer}>
                    <TouchableOpacity
                      style={[
                        styles.playAudioButton,
                        playingDraftId === selectedDraftForDetail.id &&
                          styles.playingAudioButton,
                      ]}
                      onPress={() => playDraftAudio(selectedDraftForDetail)}
                    >
                      <MaterialIcons
                        name={
                          playingDraftId === selectedDraftForDetail.id
                            ? 'pause'
                            : 'play-arrow'
                        }
                        size={24}
                        color="white"
                      />
                      <Text style={styles.playAudioButtonText}>
                        {playingDraftId === selectedDraftForDetail.id
                          ? 'ବିରତ'
                          : 'ଶୁଣନ୍ତୁ'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.draftDetailActions}>
                  <TouchableOpacity
                    style={[
                      styles.draftActionButton,
                      styles.uploadActionButton,
                    ]}
                    onPress={() => {
                      setDraftDetailModalVisible(false);
                      uploadDraftToServer(selectedDraftForDetail);
                    }}
                    disabled={uploadingDraftId === selectedDraftForDetail.id}
                  >
                    {uploadingDraftId === selectedDraftForDetail.id ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <>
                        <MaterialIcons
                          name="cloud-upload"
                          size={20}
                          color="white"
                        />
                        <Text style={styles.draftActionButtonText}>
                          ଅପଲୋଡ୍ କରନ୍ତୁ
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.draftActionButton,
                      styles.deleteActionButton,
                    ]}
                    onPress={() => {
                      setDraftDetailModalVisible(false);
                      deleteDraftRecording(selectedDraftForDetail.id);
                    }}
                  >
                    <MaterialIcons name="delete" size={20} color="white" />
                    <Text style={styles.draftActionButtonText}>
                      ଡିଲିଟ୍ କରନ୍ତୁ
                    </Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </>
          )}
        </View>
      </View>
    </Modal>
  );

  // New function to render drafts section in student selection
  const renderDraftsSection = () => {
    if (draftRecordings.length === 0) {
      return (
        <View style={styles.emptyDraftsContainer}>
          <View style={styles.emptyDraftsIllustration}>
            <MaterialIcons name="folder-open" size={60} color="#FFD700" />
          </View>
          <Text style={styles.emptyDraftsTitle}>କୌଣସି ଡ୍ରାଫ୍ଟ ନାହିଁ</Text>
          <Text style={styles.emptyDraftsSubtitle}>
            ଆପଣଙ୍କର କୌଣସି ସେଭ୍ ହୋଇଥିବା ରେକର୍ଡିଂ ନାହିଁ
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.draftsContainer}>
        <View style={styles.draftsHeader}>
          <View style={styles.draftsHeaderLeft}>
            <MaterialIcons name="folder-special" size={24} color="#FF9800" />
            <Text style={styles.draftsTitle}>ସେଭ୍ ହୋଇଥିବା ଡ୍ରାଫ୍ଟଗୁଡିକ</Text>
          </View>
          <Text style={styles.draftsCount}>{draftRecordings.length}</Text>
        </View>

        <FlatList
          data={draftRecordings.slice(0, 3)}
          keyExtractor={item => item.id}
          scrollEnabled={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.draftCard}
              onPress={() => showDraftDetails(item)}
              activeOpacity={0.7}
            >
              <View style={styles.draftCardHeader}>
                <View style={styles.draftCardLeft}>
                  <View style={styles.draftIconContainer}>
                    <MaterialIcons name="mic" size={18} color="#4a6fa5" />
                  </View>
                  <View>
                    <Text style={styles.draftStudentName} numberOfLines={1}>
                      {item.studentName}
                    </Text>
                    <Text style={styles.draftDetails}>
                      ରୋଲ୍: {item.rollNumber} • ଶ୍ରେଣୀ: {item.class} •{' '}
                      {item.duration || 0} ସେକେଣ୍ଡ
                    </Text>
                  </View>
                </View>
                <View style={styles.draftStatusIndicator}>
                  {uploadProgress[item.id]?.status === 'success' ? (
                    <MaterialIcons
                      name="check-circle"
                      size={16}
                      color="#4CAF50"
                    />
                  ) : uploadProgress[item.id]?.status === 'uploading' ? (
                    <ActivityIndicator size="small" color="#FF9800" />
                  ) : (
                    <MaterialIcons name="schedule" size={16} color="#FF9800" />
                  )}
                </View>
              </View>

              <View style={styles.draftCardFooter}>
                <Text style={styles.draftDate}>
                  {new Date(item.recordingDate).toLocaleDateString()}
                </Text>
                <TouchableOpacity
                  style={styles.draftQuickAction}
                  onPress={() => uploadDraftToServer(item)}
                  disabled={uploadingDraftId === item.id}
                >
                  {uploadingDraftId === item.id ? (
                    <ActivityIndicator size="small" color="#2196F3" />
                  ) : (
                    <MaterialIcons
                      name="cloud-upload"
                      size={16}
                      color="#2196F3"
                    />
                  )}
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          )}
        />

        {draftRecordings.length > 3 && (
          <TouchableOpacity
            style={styles.viewAllDraftsButton}
            onPress={() => setShowDraftsModal(true)}
          >
            <Text style={styles.viewAllDraftsText}>
              ସମସ୍ତ {draftRecordings.length} ଟି ଡ୍ରାଫ୍ଟ ଦେଖନ୍ତୁ
            </Text>
            <MaterialIcons name="chevron-right" size={20} color="#4a6fa5" />
          </TouchableOpacity>
        )}

        {/* Batch Upload Button */}
        <TouchableOpacity
          style={styles.batchUploadButtonNew}
          onPress={batchUploadDrafts}
          disabled={batchUploading}
        >
          <View style={styles.batchUploadIconContainer}>
            <MaterialIcons name="cloud-upload" size={24} color="white" />
          </View>
          <View style={styles.batchUploadTextContainer}>
            <Text style={styles.batchUploadTitle}>
              ସମସ୍ତ ଡ୍ରାଫ୍ଟ ଅପଲୋଡ୍ କରନ୍ତୁ
            </Text>
            <Text style={styles.batchUploadSubtitle}>
              {draftRecordings.length} ଟି ରେକର୍ଡିଂ ସର୍ଭରକୁ ପଠାନ୍ତୁ
            </Text>
          </View>
          {batchUploading ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <MaterialIcons name="arrow-forward" size={20} color="white" />
          )}
        </TouchableOpacity>
      </View>
    );
  };

  const renderSchoolInfoSelection = () => (
    <View style={styles.fullContainer}>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              navigation.navigate('Welcome');
            }}
          >
            <MaterialIcons name="arrow-back" size={25} color="#050505ff" />
          </TouchableOpacity>
          <Text style={styles.title}>
            {user?.userType === 'observer' ? 'ORF ମୂଲ୍ୟାୟନ ' : 'ORF ମୂଲ୍ୟାୟନ '}
          </Text>
        </View>
      </View>

      <View style={styles.contentContainer}>
        <ScrollView contentContainerStyle={styles.formContainer}>
          <View style={styles.formGroup}>
            <Text style={styles.label}>ଜିଲ୍ଲା </Text>
            <View style={styles.pickerContainer}>
              {isLoadingData && !selectedDistrict ? (
                <ActivityIndicator size="small" color="#4a6fa5" />
              ) : (
                <Picker
                  selectedValue={selectedDistrict}
                  style={styles.picker}
                  onValueChange={itemValue => {
                    if (itemValue === '') {
                      setSelectedDistrict('');
                      setSelectedDistrictCode('');
                    } else {
                      const selectedDistrictObj = districts.find(
                        district => district.name === itemValue,
                      );
                      setSelectedDistrict(itemValue);
                      setSelectedDistrictCode(selectedDistrictObj?.code || '');
                    }
                  }}
                >
                  <Picker.Item
                    label="ଜିଲ୍ଲା"
                    value=""
                    style={{
                      fontSize: isTablet ? 20 : 14,
                      lineHeight: 30,
                    }}
                  />
                  {districts.map(district => (
                    <Picker.Item
                      key={district.code}
                      label={district.name}
                      value={district.name}
                      style={{ fontSize: isTablet ? 20 : 12 }}
                    />
                  ))}
                </Picker>
              )}
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>ବ୍ଲକ </Text>
            <View style={styles.pickerContainer}>
              {isLoadingData && selectedDistrict && !selectedBlock ? (
                <ActivityIndicator size="small" color="#4a6fa5" />
              ) : (
                <Picker
                  selectedValue={selectedBlock}
                  style={styles.picker}
                  onValueChange={itemValue => {
                    if (itemValue === '') {
                      setSelectedBlock('');
                      setSelectedBlockCode('');
                    } else {
                      const selectedBlockObj = blocks.find(
                        block => block.name === itemValue,
                      );
                      setSelectedBlock(itemValue);
                      setSelectedBlockCode(selectedBlockObj?.code || '');
                    }
                  }}
                  enabled={!!selectedDistrict && blocks.length > 0}
                >
                  <Picker.Item
                    label="ବ୍ଲକ"
                    value=""
                    style={{ fontSize: isTablet ? 20 : 14, lineHeight: 30 }}
                  />
                  {blocks.map(block => (
                    <Picker.Item
                      key={block.code}
                      label={block.name}
                      value={block.name}
                      style={{ fontSize: isTablet ? 20 : 12 }}
                    />
                  ))}
                </Picker>
              )}
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>ଶ୍ରେଣୀ </Text>
            <View style={styles.pickerContainer}>
              {isLoadingData && !selectedClass ? (
                <ActivityIndicator size="small" color="#4a6fa5" />
              ) : (
                <Picker
                  selectedValue={selectedClass}
                  style={styles.picker}
                  onValueChange={async itemValue => {
                    setSelectedClass(itemValue);
                    if (itemValue === '1') {
                      setSelectedGrade('grade1');
                    } else if (itemValue === '2') {
                      setSelectedGrade('grade2');
                    } else if (itemValue === '3') {
                      setSelectedGrade('grade3');
                    } else if (itemValue === '4') {
                      setSelectedGrade('grade4');
                    } else if (itemValue === '5') {
                      setSelectedGrade('grade5');
                    }
                    if (itemValue && selectedBlockCode) {
                      await fetchStudents(itemValue, selectedSchool);
                    }
                  }}
                  enabled={!!selectedBlock && classes.length > 0}
                >
                  <Picker.Item
                    label="ଶ୍ରେଣୀ"
                    value=""
                    style={{ fontSize: isTablet ? 20 : 14, lineHeight: 30 }}
                  />
                  {classes.map(cls => (
                    <Picker.Item
                      key={cls.classId}
                      label={`Class ${cls.className}`}
                      value={cls.className}
                      style={{ fontSize: isTablet ? 20 : 12 }}
                    />
                  ))}
                </Picker>
              )}
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.assessmentButton,
              !selectedClass && styles.disabledButton,
            ]}
            onPress={() => {
              setCurrentSection('studentSelection');
            }}
            disabled={!selectedClass}
          >
            <Text style={[styles.assessmentButtonText, { lineHeight: 30 }]}>
              {selectedClass
                ? `ଶିକ୍ଷାର୍ଥୀ ଚୟନ କରନ୍ତୁ - Class ${selectedClass}`
                : 'ଶିକ୍ଷାର୍ଥୀ ଚୟନ କରନ୍ତୁ'}
            </Text>
            <MaterialIcons
              name="arrow-forward"
              size={20}
              color="white"
              style={styles.buttonIcon}
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderStudentSelection = () => {
    const isSelectedStudentCompleted = () => {
      if (!selectedStudentRoll) return false;

      if (completedStudents.includes(selectedStudentRoll.toString())) {
        return true;
      }

      const selectedStudentObj = students.find(
        student =>
          student.rollNumber?.toString() === selectedStudentRoll?.toString(),
      );

      if (selectedStudentObj) {
        return selectedStudentObj.hasORF === true;
      }

      return false;
    };

    const selectedStudentIsCompleted = isSelectedStudentCompleted();

    return (
      <View style={styles.fullContainer}>
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setCurrentSection('schoolInfo')}
            >
              <MaterialIcons name="arrow-back" size={25} color="#050505ff" />
            </TouchableOpacity>
            <Text style={[styles.title, { lineHeight: 40 }]}>
              ଶିକ୍ଷାର୍ଥୀ ଚୟନ କରନ୍ତୁ
            </Text>
          </View>

          {/* Drafts Button in Header */}
          {draftRecordings.length > 0 && (
            <TouchableOpacity
              style={styles.draftsHeaderButton}
              onPress={() => setShowDraftsModal(true)}
            >
              <MaterialIcons name="folder" size={20} color="white" />
              <View style={styles.draftsBadge}>
                <Text style={styles.draftsBadgeText}>
                  {draftRecordings.length}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        </View>

        {/* Stats Card */}
        <View style={styles.statsCard}>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <MaterialIcons name="class" size={24} color="#fe9c3b" />
            <View style={styles.statTextContainer}>
              <Text style={styles.statLabel}>ଶ୍ରେଣୀ</Text>
              <Text style={styles.statValue}>Class {selectedClass}</Text>
            </View>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <MaterialIcons name="check-circle" size={24} color="#4CAF50" />
            <View style={styles.statTextContainer}>
              <Text style={styles.statLabel}>Completed</Text>
              <Text style={styles.statValue}>{completedStudents.length}</Text>
            </View>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <MaterialIcons name="pending" size={24} color="#FF9800" />
            <View style={styles.statTextContainer}>
              <Text style={styles.statLabel}>Pending</Text>
              <Text style={styles.statValue}>{pendingStudents.length}</Text>
            </View>
          </View>
        </View>

        <ScrollView
          style={styles.contentContainer}
          contentContainerStyle={styles.studentSelectionContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Add Student Button */}
          <TouchableOpacity
            onPress={() => setIsAddModalVisible(true)}
            style={styles.addStudentButtonNew}
          >
            <View style={styles.addButtonIcon}>
              <MaterialIcons name="person-add" size={22} color="white" />
            </View>
            <View style={styles.addButtonTextContainer}>
              <Text style={styles.addButtonTitle}>
                ନୂତନ ଶିକ୍ଷାର୍ଥୀ ଯୋଡ଼ନ୍ତୁ
              </Text>
              <Text style={styles.addButtonSubtitle}>
                ରୋଲ୍ ନମ୍ବର ପ୍ରବେଶ କରନ୍ତୁ
              </Text>
            </View>
            <MaterialIcons
              name="chevron-right"
              size={24}
              color="#4a6fa5"
              style={styles.addButtonArrow}
            />
          </TouchableOpacity>

          {/* Modal for adding new student */}
          <Modal
            visible={isAddModalVisible}
            transparent={true}
            animationType="fade"
            onRequestClose={() =>
              !isSavingStudent && setIsAddModalVisible(false)
            }
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContainer}>
                <View style={styles.modalContent}>
                  <View style={styles.modalHeader}>
                    <MaterialIcons
                      name="person-add"
                      size={28}
                      color="#fe9c3b"
                    />
                    <Text style={styles.modalTitle}>
                      ନୂତନ ଶିକ୍ଷାର୍ଥୀ ଯୋଡ଼ନ୍ତୁ
                    </Text>
                  </View>

                  <Text style={styles.modalSubtitle}>
                    ଶ୍ରେଣୀ {selectedClass} ପାଇଁ ରୋଲ୍ ନମ୍ବର ଦିଅନ୍ତୁ
                  </Text>

                  <View style={styles.inputContainer}>
                    <MaterialIcons name="badge" size={20} color="#666" />
                    <TextInput
                      value={studentNumber}
                      onChangeText={setStudentNumber}
                      keyboardType="numeric"
                      placeholder="ଉଦାହରଣ: 25"
                      style={styles.modalInput}
                      editable={!isSavingStudent}
                      placeholderTextColor="#999"
                    />
                  </View>

                  {/* Gender Selection */}
                  <View style={styles.genderContainer}>
                    <Text style={styles.genderLabel}>ଲିଙ୍ଗ ଚୟନ କରନ୍ତୁ</Text>
                    <View style={styles.genderOptionsContainer}>
                      <TouchableOpacity
                        style={[
                          styles.genderOption,
                          gender === 'male' && styles.genderOptionSelected,
                        ]}
                        onPress={() => setGender('male')}
                        disabled={isSavingStudent}
                      >
                        <View
                          style={[
                            styles.genderRadio,
                            gender === 'male' && styles.genderRadioSelected,
                          ]}
                        >
                          {gender === 'male' && (
                            <View style={styles.genderRadioInner} />
                          )}
                        </View>
                        <MaterialIcons
                          name="male"
                          size={20}
                          color={gender === 'male' ? '#4a6fa5' : '#666'}
                        />
                        <Text
                          style={[
                            styles.genderOptionText,
                            gender === 'male' &&
                              styles.genderOptionTextSelected,
                          ]}
                        >
                          ଛାତ୍ର
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.genderOption,
                          gender === 'female' && styles.genderOptionSelected,
                        ]}
                        onPress={() => setGender('female')}
                        disabled={isSavingStudent}
                      >
                        <View
                          style={[
                            styles.genderRadio,
                            gender === 'female' && styles.genderRadioSelected,
                          ]}
                        >
                          {gender === 'female' && (
                            <View style={styles.genderRadioInner} />
                          )}
                        </View>
                        <MaterialIcons
                          name="female"
                          size={20}
                          color={gender === 'female' ? '#e91e63' : '#666'}
                        />
                        <Text
                          style={[
                            styles.genderOptionText,
                            gender === 'female' &&
                              styles.genderOptionTextSelected,
                          ]}
                        >
                          ଛାତ୍ରୀ
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {isSavingStudent ? (
                    <View style={styles.savingContainer}>
                      <ActivityIndicator size="small" color="#fe9c3b" />
                      <Text style={styles.savingText}>ସେଭ୍ ହେଉଛି...</Text>
                    </View>
                  ) : (
                    <View style={styles.modalButtons}>
                      <TouchableOpacity
                        onPress={() => {
                          setIsAddModalVisible(false);
                          setStudentNumber('');
                          setGender('male');
                        }}
                        style={styles.modalCancelButton}
                      >
                        <Text style={styles.modalCancelButtonText}>ବାତିଲ୍</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={handleAddStudent}
                        disabled={!studentNumber.trim()}
                        style={[
                          styles.modalOkButton,
                          !studentNumber.trim() && styles.disabledButton,
                        ]}
                      >
                        <Text style={styles.modalOkButtonText}>
                          ସେଭ୍ କରନ୍ତୁ
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
            </View>
          </Modal>

          {/* Students List */}
          {isLoadingData || isSavingStudent ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#4a6fa5" />
              <Text style={styles.loadingText}>
                {isSavingStudent
                  ? 'ଶିକ୍ଷାର୍ଥୀ ସେଭ୍ ହେଉଛି...'
                  : 'ଶିକ୍ଷାର୍ଥୀ ଲୋଡ୍ ହେଉଛି...'}
              </Text>
            </View>
          ) : students.length > 0 ? (
            <View style={styles.studentListContainer}>
              <View style={styles.listHeader}>
                <Text style={styles.listTitle}>
                  ଶିକ୍ଷାର୍ଥୀ ତାଲିକା ({students.length})
                </Text>
              </View>

              <FlatList
                data={students}
                keyExtractor={item => item.id}
                scrollEnabled={false}
                contentContainerStyle={styles.listContent}
                renderItem={({ item, index }) => {
                  const isCompleted = item.hasORF === true;
                  const isSelected =
                    selectedStudentRoll?.toString() ===
                    item.rollNumber?.toString();

                  return (
                    <TouchableOpacity
                      style={[
                        styles.studentCard,
                        isSelected && styles.selectedStudentCard,
                        isCompleted && styles.completedStudentCard,
                        !isCompleted && styles.pendingStudentCard,
                      ]}
                      onPress={() => {
                        if (!isCompleted) {
                          setSelectedStudentRoll(item.rollNumber);
                          setSelectedStudentId(item.studentId);
                          setSelectedStudent(
                            item.studentName || `Student ${item.rollNumber}`,
                          );
                        }
                      }}
                      disabled={isCompleted}
                      activeOpacity={isCompleted ? 1 : 0.7}
                    >
                      <View style={styles.studentCardLeft}>
                        <View
                          style={[
                            styles.rollNumberBadge,
                            isSelected && styles.selectedRollBadge,
                            isCompleted && styles.completedRollBadge,
                            !isCompleted && styles.pendingRollBadge,
                          ]}
                        >
                          <Text
                            style={[
                              styles.rollNumberText,
                              (isSelected || isCompleted) &&
                                styles.rollNumberTextSelected,
                            ]}
                          >
                            {item.rollNumber}
                          </Text>
                        </View>
                        <View style={styles.studentInfo}>
                          <Text style={styles.studentName}>
                            {item.studentName || `Student ${item.rollNumber}`}
                            {item.gender && (
                              <MaterialIcons
                                name={item.gender}
                                size={14}
                                color="#666"
                                style={{ marginLeft: 6 }}
                              />
                            )}
                          </Text>
                          <View style={styles.studentMeta}>
                            <Text style={styles.studentId}>
                              ID: {item.studentId || 'N/A'}
                            </Text>
                          </View>
                        </View>
                      </View>

                      <View style={styles.studentCardRight}>
                        {isCompleted ? (
                          <View style={styles.completedStatus}>
                            <MaterialIcons
                              name="check-circle"
                              size={20}
                              color="#4CAF50"
                            />
                            <Text style={styles.completedText}>
                              ମୂଲ୍ୟାୟନ ସମ୍ପୂର୍ଣ୍ଣ
                            </Text>
                          </View>
                        ) : (
                          <View style={styles.pendingStatus}>
                            <MaterialIcons
                              name="pending"
                              size={20}
                              color="#FF9800"
                            />
                            <Text style={styles.pendingText}>ବାକି ଅଛି</Text>
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                }}
              />
            </View>
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconCircle}>
                <MaterialIcons name="person-off" size={60} color="#ccc" />
              </View>
              <Text style={styles.emptyStateTitle}>
                କୌଣସି ଶିକ୍ଷାର୍ଥୀ ନାହାନ୍ତି
              </Text>
              <Text style={styles.emptyStateSubtitle}>
                ଏହି ଶ୍ରେଣୀରେ କୌଣସି ଶିକ୍ଷାର୍ଥୀ ଉପଲବ୍ଧ ନାହାନ୍ତି।
              </Text>
              <TouchableOpacity
                onPress={() => setIsAddModalVisible(true)}
                style={styles.emptyStateButton}
              >
                <MaterialIcons name="add" size={20} color="white" />
                <Text style={styles.emptyStateButtonText}>
                  ପ୍ରଥମ ଶିକ୍ଷାର୍ଥୀ ଯୋଡ଼ନ୍ତୁ
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Drafts Section */}
          {renderDraftsSection()}

          {/* Assessment Button */}
          <View style={styles.assessmentButtonContainer}>
            <TouchableOpacity
              style={[
                styles.assessmentButtonNew,
                (!selectedStudentRoll ||
                  isLoadingData ||
                  selectedStudentIsCompleted) &&
                  styles.disabledButton,
              ]}
              onPress={() => {
                if (
                  selectedStudentRoll &&
                  !selectedStudentIsCompleted &&
                  !isLoadingData
                ) {
                  handleStartAssessment();
                  setCurrentSection('assessment');
                }
              }}
              disabled={
                !selectedStudentRoll ||
                isLoadingData ||
                selectedStudentIsCompleted
              }
            >
              <View style={styles.assessmentButtonContent}>
                <MaterialIcons
                  name={selectedStudentIsCompleted ? 'check-circle' : 'mic'}
                  size={24}
                  color="white"
                  style={styles.assessmentButtonIcon}
                />
                <View style={styles.assessmentButtonTextContainer}>
                  <Text style={styles.assessmentButtonMainText}>
                    {selectedStudentIsCompleted
                      ? 'ମୂଲ୍ୟାୟନ ସମ୍ପୂର୍ଣ୍ଣ'
                      : 'ମୂଲ୍ୟାୟନ ଆରମ୍ଭ କରନ୍ତୁ'}
                  </Text>
                  <Text style={styles.assessmentButtonSubText}>
                    {selectedStudentRoll
                      ? `${selectedStudent} (${
                          selectedStudentIsCompleted
                            ? 'ପୂର୍ବରୁ ମୂଲ୍ୟାୟନ ହୋଇଛି'
                            : 'ନୂଆ ମୂଲ୍ୟାୟନ'
                        })`
                      : 'ଏକ ଶିକ୍ଷାର୍ଥୀ ଚୟନ କରନ୍ତୁ'}
                  </Text>
                </View>
              </View>
              <MaterialIcons
                name={selectedStudentIsCompleted ? 'check' : 'arrow-forward'}
                size={20}
                color="white"
                style={styles.buttonIcon}
              />
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Drafts Modal */}
        <Modal
          visible={showDraftsModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowDraftsModal(false)}
        >
          <View style={styles.draftsModalOverlay}>
            <View style={styles.draftsModalContainer}>
              <View style={styles.draftsModalHeader}>
                <View style={styles.draftsModalHeaderLeft}>
                  <MaterialIcons
                    name="folder-special"
                    size={28}
                    color="#FF9800"
                  />
                  <Text style={styles.draftsModalTitle}>
                    ସମସ୍ତ ଡ୍ରାଫ୍ଟଗୁଡ଼ିକ
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setShowDraftsModal(false)}
                  style={styles.draftsModalCloseButton}
                >
                  <MaterialIcons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.draftsModalContent}>
                {draftRecordings.length === 0 ? (
                  <View style={styles.draftsModalEmptyState}>
                    <MaterialIcons
                      name="folder-open"
                      size={80}
                      color="#FFD700"
                    />
                    <Text style={styles.draftsModalEmptyTitle}>
                      କୌଣସି ଡ୍ରାଫ୍ଟ ନାହିଁ
                    </Text>
                    <Text style={styles.draftsModalEmptySubtitle}>
                      ଆପଣଙ୍କର କୌଣସି ସେଭ୍ ହୋଇଥିବା ରେକର୍ଡିଂ ନାହିଁ
                    </Text>
                  </View>
                ) : (
                  <View style={styles.draftsModalList}>
                    {draftRecordings.map((draft, index) => (
                      <TouchableOpacity
                        key={draft.id}
                        style={styles.draftModalCard}
                        onPress={() => {
                          setShowDraftsModal(false);
                          setTimeout(() => showDraftDetails(draft), 300);
                        }}
                        activeOpacity={0.7}
                      >
                        <View style={styles.draftModalCardHeader}>
                          <View style={styles.draftModalCardLeft}>
                            <View
                              style={[
                                styles.draftModalIconContainer,
                                {
                                  backgroundColor: [
                                    '#FFD700',
                                    '#4CAF50',
                                    '#2196F3',
                                    '#9C27B0',
                                  ][index % 4],
                                },
                              ]}
                            >
                              <MaterialIcons
                                name="mic"
                                size={20}
                                color="white"
                              />
                            </View>
                            <View>
                              <Text style={styles.draftModalStudentName}>
                                {draft.studentName}
                              </Text>
                              <Text style={styles.draftModalDetails}>
                                ରୋଲ୍: {draft.rollNumber} • ଶ୍ରେଣୀ: {draft.class}
                              </Text>
                            </View>
                          </View>
                          <View style={styles.draftModalStatus}>
                            {uploadProgress[draft.id]?.status === 'success' ? (
                              <MaterialIcons
                                name="check-circle"
                                size={20}
                                color="#4CAF50"
                              />
                            ) : uploadProgress[draft.id]?.status ===
                              'uploading' ? (
                              <ActivityIndicator size="small" color="#FF9800" />
                            ) : (
                              <MaterialIcons
                                name="schedule"
                                size={20}
                                color="#FF9800"
                              />
                            )}
                          </View>
                        </View>

                        <View style={styles.draftModalCardBody}>
                          <View style={styles.draftModalInfoRow}>
                            <MaterialIcons
                              name="access-time"
                              size={16}
                              color="#666"
                            />
                            <Text style={styles.draftModalInfoText}>
                              {draft.duration || 0} ସେକେଣ୍ଡ
                            </Text>
                          </View>
                          <View style={styles.draftModalInfoRow}>
                            <MaterialIcons
                              name="calendar-today"
                              size={16}
                              color="#666"
                            />
                            <Text style={styles.draftModalInfoText}>
                              {new Date(
                                draft.recordingDate,
                              ).toLocaleDateString()}
                            </Text>
                          </View>
                          <View style={styles.draftModalInfoRow}>
                            <MaterialIcons
                              name="school"
                              size={16}
                              color="#666"
                            />
                            <Text style={styles.draftModalInfoText}>
                              {draft.block}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.draftModalCardFooter}>
                          <TouchableOpacity
                            style={[
                              styles.draftModalActionButton,
                              styles.playActionButton,
                            ]}
                            onPress={() => playDraftAudio(draft)}
                          >
                            <MaterialIcons
                              name={
                                playingDraftId === draft.id
                                  ? 'pause'
                                  : 'play-arrow'
                              }
                              size={16}
                              color="#2196F3"
                            />
                            <Text style={styles.draftModalActionButtonText}>
                              {playingDraftId === draft.id ? 'ବିରତ' : 'ଶୁଣନ୍ତୁ'}
                            </Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[
                              styles.draftModalActionButton,
                              styles.uploadActionButton,
                            ]}
                            onPress={() => uploadDraftToServer(draft)}
                            disabled={uploadingDraftId === draft.id}
                          >
                            {uploadingDraftId === draft.id ? (
                              <ActivityIndicator size="small" color="#4CAF50" />
                            ) : (
                              <>
                                <MaterialIcons
                                  name="cloud-upload"
                                  size={16}
                                  color="#4CAF50"
                                />
                                <Text style={styles.draftModalActionButtonText}>
                                  ଅପଲୋଡ୍
                                </Text>
                              </>
                            )}
                          </TouchableOpacity>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* Batch Upload in Modal */}
                {draftRecordings.length > 0 && (
                  <View style={styles.draftsModalBatchUpload}>
                    <TouchableOpacity
                      style={styles.draftsModalBatchButton}
                      onPress={batchUploadDrafts}
                      disabled={batchUploading}
                    >
                      <View style={styles.batchUploadIcon}>
                        <MaterialIcons
                          name="cloud-upload"
                          size={24}
                          color="white"
                        />
                      </View>
                      <View style={styles.batchUploadText}>
                        <Text style={styles.batchUploadMainText}>
                          {batchUploading
                            ? 'ଅପଲୋଡ୍ ହେଉଛି...'
                            : 'ସମସ୍ତ ଡ୍ରାଫ୍ଟ ଅପଲୋଡ୍ କରନ୍ତୁ'}
                        </Text>
                        <Text style={styles.batchUploadSubText}>
                          {draftRecordings.length} ଟି ରେକର୍ଡିଂ
                        </Text>
                      </View>
                      {batchUploading ? (
                        <ActivityIndicator size="small" color="white" />
                      ) : (
                        <MaterialIcons
                          name="arrow-forward"
                          size={20}
                          color="white"
                        />
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.clearAllDraftsButton}
                      onPress={clearAllDrafts}
                    >
                      <MaterialIcons
                        name="delete-sweep"
                        size={20}
                        color="#f44336"
                      />
                      <Text style={styles.clearAllDraftsText}>
                        ସମସ୍ତ ଡିଲିଟ୍ କରନ୍ତୁ
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Draft Details Modal */}
        {renderDraftDetailsModal()}
      </View>
    );
  };

  const renderVoiceAssessment = () => {
    const displayTextData = textData;
    const textBody = displayTextData?.textBody || '';
    const title = displayTextData?.textHeading || '';
    const textId = displayTextData?.textId || '';

    return (
      <View style={styles.fullContainer}>
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => {
                Alert.alert(
                  'ପଛକୁ ଯାଆନ୍ତୁ',
                  'ଆପଣ ନିଶ୍ଚିତ କି ପଛକୁ ଯିବେ? ସେଭ୍ ହୋଇନଥିବା ରେକର୍ଡିଂ ନଷ୍ଟ ହେବ।',
                  [
                    {
                      text: 'ବାତିଲ୍',
                      onPress: () => null,
                      style: 'cancel',
                    },
                    {
                      text: 'ହଁ',
                      onPress: () => setCurrentSection('studentSelection'),
                    },
                  ],
                );
              }}
            >
              <MaterialIcons name="arrow-back" size={25} color="#050505ff" />
            </TouchableOpacity>
            <View style={styles.headerContent}>
              <Text style={styles.title}>ଓଡ଼ିଆ ପଢିବା ମୂଲ୍ୟାୟନ</Text>
              <Text style={styles.subtitle}>
                ଶ୍ରେଣୀ {selectedClass} • {selectedStudent} (ରୋଲ୍:{' '}
                {selectedStudentRoll})
              </Text>
            </View>
          </View>
        </View>

        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {loadingText ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#4a6fa5" />
              <Text style={styles.loadingText}>ପାଠ୍ୟ ଲୋଡ୍ ହେଉଛି...</Text>
            </View>
          ) : (
            <View style={styles.assessmentContent}>
              {/* Instructions Card */}
              <View style={styles.instructionCard}>
                <View style={styles.instructionHeader}>
                  <MaterialIcons name="info" size={20} color="#0984e3" />
                  <Text style={styles.instructionTitle}>ନିର୍ଦ୍ଦେଶାବଳୀ</Text>
                </View>
                <Text style={styles.instructionText}>
                  1. "ରେକର୍ଡିଂ ଆରମ୍ଭ କରନ୍ତୁ" ବଟନ୍ ଦବାନ୍ତୁ{'\n'}
                  2. ନିମ୍ନଲିଖିତ ପାଠ୍ୟଟିକୁ ସ୍ପଷ୍ଟ ଭାବରେ ପଢନ୍ତୁ{'\n'}
                  3. ସର୍ଭରକୁ ସେଭ୍ କରିବା ପାଇଁ "ସେଭ୍ କରନ୍ତୁ" ବଟନ୍ ଦବାନ୍ତୁ{'\n'}
                  4. ଅସ୍ଥାୟୀ ଭାବରେ ସେଭ୍ କରିବା ପାଇଁ "ଡ୍ରାଫ୍ଟ ଭାବରେ ସେଭ୍ କରନ୍ତୁ"
                  ବଟନ୍ ଦବାନ୍ତୁ
                </Text>
              </View>

              {/* Student Info Card */}
              <View style={styles.studentInfoCard}>
                <View style={styles.studentInfoRow}>
                  <MaterialIcons name="person" size={20} color="#4a6fa5" />
                  <Text style={styles.studentInfoText}>
                    <Text style={styles.studentInfoLabel}>ଶିକ୍ଷାର୍ଥୀ: </Text>
                    {selectedStudent}
                  </Text>
                </View>
                <View style={styles.studentInfoRow}>
                  <MaterialIcons name="school" size={20} color="#fe9c3b" />
                  <Text style={styles.studentInfoText}>
                    <Text style={styles.studentInfoLabel}>ରୋଲ୍: </Text>
                    {selectedStudentRoll}
                  </Text>
                </View>
                <View style={styles.studentInfoRow}>
                  <MaterialIcons name="class" size={20} color="#4CAF50" />
                  <Text style={styles.studentInfoText}>
                    <Text style={styles.studentInfoLabel}>ଶ୍ରେଣୀ: </Text>
                    {selectedClass}
                  </Text>
                </View>
                {textId && (
                  <View style={styles.studentInfoRow}>
                    <MaterialIcons name="book" size={20} color="#9C27B0" />
                    <Text style={styles.studentInfoText}>
                      <Text style={styles.studentInfoLabel}>ପାଠ୍ୟ ID: </Text>
                      {textId.substring(0, 10)}...
                    </Text>
                  </View>
                )}
              </View>

              {/* Reading Passage Card */}
              <View style={styles.passageCard}>
                <View style={styles.passageHeader}>
                  <MaterialIcons name="menu-book" size={24} color="#4a6fa5" />
                  <Text style={styles.passageTitle}>{title}</Text>
                  <TouchableOpacity style={styles.speechButton}>
                    <MaterialIcons name="volume-up" size={20} color="#4a6fa5" />
                  </TouchableOpacity>
                </View>

                <View style={styles.passageContent}>
                  <Text style={styles.passageSubtitle}>
                    ନିମ୍ନଲିଖିତ ପାଠ୍ୟଟିକୁ ଉଚ୍ଚ ସ୍ୱରରେ ପଢନ୍ତୁ:
                  </Text>

                  <View style={styles.paragraphContainer}>
                    <View style={styles.paragraphCard}>
                      <View style={styles.paragraphIcon}>
                        <MaterialIcons
                          name="format-quote"
                          size={28}
                          color="#fe9c3b"
                        />
                      </View>

                      <View style={styles.paragraphContent}>
                        <Text style={styles.paragraphBody}>{textBody}</Text>

                        <View style={styles.wordCountBadge}>
                          <MaterialIcons
                            name="text-fields"
                            size={14}
                            color="#fff"
                          />
                          <Text style={styles.wordCountText}>
                            {textBody.split(' ').length} ଶବ୍ଦ
                          </Text>
                        </View>
                      </View>

                      <View style={styles.paragraphFooter}>
                        <MaterialIcons
                          name="translate"
                          size={16}
                          color="#666"
                        />
                        <Text style={styles.paragraphFooterText}>
                          ଓଡ଼ିଆ ପାଠ୍ୟ • ଶ୍ରେଣୀ {selectedClass}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              </View>

              {/* Recording Controls */}
              <View style={styles.controlsSection}>
                <TouchableOpacity
                  onPress={recording ? stopRecording : startRecording}
                  style={[
                    styles.primaryButton,
                    recording ? styles.recordingButton : styles.recordButton,
                    (isLoading || loadingText || isSavingDraft) &&
                      styles.disabledButton,
                  ]}
                  disabled={isLoading || loadingText || isSavingDraft}
                >
                  <View style={styles.buttonContent}>
                    <MaterialIcons
                      name={recording ? 'stop-circle' : 'mic'}
                      size={28}
                      color="white"
                    />
                    <View style={styles.buttonTextContainer}>
                      <Text style={styles.buttonMainText}>
                        {recording
                          ? `ରେକର୍ଡିଂ (${formatTime(timeLeft)})`
                          : 'ରେକର୍ଡିଂ ଆରମ୍ଭ କରନ୍ତୁ'}
                      </Text>
                      <Text style={styles.buttonSubText}>
                        {recording
                          ? 'ରେକର୍ଡିଂ ବନ୍ଦ କରନ୍ତୁ'
                          : 'ରେକର୍ଡିଂ ଆରମ୍ଭ କରନ୍ତୁ'}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>

                {recording && (
                  <View style={styles.recordingStatusContainer}>
                    <View style={styles.recordingPulse} />
                    <Text style={styles.recordingStatusText}>
                      ରେକର୍ଡିଂ ଚାଲୁଛି... {timeLeft} ସେକେଣ୍ଡ
                    </Text>
                  </View>
                )}

                {filePath && !recording && (
                  <View style={styles.playbackSection}>
                    <Text style={styles.playbackTitle}>
                      ରେକର୍ଡିଂ ପରୀକ୍ଷା କରନ୍ତୁ:
                    </Text>
                    <View style={styles.playbackControls}>
                      <TouchableOpacity
                        onPress={playAudio}
                        style={[styles.secondaryButton, styles.playButton]}
                        disabled={
                          playing || isLoading || loadingText || isSavingDraft
                        }
                      >
                        <MaterialIcons
                          name={playing ? 'pause' : 'play-arrow'}
                          size={20}
                          color="white"
                        />
                        <Text style={styles.secondaryButtonText}>
                          {playing ? 'ବିରତ କରନ୍ତୁ' : 'ଶୁଣନ୍ତୁ'}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={stopAudio}
                        style={[styles.secondaryButton, styles.stopButton]}
                        disabled={isLoading || loadingText || isSavingDraft}
                      >
                        <MaterialIcons name="stop" size={20} color="white" />
                        <Text style={styles.secondaryButtonText}>
                          ବନ୍ଦ କରନ୍ତୁ
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                <TouchableOpacity
                  onPress={handleSaveDraft}
                  style={[
                    styles.primaryButton,
                    styles.saveDraftButton,
                    (!audioSavedLocally ||
                      recording ||
                      playing ||
                      isLoading ||
                      loadingText ||
                      !textId ||
                      isSavingDraft) &&
                      styles.disabledButton,
                  ]}
                  disabled={
                    !audioSavedLocally ||
                    recording ||
                    playing ||
                    isLoading ||
                    loadingText ||
                    !textId ||
                    isSavingDraft
                  }
                >
                  <View style={styles.buttonContent}>
                    <MaterialIcons
                      name={isSavingDraft ? 'hourglass-empty' : 'save'}
                      size={24}
                      color="white"
                    />
                    <View style={styles.buttonTextContainer}>
                      <Text style={styles.buttonMainText}>
                        {isSavingDraft
                          ? 'ଡ୍ରାଫ୍ଟ ସେଭ୍ ହେଉଛି...'
                          : 'ଡ୍ରାଫ୍ଟ ଭାବରେ ସେଭ୍ କରନ୍ତୁ'}
                      </Text>
                      <Text style={styles.buttonSubText}>
                        ପରେ ସର୍ଭରକୁ ଅପଲୋଡ୍ କରିପାରିବେ
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleManualSave}
                  style={[
                    styles.primaryButton,
                    styles.saveButton,
                    (!audioSavedLocally ||
                      recording ||
                      playing ||
                      isLoading ||
                      loadingText ||
                      !textId ||
                      isSavingDraft) &&
                      styles.disabledButton,
                  ]}
                  disabled={
                    !audioSavedLocally ||
                    recording ||
                    playing ||
                    isLoading ||
                    loadingText ||
                    !textId ||
                    isSavingDraft
                  }
                >
                  <View style={styles.buttonContent}>
                    <MaterialIcons
                      name="cloud-upload"
                      size={24}
                      color="white"
                    />
                    <View style={styles.buttonTextContainer}>
                      <Text style={styles.buttonMainText}>
                        {isLoading ? 'ସେଭ୍ ହେଉଛି...' : 'ସର୍ଭରକୁ ଅପଲୋଡ୍ କରନ୍ତୁ'}
                      </Text>
                      <Text style={styles.buttonSubText}>
                        {audioSavedLocally
                          ? 'ସର୍ଭରକୁ ଅପଲୋଡ୍ କରନ୍ତୁ'
                          : 'ପ୍ରଥମେ ରେକର୍ଡିଂ ସେଭ୍ କରନ୍ତୁ'}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>

                {isLoading && (
                  <View style={styles.uploadStatus}>
                    <ActivityIndicator size="small" color="#4ECDC4" />
                    <Text style={styles.uploadStatusText}>
                      {uploadStatus === 'uploading'
                        ? 'ଅପଲୋଡ୍ ହେଉଛି...'
                        : 'ପ୍ରକ୍ରିୟା କରୁଛି...'}
                    </Text>
                  </View>
                )}

                {uploadStatus === 'success' && audioUrl && (
                  <View style={styles.successMessage}>
                    <MaterialIcons
                      name="check-circle"
                      size={20}
                      color="#00b894"
                    />
                    <Text style={styles.successText}>
                      ସଫଳତାର ସହ ରେକର୍ଡିଂ ସେଭ୍ ହୋଇଛି!
                    </Text>
                  </View>
                )}

                {/* Quick Drafts Access */}
                {draftRecordings.length > 0 && (
                  <TouchableOpacity
                    style={styles.quickDraftsAccess}
                    onPress={() => {
                      setCurrentSection('studentSelection');
                      setTimeout(() => setShowDraftsModal(true), 300);
                    }}
                  >
                    <View style={styles.quickDraftsIcon}>
                      <MaterialIcons name="folder" size={20} color="#FF9800" />
                      <View style={styles.quickDraftsBadge}>
                        <Text style={styles.quickDraftsBadgeText}>
                          {draftRecordings.length}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.quickDraftsText}>
                      ଆପଣଙ୍କର {draftRecordings.length} ଟି ଡ୍ରାଫ୍ଟ ଅଛି
                    </Text>
                    <MaterialIcons
                      name="chevron-right"
                      size={20}
                      color="#666"
                    />
                  </TouchableOpacity>
                )}

                <View style={styles.navigationButtons}>
                  <TouchableOpacity
                    onPress={() => {
                      Alert.alert(
                        'ପଛକୁ ଯାଆନ୍ତୁ',
                        'ଆପଣ ନିଶ୍ଚିତ କି ପଛକୁ ଯିବେ? ସେଭ୍ ହୋଇନଥିବା ରେକର୍ଡିଂ ନଷ୍ଟ ହେବ।',
                        [
                          { text: 'ବାତିଲ୍', style: 'cancel' },
                          {
                            text: 'ହଁ',
                            onPress: () =>
                              setCurrentSection('studentSelection'),
                          },
                        ],
                      );
                    }}
                    style={[styles.navButton, styles.cancelNavButton]}
                    disabled={isLoading || isSavingDraft}
                  >
                    <MaterialIcons
                      name="arrow-back"
                      size={18}
                      color="#636e72"
                    />
                    <Text style={styles.cancelNavButtonText}>ପଛକୁ ଯାଆନ୍ତୁ</Text>
                  </TouchableOpacity>

                  {uploadStatus === 'success' && (
                    <TouchableOpacity
                      onPress={async () => {
                        setCompletedStudents(prev => {
                          if (!prev.includes(selectedStudentRoll.toString())) {
                            return [...prev, selectedStudentRoll.toString()];
                          }
                          return prev;
                        });
                        await refreshStudentData();
                        setCurrentSection('studentSelection');
                      }}
                      style={[styles.navButton, styles.completeNavButton]}
                    >
                      <MaterialIcons name="check" size={18} color="white" />
                      <Text style={styles.completeNavButtonText}>
                        ସମାପ୍ତ କରନ୍ତୁ
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>
          )}
        </ScrollView>
      </View>
    );
  };

  useEffect(() => {
    if (currentSection === 'studentSelection') {
      loadDraftRecordings();
    }
  }, [currentSection]);

  return (
    <View style={styles.mainContainer}>
      {currentSection === 'schoolInfo' && renderSchoolInfoSelection()}
      {currentSection === 'studentSelection' && renderStudentSelection()}
      {currentSection === 'assessment' && renderVoiceAssessment()}
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  fullContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fe9c3b',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 10,
    backgroundColor: '#03030338',
    borderRadius: 60,
  },
  title: {
    fontSize: isTablet ? 28 : 22,
    fontWeight: 'bold',
    color: '#050505',
    marginLeft: 15,
    flex: 1,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: isTablet ? 18 : 14,
    color: '#050505',
    textAlign: 'center',
    marginBottom: -9,
    fontWeight: '500',
  },
  headerContent: {
    flex: 1,
    marginLeft: 10,
  },
  draftsHeaderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  draftsBadge: {
    backgroundColor: '#FF4081',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
  },
  draftsBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  statsCard: {
    backgroundColor: 'white',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 10,
    paddingVertical: 15,
    borderRadius: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statItem: {
    flexDirection: 'column',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  statTextContainer: {
    alignItems: 'center',
    marginTop: 5,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
    textAlign: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginTop: 2,
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#eee',
  },
  contentContainer: {
    flex: 1,
    padding: 20,
  },
  studentSelectionContent: {
    paddingBottom: 30,
  },
  addStudentButtonNew: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    marginBottom: 20,
    padding: 15,
    borderRadius: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  addButtonIcon: {
    backgroundColor: '#4a6fa5',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonTextContainer: {
    flex: 1,
    marginLeft: 15,
  },
  addButtonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  addButtonSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  addButtonArrow: {
    marginLeft: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxWidth: 400,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 0,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalContent: {
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 10,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    width: '100%',
    marginBottom: 25,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  modalInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    marginLeft: 10,
    padding: 0,
  },
  genderContainer: {
    marginTop: 20,
    marginBottom: 15,
    width: '100%',
  },
  genderLabel: {
    fontSize: 14,
    color: '#555',
    marginBottom: 10,
    fontWeight: '500',
  },
  genderOptionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  genderOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#e9ecef',
  },
  genderOptionSelected: {
    backgroundColor: '#f0f7ff',
    borderColor: '#4a6fa5',
  },
  genderRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#ddd',
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  genderRadioSelected: {
    borderColor: '#4a6fa5',
  },
  genderRadioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#4a6fa5',
  },
  genderOptionText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    fontWeight: '500',
  },
  genderOptionTextSelected: {
    color: '#4a6fa5',
    fontWeight: '600',
  },
  savingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
  },
  savingText: {
    marginLeft: 10,
    color: '#666',
    fontSize: 14,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalCancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOkButton: {
    flex: 1,
    backgroundColor: '#fe9c3b',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalOkButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 200,
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#666',
  },
  studentListContainer: {
    marginBottom: 20,
  },
  listHeader: {
    marginBottom: 15,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  listContent: {
    paddingBottom: 10,
  },
  studentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    padding: 15,
    marginBottom: 10,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  selectedStudentCard: {
    backgroundColor: '#FFF8E1',
    borderColor: '#fe9c3b',
    transform: [{ scale: 0.98 }],
  },
  completedStudentCard: {
    backgroundColor: '#f9f9f9',
    opacity: 0.8,
  },
  pendingStudentCard: {
    backgroundColor: '#FFF9E6',
    borderColor: '#FFC107',
  },
  studentCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  rollNumberBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedRollBadge: {
    backgroundColor: '#fe9c3b',
  },
  completedRollBadge: {
    backgroundColor: '#4CAF50',
  },
  pendingRollBadge: {
    backgroundColor: '#FFC107',
  },
  rollNumberText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
  },
  rollNumberTextSelected: {
    color: 'white',
  },
  studentInfo: {
    marginLeft: 15,
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  studentMeta: {
    flexDirection: 'row',
    marginTop: 2,
    gap: 10,
  },
  studentId: {
    fontSize: 12,
    color: '#666',
  },
  studentCardRight: {
    alignItems: 'flex-end',
  },
  completedStatus: {
    alignItems: 'center',
  },
  completedText: {
    fontSize: 10,
    color: '#4CAF50',
    marginTop: 2,
    fontWeight: '500',
  },
  pendingStatus: {
    alignItems: 'center',
  },
  pendingText: {
    fontSize: 10,
    color: '#FF9800',
    marginTop: 2,
    fontWeight: '500',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyIconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 10,
    textAlign: 'center',
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 25,
  },
  emptyStateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fe9c3b',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    elevation: 3,
  },
  emptyStateButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
  assessmentButtonContainer: {
    marginTop: 20,
  },
  assessmentButtonNew: {
    backgroundColor: '#fe9c3b',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  assessmentButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  assessmentButtonIcon: {
    marginRight: 12,
  },
  assessmentButtonTextContainer: {
    flex: 1,
  },
  assessmentButtonMainText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  assessmentButtonSubText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    marginTop: 2,
  },
  buttonIcon: {
    marginLeft: 10,
  },
  disabledButton: {
    backgroundColor: '#ccc',
    opacity: 0.6,
  },

  // Drafts Section Styles
  draftsContainer: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  draftsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  draftsHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  draftsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  draftsCount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF9800',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  emptyDraftsContainer: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: 'white',
    borderRadius: 20,
    marginBottom: 20,
  },
  emptyDraftsIllustration: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FFF9C4',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyDraftsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 10,
  },
  emptyDraftsSubtitle: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
  draftCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 15,
    padding: 15,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#4a6fa5',
  },
  draftCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  draftCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  draftIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  draftStudentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  draftDetails: {
    fontSize: 12,
    color: '#666',
  },
  draftStatusIndicator: {
    marginLeft: 10,
  },
  draftCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  draftDate: {
    fontSize: 12,
    color: '#999',
  },
  draftQuickAction: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#E8F5E9',
  },
  viewAllDraftsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    marginTop: 10,
  },
  viewAllDraftsText: {
    fontSize: 14,
    color: '#4a6fa5',
    fontWeight: '600',
    marginRight: 8,
  },
  batchUploadButtonNew: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2196F3',
    padding: 16,
    borderRadius: 15,
    marginTop: 15,
    elevation: 2,
  },
  batchUploadIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  batchUploadTextContainer: {
    flex: 1,
  },
  batchUploadTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  batchUploadSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 2,
  },

  // Drafts Modal Styles
  draftsModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  draftsModalContainer: {
    flex: 1,
    backgroundColor: 'white',
    marginTop: 60,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    overflow: 'hidden',
  },
  draftsModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFF8E1',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  draftsModalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  draftsModalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  draftsModalCloseButton: {
    padding: 8,
  },
  draftsModalContent: {
    flex: 1,
    padding: 20,
  },
  draftsModalEmptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 60,
  },
  draftsModalEmptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 20,
    marginBottom: 10,
  },
  draftsModalEmptySubtitle: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
  draftsModalList: {
    gap: 12,
  },
  draftModalCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 18,
    padding: 18,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  draftModalCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  draftModalCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  draftModalIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  draftModalStudentName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  draftModalDetails: {
    fontSize: 13,
    color: '#666',
  },
  draftModalStatus: {
    marginLeft: 10,
  },
  draftModalCardBody: {
    marginBottom: 15,
  },
  draftModalInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  draftModalInfoText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 10,
  },
  draftModalCardFooter: {
    flexDirection: 'row',
    gap: 10,
  },
  draftModalActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 10,
    gap: 8,
  },
  playActionButton: {
    backgroundColor: '#E3F2FD',
    borderWidth: 1,
    borderColor: '#2196F3',
  },
  uploadActionButton: {
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  draftModalActionButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  draftsModalBatchUpload: {
    marginTop: 30,
    gap: 15,
  },
  draftsModalBatchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2196F3',
    padding: 18,
    borderRadius: 15,
    elevation: 2,
  },
  batchUploadIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  batchUploadText: {
    flex: 1,
  },
  batchUploadMainText: {
    fontSize: 17,
    fontWeight: 'bold',
    color: 'white',
  },
  batchUploadSubText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 2,
  },
  clearAllDraftsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFEBEE',
    padding: 15,
    borderRadius: 12,
    gap: 10,
  },
  clearAllDraftsText: {
    fontSize: 15,
    color: '#f44336',
    fontWeight: '600',
  },

  // Draft Detail Modal Styles
  draftDetailModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  draftDetailModalContainer: {
    flex: 1,
    backgroundColor: 'white',
    marginTop: 80,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    overflow: 'hidden',
  },
  draftDetailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFF8E1',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  draftDetailHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  draftDetailTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  draftDetailCloseButton: {
    padding: 8,
  },
  draftDetailContent: {
    flex: 1,
    padding: 20,
  },
  draftDetailCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 18,
    padding: 20,
    marginBottom: 20,
    elevation: 2,
  },
  draftDetailCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  draftDetailCardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 10,
  },
  draftDetailInfoGrid: {
    gap: 12,
  },
  draftDetailInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  draftDetailInfoLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  draftDetailInfoValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  audioPreviewContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  playAudioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4a6fa5',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
    gap: 10,
  },
  playingAudioButton: {
    backgroundColor: '#FF4081',
  },
  playAudioButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  draftDetailActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  draftActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 10,
  },
  uploadActionButton: {
    backgroundColor: '#4CAF50',
  },
  deleteActionButton: {
    backgroundColor: '#f44336',
  },
  draftActionButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: 'white',
  },

  // Quick Drafts Access in Assessment
  quickDraftsAccess: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    padding: 15,
    borderRadius: 15,
    marginBottom: 15,
  },
  quickDraftsIcon: {
    position: 'relative',
    marginRight: 12,
  },
  quickDraftsBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#FF4081',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
  },
  quickDraftsBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  quickDraftsText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },

  // Voice Assessment Styles
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 30,
  },
  assessmentContent: {
    padding: 20,
  },
  instructionCard: {
    backgroundColor: '#E3F2FD',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#0984e3',
  },
  instructionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  instructionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0984e3',
    marginLeft: 8,
  },
  instructionText: {
    fontSize: 14,
    color: '#2c3e50',
    lineHeight: 20,
  },
  studentInfoCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  studentInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  studentInfoText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 12,
    flex: 1,
  },
  studentInfoLabel: {
    fontWeight: '600',
    color: '#666',
  },
  passageCard: {
    backgroundColor: 'white',
    borderRadius: 24,
    marginBottom: 25,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#E3F2FD',
  },
  passageHeader: {
    backgroundColor: 'linear-gradient(135deg, #4a6fa5 0%, #3a5680 100%)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 20,
  },
  passageTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: 'black',
    marginLeft: 12,
    flex: 1,
    textAlign: 'center',
  },
  speechButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  passageContent: {
    padding: 20,
  },
  passageSubtitle: {
    fontSize: 16,
    color: '#4a6fa5',
    marginBottom: 20,
    textAlign: 'center',
    fontWeight: '600',
    lineHeight: 22,
  },
  paragraphContainer: {
    alignItems: 'center',
  },
  paragraphCard: {
    backgroundColor: '#f0f7ff',
    borderRadius: 20,
    padding: 25,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#d1e3ff',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    minHeight: 180,
    justifyContent: 'center',
    width: '100%',
  },
  paragraphIcon: {
    position: 'absolute',
    top: 15,
    left: 15,
  },
  paragraphContent: {
    alignItems: 'center',
  },
  paragraphBody: {
    fontSize: isTablet ? 32 : 28,
    fontWeight: '500',
    color: '#1a365d',
    lineHeight: isTablet ? 48 : 42,
    textAlign: 'center',
    letterSpacing: 0.5,
    fontFamily:
      Platform.OS === 'ios' ? 'MuktaMahee-Regular' : 'sans-serif-medium',
    paddingHorizontal: 10,
  },
  wordCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4a6fa5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 15,
  },
  wordCountText: {
    fontSize: 12,
    color: 'white',
    marginLeft: 6,
    fontWeight: '600',
  },
  paragraphFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e6e0ff',
  },
  paragraphFooterText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    fontStyle: 'italic',
  },
  controlsSection: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    marginBottom: 20,
  },
  primaryButton: {
    borderRadius: 15,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonTextContainer: {
    marginLeft: 12,
  },
  buttonMainText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
  },
  buttonSubText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    marginTop: 2,
  },
  recordButton: {
    backgroundColor: '#4ECDC4',
  },
  recordingButton: {
    backgroundColor: '#FF6B6B',
  },
  saveDraftButton: {
    backgroundColor: '#FF9800',
  },
  saveButton: {
    backgroundColor: '#4CAF50',
  },
  recordingStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },
  recordingPulse: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FF6B6B',
    marginRight: 8,
  },
  recordingStatusText: {
    fontSize: 14,
    color: '#FF6B6B',
    fontWeight: '600',
  },
  playbackSection: {
    marginBottom: 15,
  },
  playbackTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
    fontWeight: '600',
  },
  playbackControls: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 15,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  playButton: {
    backgroundColor: '#0984e3',
  },
  stopButton: {
    backgroundColor: '#d63031',
  },
  secondaryButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  uploadStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 10,
  },
  uploadStatusText: {
    color: '#2c3e50',
    fontSize: 14,
  },
  successMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#d4edda',
    padding: 12,
    borderRadius: 10,
    marginBottom: 15,
    gap: 8,
  },
  successText: {
    color: '#155724',
    fontSize: 14,
    fontWeight: '600',
  },
  navigationButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  navButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelNavButton: {
    backgroundColor: '#dfe6e9',
  },
  cancelNavButtonText: {
    color: '#636e72',
    fontSize: 14,
    fontWeight: '600',
  },
  completeNavButton: {
    backgroundColor: '#00b894',
  },
  completeNavButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  formContainer: {
    paddingBottom: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: isTablet ? 20 : 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    backgroundColor: 'white',
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  picker: {
    height: isTablet ? 60 : 50,
  },
  footer: {
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  assessmentButton: {
    backgroundColor: '#fe9c3b',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  assessmentButtonText: {
    color: 'white',
    fontSize: isTablet ? 20 : 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default AssessmentFlow;
