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
  // Fallback - create a simple Picker component
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
  // State for school selection
  const [currentSection, setCurrentSection] = useState('schoolInfo');
  const [districts, setDistricts] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [clusters, setClusters] = useState([]);
  const [schools, setSchools] = useState([]);
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  console.log('students----->', students);
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
  console.log('user--------->', user);
  // State for student selection
  const [selectedStudentRoll, setSelectedStudentRoll] = useState(null);
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [completedStudents, setCompletedStudents] = useState([]);
  const [pendingStudents, setPendingStudents] = useState([]);
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [studentNumber, setStudentNumber] = useState('');
  const [isSavingStudent, setIsSavingStudent] = useState(false);

  // State for voice assessment
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
  const [uploadStatus, setUploadStatus] = useState('idle'); // 'idle', 'uploading', 'success', 'error'
  const [audioUrl, setAudioUrl] = useState('');

  const [textData, setTextData] = useState(null);
  const [loadingText, setLoadingText] = useState(false);
  const [textId, setTextId] = useState('');
  const [textBody, setTextBody] = useState('');
  const [textVersion, setTextVersion] = useState('');
  const [textHeading, setTextHeading] = useState('');
  const [textDuration, setTextDuration] = useState('');

  const [draftRecordings, setDraftRecordings] = useState([]);
  const [showDraftsList, setShowDraftsList] = useState(true); // Always show drafts list
  const [isSavingDraft, setIsSavingDraft] = useState(false);

  const [selectedDraft, setSelectedDraft] = useState(null);
  const [batchUploading, setBatchUploading] = useState(false);
  const [currentUploadIndex, setCurrentUploadIndex] = useState(0);
  const [uploadProgress, setUploadProgress] = useState({});
  const [batchUploadResults, setBatchUploadResults] = useState([]);
  const DRAFT_STORAGE_KEY = 'assessment_drafts';
  const STUDENT_DRAFT_KEY = studentId => `draft_${studentId}`;
  const timerRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const audioInitPromiseRef = useRef(null);
  const audioInitCompletedRef = useRef(false);

  useEffect(() => {
    // Function to load user data from AsyncStorage
    const loadUserData = async () => {
      try {
        // First, use the prop if available
        if (propUser) {
          setUser(propUser);
          console.log('User data from props:', propUser);
          return;
        }

        // If prop is not available, load from AsyncStorage
        const userDataString = await AsyncStorage.getItem('userData');
        if (userDataString) {
          const userData = JSON.parse(userDataString);
          setUser(userData);
          console.log('User data loaded from AsyncStorage:', userData);
        } else {
          console.log('No user data found in AsyncStorage');
        }
      } catch (error) {
        console.error('Error loading user data from AsyncStorage:', error);
      }
    };

    loadUserData();
  }, [propUser]);

  // Also load on screen focus
  useFocusEffect(
    React.useCallback(() => {
      const loadUserOnFocus = async () => {
        try {
          const userDataString = await AsyncStorage.getItem('userData');
          if (userDataString) {
            const userData = JSON.parse(userDataString);
            setUser(userData);
            console.log('User data refreshed on focus:', userData);
          }
        } catch (error) {
          console.error('Error refreshing user data:', error);
        }
      };

      loadUserOnFocus();
    }, []),
  );

  // Update the existing backAction function in useEffect
  useEffect(() => {
    const backAction = () => {
      if (currentSection === 'schoolInfo') {
        // Navigate to WelcomeScreen when on schoolInfo section
        navigation.navigate('Welcome');
        return true;
      } else if (currentSection === 'studentSelection') {
        // Go back to school selection
        setCurrentSection('schoolInfo');
        return true;
      } else if (currentSection === 'assessment') {
        // Show confirmation before going back to student selection
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

  // Batch upload all drafts
  const batchUploadDrafts = async () => {
    if (draftRecordings.length === 0) {
      Alert.alert('Info', 'No drafts to upload');
      return;
    }

    try {
      setBatchUploading(true);
      setCurrentUploadIndex(0);
      setUploadProgress({});
      setBatchUploadResults([]);

      const totalDrafts = draftRecordings.length;
      let successfulUploads = 0;
      let failedUploads = 0;

      Alert.alert(
        'ବହୁ ଡ୍ରାଫ୍ଟ ଅପଲୋଡ୍',
        `ଆପଣ ${totalDrafts} ଟି ଡ୍ରାଫ୍ଟ ସର୍ଭରକୁ ଅପଲୋଡ୍ କରିବାକୁ ଚାହୁଁଛନ୍ତି। ଏହା କିଛି ସମୟ ନେଇପାରେ।`,
        [
          { text: 'ବାତିଲ୍', style: 'cancel' },
          {
            text: 'ଅପଲୋଡ୍ କରନ୍ତୁ',
            onPress: async () => {
              for (let i = 0; i < draftRecordings.length; i++) {
                const draft = draftRecordings[i];
                setCurrentUploadIndex(i + 1);

                // Update progress
                setUploadProgress(prev => ({
                  ...prev,
                  [draft.id]: {
                    status: 'uploading',
                    message: 'ଅପଲୋଡ୍ ହେଉଛି...',
                  },
                }));

                try {
                  // Upload to server
                  const uploadResult = await uploadSingleDraftToServer(draft);
                  console.log('uploadResult--->', uploadResult);
                  if (uploadResult.success) {
                    successfulUploads++;
                    setUploadProgress(prev => ({
                      ...prev,
                      [draft.id]: {
                        status: 'success',
                        message: 'ସଫଳତାର ସହ ଅପଲୋଡ୍ ହେଲା',
                      },
                    }));

                    setBatchUploadResults(prev => [
                      ...prev,
                      {
                        draftId: draft.id,
                        studentName: draft.studentName,
                        rollNumber: draft.rollNumber,
                        success: true,
                        message: 'ସଫଳତାର ସହ ଅପଲୋଡ୍ ହେଲା',
                      },
                    ]);
                  } else {
                    failedUploads++;
                    setUploadProgress(prev => ({
                      ...prev,
                      [draft.id]: {
                        status: 'error',
                        message: uploadResult.message || 'ଅପଲୋଡ୍ ବିଫଳ',
                      },
                    }));

                    setBatchUploadResults(prev => [
                      ...prev,
                      {
                        draftId: draft.id,
                        studentName: draft.studentName,
                        rollNumber: draft.rollNumber,
                        success: false,
                        message: uploadResult.message || 'ଅପଲୋଡ୍ ବିଫଳ',
                      },
                    ]);
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

                  setBatchUploadResults(prev => [
                    ...prev,
                    {
                      draftId: draft.id,
                      studentName: draft.studentName,
                      rollNumber: draft.rollNumber,
                      success: false,
                      message: 'ଅପଲୋଡ୍ ବିଫଳ',
                    },
                  ]);
                }

                // Small delay between uploads to prevent overwhelming the server
                await new Promise(resolve => setTimeout(resolve, 1000));
              }

              // Show final summary
              Alert.alert(
                'ଅପଲୋଡ୍ ସମାପ୍ତ',
                `ଅପଲୋଡ୍ ସମାପ୍ତ!${
                  successfulUploads > 0 ? `\n${successfulUploads} ଟି ସଫଳ` : ''
                }${failedUploads > 0 ? `\n${failedUploads} ଟି ବିଫଳ` : ''}`,
                [{ text: 'ଠିକ୍ ଅଛି' }],
              );

              // Refresh drafts list
              await loadDraftRecordings();
            },
          },
        ],
      );
    } catch (error) {
      console.error('Error in batch upload:', error);
      Alert.alert('Error', 'Batch upload failed');
    } finally {
      setBatchUploading(false);
    }
  };

  // Single draft upload function (refactored from uploadDraftToServer)
  const uploadSingleDraftToServer = async draft => {
    try {
      console.log('Uploading single draft:', draft.id, draft);

      // Generate new filename for upload
      const uploadFileName = `draft_${draft.studentId}_${
        draft.class
      }_${Date.now()}.wav`;

      // Upload to cloud
      const uploadResult = await UploadFileToCloud(
        draft.filePath,
        uploadFileName,
      );

      if (uploadResult.success && uploadResult.url) {
        // Prepare data for server
        const body = {
          coordinatorId: user?.coordinatorId || 'COORD001',
          studentId: draft.studentId,
          rollNumber: draft.rollNumber,
          class: draft.class,
          blockCode: draft.blockCode,
          block: draft.block,
          districtCode: draft.districtCode,
          district: draft.draft,
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

        console.log(JSON.stringify(body, null, 2));

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

          // Update student status
          setCompletedStudents(prev => {
            if (!prev.includes(draft.rollNumber.toString())) {
              return [...prev, draft.rollNumber.toString()];
            }
            return prev;
          });

          console.log('Draft uploaded successfully:', draft.id);

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
      } else if (fileName.endsWith('.ogg') || fileName.endsWith('.oga')) {
        mimeType = 'audio/ogg';
      } else if (fileName.endsWith('.flac')) {
        mimeType = 'audio/flac';
      } else if (fileName.endsWith('.webm')) {
        mimeType = 'audio/webm';
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

      console.log('Uploading file:', {
        uri: actualUri,
        type: mimeType,
        name: fileName,
        size: 'checking...',
      });

      const response = await axios.post(
        `https://thinkzone.co/cloud-storage/uploadFile/${fileName}`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },

          timeout: 60000,

          transformRequest: [
            (data, headers) => {
              console.log('Request data:', data);
              console.log('Request headers:', headers);
              return data;
            },
          ],
        },
      );

      console.log('Upload response-------->', response.status, response.data);
      return {
        success: response?.status === 200,
        url: response?.data?.url,
      };
    } catch (error) {
      console.error('Error uploading file:', error);

      if (error.response) {
        console.error('Error response data:', error.response.data);
        console.error('Error response status:', error.response.status);
        console.error('Error response headers:', error.response.headers);

        if (error.response.status === 413) {
          console.error('File is too large (over 100MB)');
          return { success: false, url: null, error: 'File too large' };
        } else if (error.response.status === 406) {
          console.error('No file uploaded or missing parameters');
          return {
            success: false,
            url: null,
            error: 'Missing file parameters',
          };
        }
      } else if (error.request) {
        console.error('No response received:', error.request);
        return { success: false, url: null, error: 'No response from server' };
      } else {
        console.error('Error setting up request:', error.message);
      }

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
      console.log('district--->', response, response?.status);
      if (response?.status === 200) {
        setDistricts(response?.data);
        setIsLoadingData(false);
      }
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
      console.log('blocks--->', response);
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

  // Fetch clusters when block is selected
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
      console.log('clusters--->', response);
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

  // Fetch schools when cluster is selected
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
      console.log('schools--->', response);
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

  // Mock classes data
  useEffect(() => {
    setClasses([
      { classId: '1', className: '1' },
      { classId: '2', className: '2' },
      { classId: '3', className: '3' },
      { classId: '4', className: '4' },
      { classId: '5', className: '5' },
    ]);
  }, []);

  // Get UDISE code from selected school
  const getUdiseCodeFromSelectedSchool = () => {
    const selectedSchoolObj = schools.find(
      school => school.schoolName === selectedSchool,
    );
    return selectedSchoolObj?.udiseCode || selectedUdiseCode;
  };

  // Fetch students with ORF assessment status
  const fetchStudents = async (classId, school) => {
    console.log('fetchStudents called with:', { classId, school });
    setIsLoadingData(true);

    try {
      // const udiseCode = getUdiseCodeFromSelectedSchool();

      // if (!udiseCode) {
      //   console.error('No UDISE code found');
      //   setStudents([]);
      //   setCompletedStudents([]);
      //   setPendingStudents([]);
      //   return;
      // }

      // Fetch students with ORF assessment status
      const apiUrl = `/getStudsWithOrf?blockCode=${selectedBlockCode}&class=${classId}`;
      console.log('Fetching students from API:', apiUrl);

      const response = await API.get(apiUrl);
      console.log('API Response status:', response.status);
      console.log('API Response data:', response.data);

      if (response.status === 200 && response.data && response.data.success) {
        const studentsData = response.data.data || [];

        // Process the response data
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
              hasORF: student.orfCompleted || false, // Changed from hasORF to orfCompleted
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

            // Check if student has ORF assessment - use orfCompleted field
            if (student.orfCompleted === true) {
              // Corrected this line
              console.log('Student with ORF completed:', studentObj.rollNumber);
              completed.push(studentObj.rollNumber?.toString());
            } else {
              pending.push(studentObj.rollNumber?.toString());
            }
          });
        }

        // Sort students by roll number
        formattedStudents.sort((a, b) => {
          const rollA = parseInt(a.rollNumber) || 0;
          const rollB = parseInt(b.rollNumber) || 0;
          return rollA - rollB;
        });

        setStudents(formattedStudents);
        setCompletedStudents(completed);
        setPendingStudents(pending);

        console.log(`Found ${formattedStudents.length} students`);
        console.log(
          `Completed: ${completed.length}, Pending: ${pending.length}`,
        );
        console.log('Completed roll numbers:', completed);
        console.log('Pending roll numbers:', pending);
      } else {
        console.log('No students data received or API not successful');
        setStudents([]);
        setCompletedStudents([]);
        setPendingStudents([]);
      }
    } catch (error) {
      console.error('Error fetching students with ORF status:', error);

      if (error.response) {
        console.error('Response error:', {
          status: error.response.status,
          data: error.response.data,
        });
      }

      // Try fallback to getAllStudents
      await fetchAllStudentsFallback(classId);
    } finally {
      setIsLoadingData(false);
    }
  };

  // Fallback function
  const fetchAllStudentsFallback = async classId => {
    try {
      const udiseCode = getUdiseCodeFromSelectedSchool();
      if (!udiseCode) return;

      console.log('Trying fallback API: getAllStudents');
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
          hasORF: false, // Assume no ORF assessment in fallback
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
    console.log('studentData---->', studentData);
    try {
      setIsSavingStudent(true);
      const response = await API.post(`/createTempStudent`, studentData);
      console.log('save student=-------->', response.data, response.status);

      if (response.status === 201) {
        // Refresh students list after successful save
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
                // setIsAddModalVisible(false);
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
      // school: selectedSchool,
      // udiseCode: selectedUdiseCode,
      academicSession: '2025-2026',
      district: selectedDistrict,
      districtCode: selectedDistrictCode,
      block: selectedBlock,
      blockCode: selectedBlockCode,
      // cluster: selectedCluster,
      // clusterCode: selectedClusterCode,
    };
    console.log('studentData---->', studentData);
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

  // Voice Assessment Functions
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

      // Ensure we only create ONE init promise and reuse it
      if (!audioInitPromise) {
        audioInitPromise = (async () => {
          await AudioRecord.init({
            sampleRate: 16000,
            channels: 1,
            bitsPerSample: 16,
            wavFile: 'recorded_audio.wav',
          });
          // Tiny delay to let native side settle
          await new Promise(r => setTimeout(r, 300));
        })();
        setAudioInitialized(true);
      }

      // Wait for init to complete before starting
      await audioInitPromise;

      // Start the recording
      setRecording(true);
      setTimeLeft(0);
      setCurrentWordIndex(-1);
      setWordStatus({});
      setAudioSavedLocally(false);
      // Start timer for recording duration
      let recordingDuration = 0;
      timerRef.current = setInterval(() => {
        recordingDuration++;
        setTimeLeft(recordingDuration);
      }, 1000); // Update every second

      try {
        await AudioRecord.start();
        console.log('AudioRecord.start succeeded');
      } catch (err) {
        // First-run native race guard: retry once after a short delay
        console.warn('Start failed, retrying once...', err);
        await new Promise(r => setTimeout(r, 500));
        await AudioRecord.start();
        console.log('AudioRecord.start retry succeeded');
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
      // Just save locally, don't auto-upload
      console.log('Recording saved locally:', audioFile);

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
      // Stop any currently playing audio first
      if (soundObj) {
        soundObj.release();
      }

      console.log('Playing audio from:', filePath);

      // Check if file exists (basic check)
      if (!filePath) {
        Alert.alert('Error', 'No audio file found');
        return;
      }

      // Prepare the audio file URI
      let audioUri = filePath;
      if (!audioUri.startsWith('file://')) {
        audioUri = `file://${audioUri}`;
      }

      console.log('Audio URI for playback:', audioUri);

      // Initialize the sound object
      const newSound = new Sound(audioUri, '', error => {
        if (error) {
          console.error('Failed to load audio:', error);
          Alert.alert('Playback Error', 'Failed to load audio file');
          setPlaying(false);
          return;
        }

        console.log('Audio loaded successfully');

        // Play the audio
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

  // Load draft recordings from AsyncStorage
  const loadDraftRecordings = async () => {
    try {
      console.log('Loading draft recordings...');
      const draftsString = await AsyncStorage.getItem(DRAFT_STORAGE_KEY);
      if (draftsString) {
        const drafts = JSON.parse(draftsString);
        // Sort by date (newest first)
        const sortedDrafts = drafts.sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
        );
        setDraftRecordings(sortedDrafts);
        console.log('Loaded draft recordings:', sortedDrafts.length);
      } else {
        setDraftRecordings([]); // Clear drafts if none exist
      }
    } catch (error) {
      console.error('Error loading draft recordings:', error);
      setDraftRecordings([]); // Clear on error
    }
  };

  // Save draft recording to AsyncStorage
  const saveDraftRecording = async draftData => {
    try {
      setIsSavingDraft(true);

      // Generate unique draft ID
      const draftId = `draft_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      // Create draft object
      const newDraft = {
        id: draftId,
        fileName: draftData.fileName || generateUniqueFileName(),
        filePath: draftData.filePath,
        localFilePath: draftData.filePath, // Store local path
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

      // Load existing drafts
      const existingDraftsString = await AsyncStorage.getItem(
        DRAFT_STORAGE_KEY,
      );
      let existingDrafts = [];

      if (existingDraftsString) {
        existingDrafts = JSON.parse(existingDraftsString);

        // Check if draft already exists for this student and text
        const existingDraftIndex = existingDrafts.findIndex(
          draft =>
            draft.studentId === newDraft.studentId &&
            draft.textId === newDraft.textId &&
            draft.status === 'draft',
        );

        if (existingDraftIndex !== -1) {
          // Update existing draft
          existingDrafts[existingDraftIndex] = {
            ...existingDrafts[existingDraftIndex],
            ...newDraft,
            updatedAt: new Date().toISOString(),
          };
        } else {
          // Add new draft
          existingDrafts.push(newDraft);
        }
      } else {
        existingDrafts = [newDraft];
      }

      // Save to AsyncStorage
      await AsyncStorage.setItem(
        DRAFT_STORAGE_KEY,
        JSON.stringify(existingDrafts),
      );

      // Update state
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
        // Also refresh student data
        if (selectedClass && selectedBlockCode) {
          fetchStudents(selectedClass, selectedBlockCode);
        }
      }
    }, [currentSection, selectedClass, selectedBlockCode]),
  );
  // Handle save draft button click
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
      // Get file size
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
        // Force refresh of drafts list
        await loadDraftRecordings();
        // Also refresh student data
        if (selectedClass && selectedBlockCode) {
          await fetchStudents(selectedClass, selectedBlockCode);
        }

        // Reset recording state
        setFilePath('');
        setAudioSavedLocally(false);
        setSoundObj(null);
        setPlaying(false);
        setTimeLeft(0);
        setUploadStatus('idle');
        setAudioUrl('');
        setCurrentWordIndex(-1);
        setWordStatus({});

        // Navigate back to student selection
        setCurrentSection('studentSelection');
      }
    } catch (error) {
      console.error('Error in handleSaveDraft:', error);
      Alert.alert('ତ୍ରୁଟି', 'ଡ୍ରାଫ୍ଟ ସେଭ୍ କରିବାରେ ବିଫଳ ହେଲା।');
    }
  };

  // Delete draft recording
  const deleteDraftRecording = async draftId => {
    try {
      Alert.alert(
        'ଡ୍ରାଫ୍ଟ ଡିଲିଟ୍ କରନ୍ତୁ',
        'ଆପଣ ନିଶ୍ଚିତ କି ଏହି ଡ୍ରାଫ୍ଟ ଡିଲିଟ୍ କରିବେ?\nଏହା ପଛକୁ ଆଣିହେବ ନାହିଁ।',
        [
          {
            text: 'ବାତିଲ୍',
            style: 'cancel',
            onPress: () => console.log('Deletion cancelled'),
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

                  // Update state
                  const sortedDrafts = updatedDrafts.sort(
                    (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
                  );
                  setDraftRecordings(sortedDrafts);

                  // Clean up audio file if needed
                  try {
                    const draftToDelete = existingDrafts.find(
                      d => d.id === draftId,
                    );
                    if (draftToDelete && draftToDelete.filePath) {
                      // Optionally delete the physical file
                      // const fs = require('react-native-fs');
                      // await fs.unlink(draftToDelete.filePath);
                    }
                  } catch (cleanupError) {
                    console.log('Error cleaning up file:', cleanupError);
                  }

                  Alert.alert('ସଫଳତା', 'ଡ୍ରାଫ୍ଟ ସଫଳତାର ସହିତ ଡିଲିଟ୍ ହୋଇଛି।');
                  console.log('Draft deleted:', draftId);
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

  // Upload draft to server
  // Update the existing uploadDraftToServer function to use the new function
  const uploadDraftToServer = async draft => {
    const result = await uploadSingleDraftToServer(draft);

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

  // Add this function inside renderVoiceAssessment, before the return statement
  const renderBatchUploadSection = () => {
    if (draftRecordings.length === 0) return null;

    return (
      <View style={styles.batchUploadSection}>
        <Text style={styles.batchUploadTitle}>
          ବହୁ ଡ୍ରାଫ୍ଟ ଅପଲୋଡ୍ ({draftRecordings.length} ଟି)
        </Text>

        {batchUploading ? (
          <View style={styles.uploadProgressContainer}>
            <ActivityIndicator size="small" color="#4ECDC4" />
            <Text style={styles.uploadProgressText}>
              {currentUploadIndex} / {draftRecordings.length} ଅପଲୋଡ୍ ହେଉଛି...
            </Text>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.batchUploadButton}
            onPress={batchUploadDrafts}
            disabled={batchUploading}
          >
            <MaterialIcons name="cloud-upload" size={24} color="white" />
            <Text style={styles.batchUploadButtonText}>
              ସମସ୍ତ ଡ୍ରାଫ୍ଟ ଅପଲୋଡ୍ କରନ୍ତୁ
            </Text>
          </TouchableOpacity>
        )}

        {/* Upload Progress Details */}
        {Object.keys(uploadProgress).length > 0 && (
          <View style={styles.uploadDetails}>
            <Text style={styles.uploadDetailsTitle}>ଅପଲୋଡ୍ ସ୍ଥିତି:</Text>
            {draftRecordings.map((draft, index) => {
              const progress = uploadProgress[draft.id];
              if (!progress) return null;

              return (
                <View key={draft.id} style={styles.uploadDetailItem}>
                  <MaterialIcons
                    name={
                      progress.status === 'success'
                        ? 'check-circle'
                        : progress.status === 'error'
                        ? 'error'
                        : 'hourglass-empty'
                    }
                    size={16}
                    color={
                      progress.status === 'success'
                        ? '#4CAF50'
                        : progress.status === 'error'
                        ? '#f44336'
                        : '#FF9800'
                    }
                  />
                  <Text style={styles.uploadDetailText}>
                    {index + 1}. {draft.studentName} (ରୋଲ୍: {draft.rollNumber}):{' '}
                    {progress.message}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Upload Results Summary */}
        {batchUploadResults.length > 0 && !batchUploading && (
          <View style={styles.resultsSummary}>
            <Text style={styles.resultsTitle}>ଅପଲୋଡ୍ ଫଳାଫଳ:</Text>
            <View style={styles.resultsStats}>
              <View style={styles.resultStat}>
                <MaterialIcons name="check-circle" size={20} color="#4CAF50" />
                <Text style={styles.resultStatText}>
                  ସଫଳ: {batchUploadResults.filter(r => r.success).length}
                </Text>
              </View>
              <View style={styles.resultStat}>
                <MaterialIcons name="error" size={20} color="#f44336" />
                <Text style={styles.resultStatText}>
                  ବିଫଳ: {batchUploadResults.filter(r => !r.success).length}
                </Text>
              </View>
            </View>
          </View>
        )}
      </View>
    );
  };

  // Play draft audio
  const playDraftAudio = draft => {
    try {
      // Stop any currently playing audio
      if (soundObj) {
        soundObj.release();
        setSoundObj(null);
      }

      console.log('Playing draft audio:', draft.filePath);

      // Check if file exists
      if (!draft.filePath) {
        Alert.alert('Error', 'Audio file not found');
        return;
      }

      // Prepare the audio file URI
      let audioUri = draft.filePath;
      if (!audioUri.startsWith('file://')) {
        audioUri = `file://${audioUri}`;
      }

      console.log('Draft audio URI:', audioUri);

      // Initialize the sound object
      const newSound = new Sound(audioUri, '', error => {
        if (error) {
          console.error('Failed to load draft audio:', error);
          Alert.alert('Playback Error', 'Failed to load draft audio file');
          setPlaying(false);
          return;
        }

        console.log('Draft audio loaded successfully');

        // Get duration
        const duration = newSound.getDuration();
        console.log('Draft audio duration:', duration);

        // Play the audio
        newSound.play(success => {
          if (success) {
            console.log('Draft audio finished playing');
          } else {
            console.log('Draft audio playback failed');
            Alert.alert('Playback Error', 'Failed to play draft audio');
          }
          newSound.release();
          setPlaying(false);
          setSoundObj(null);
        });

        setPlaying(true);
        setSoundObj(newSound);
      });

      // Set error callback
      newSound.setErrorCallback(error => {
        console.error('Sound error:', error);
        Alert.alert('Playback Error', 'Error playing audio');
        setPlaying(false);
        setSoundObj(null);
      });
    } catch (error) {
      console.error('Error in playDraftAudio:', error);
      Alert.alert('Error', 'Failed to play draft audio');
      setPlaying(false);
    }
  };

  // Refresh student data after upload

  // Clear all drafts
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
                // Clear AsyncStorage
                await AsyncStorage.removeItem(DRAFT_STORAGE_KEY);

                // Update state
                setDraftRecordings([]);

                Alert.alert('ସଫଳତା', 'ସମସ୍ତ ଡ୍ରାଫ୍ଟ ସଫଳତାର ସହିତ ଡିଲିଟ୍ ହୋଇଛି।');

                console.log('All drafts cleared');
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

  // School Info Selection Component
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

          {/* <View style={styles.formGroup}>
            <Text style={[styles.label, { lineHeight: 30 }]}>କ୍ଲଷ୍ଟର୍‍</Text>
            <View style={styles.pickerContainer}>
              {isLoadingData && selectedBlock && !selectedCluster ? (
                <ActivityIndicator size="small" color="#4a6fa5" />
              ) : (
                <Picker
                  selectedValue={selectedCluster}
                  style={styles.picker}
                  onValueChange={itemValue => {
                    if (itemValue === '') {
                      setSelectedCluster('');
                      setSelectedClusterCode('');
                    } else {
                      const selectedClusterObj = clusters.find(
                        cluster => cluster.name === itemValue,
                      );
                      setSelectedCluster(itemValue);
                      setSelectedClusterCode(selectedClusterObj?.code || '');
                    }
                  }}
                  enabled={!!selectedBlock && clusters.length > 0}
                >
                  <Picker.Item
                    label="କ୍ଲଷ୍ଟର"
                    value=""
                    style={{ fontSize: isTablet ? 20 : 12, lineHeight: 30 }}
                  />
                  {clusters.map(cluster => (
                    <Picker.Item
                      key={cluster.code}
                      label={cluster.name}
                      value={cluster.name}
                      style={{ fontSize: isTablet ? 20 : 12 }}
                    />
                  ))}
                </Picker>
              )}
            </View>
          </View> */}

          {/* <View style={styles.formGroup}>
            <Text style={[styles.label, { lineHeight: 30 }]}>ବିଦ୍ୟାଳୟ </Text>
            <View style={styles.pickerContainer}>
              {isLoadingData && selectedCluster && !selectedSchool ? (
                <ActivityIndicator size="small" color="#4a6fa5" />
              ) : (
                <Picker
                  selectedValue={selectedSchool}
                  style={styles.picker}
                  onValueChange={itemValue => {
                    const selectedSchoolObj = schools.find(
                      school => school.schoolName === itemValue,
                    );

                    setSelectedSchool(itemValue);
                    if (selectedSchoolObj) {
                      setSelectedUdiseCode(selectedSchoolObj.udiseCode);
                    }
                  }}
                  enabled={!!selectedCluster && schools.length > 0}
                >
                  <Picker.Item
                    label="ବିଦ୍ୟାଳୟ"
                    value=""
                    style={{ fontSize: isTablet ? 20 : 14, lineHeight: 30 }}
                  />
                  {schools.map(school => (
                    <Picker.Item
                      key={school.schoolId}
                      label={`${school.schoolName} (${school.udiseCode})`}
                      value={school.schoolName}
                      style={{ fontSize: isTablet ? 20 : 12 }}
                    />
                  ))}
                </Picker>
              )}
            </View>
          </View> */}

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

  // Student Selection Component

  const renderStudentSelection = () => {
    // Calculate if selected student is completed - FIXED VERSION
    const isSelectedStudentCompleted = () => {
      if (!selectedStudentRoll) return false;

      // First check if roll number is in completedStudents array
      if (completedStudents.includes(selectedStudentRoll.toString())) {
        console.log(
          `Student ${selectedStudentRoll} found in completedStudents array`,
        );
        return true;
      }

      // Also check the students array for hasORF property
      const selectedStudentObj = students.find(
        student =>
          student.rollNumber?.toString() === selectedStudentRoll?.toString(),
      );

      if (selectedStudentObj) {
        console.log(
          `Student ${selectedStudentRoll} hasORF: ${selectedStudentObj.hasORF}`,
        );
        return selectedStudentObj.hasORF === true;
      }

      return false;
    };

    const selectedStudentIsCompleted = isSelectedStudentCompleted();
    console.log(
      `Button state - Selected: ${selectedStudentRoll}, Completed: ${selectedStudentIsCompleted}, Loading: ${isLoadingData}`,
    );

    // Render batch upload header button
    const renderBatchUploadHeader = () => {
      if (draftRecordings.length === 0) return null;

      return (
        <TouchableOpacity
          style={styles.batchUploadHeaderButton}
          onPress={batchUploadDrafts}
          disabled={batchUploading}
        >
          <MaterialIcons name="cloud-upload" size={20} color="white" />
          <Text style={styles.batchUploadHeaderText}>
            {batchUploading
              ? `${currentUploadIndex}/${draftRecordings.length}`
              : draftRecordings.length}
          </Text>
        </TouchableOpacity>
      );
    };

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

          {/* Batch Upload Button in Header */}
          {renderBatchUploadHeader()}
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

        {/* Drafts Info Banner - Only show if drafts exist and list is collapsed */}
        {draftRecordings.length > 0 && !showDraftsList && (
          <TouchableOpacity
            style={styles.draftsInfoBanner}
            onPress={() => setShowDraftsList(true)}
          >
            <MaterialIcons name="folder" size={20} color="#4a6fa5" />
            <Text style={styles.draftsInfoBannerText}>
              ଆପଣଙ୍କର {draftRecordings.length} ଟି ଡ୍ରାଫ୍ଟ ରେକର୍ଡିଂ ଅଛି। ଦେଖିବା
              ପାଇଁ ଟ୍ୟାପ୍ କରନ୍ତୁ।
            </Text>
            <MaterialIcons name="chevron-right" size={20} color="#4a6fa5" />
          </TouchableOpacity>
        )}

        {/* Add Student Button */}
        <TouchableOpacity
          onPress={() => {
            console.log('Opening add student modal');
            setIsAddModalVisible(true);
          }}
          style={styles.addStudentButtonNew}
        >
          <View style={styles.addButtonIcon}>
            <MaterialIcons name="person-add" size={22} color="white" />
          </View>
          <View style={styles.addButtonTextContainer}>
            <Text style={styles.addButtonTitle}>ନୂତନ ଶିକ୍ଷାର୍ଥୀ ଯୋଡ଼ନ୍ତୁ</Text>
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
          onRequestClose={() => !isSavingStudent && setIsAddModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <MaterialIcons name="person-add" size={28} color="#fe9c3b" />
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
                          gender === 'male' && styles.genderOptionTextSelected,
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
                      <Text style={styles.modalOkButtonText}>ସେଭ୍ କରନ୍ତୁ</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          </View>
        </Modal>

        <View style={styles.contentContainer}>
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
                showsVerticalScrollIndicator={false}
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
                        // Only allow selection for pending students
                        if (!isCompleted) {
                          console.log(`Selecting student: ${item}`);
                          setSelectedStudentRoll(item.rollNumber);
                          setSelectedStudentId(item.studentId);
                          setSelectedStudent(
                            item.studentName || `Student ${item.rollNumber}`,
                          );
                        } else {
                          console.log(
                            `Cannot select - student ${item.rollNumber} already completed`,
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

          {/* ASSESSMENT BUTTON */}
          <View style={styles.footer}>
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
                  console.log(
                    'Starting assessment for student:',
                    selectedStudentRoll,
                  );
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
        </View>
      </View>
    );
  };

  const fetchTextData = async grade => {
    try {
      setLoadingText(true);
      console.log('Fetching text data for grade:', grade);

      const apiUrl = `/getTextGrid/shuffled?userId=${
        user?.userId || 'user123'
      }&class=${grade}`;
      console.log('Text API URL:', apiUrl);

      const response = await API.get(apiUrl);
      console.log('Text API Response:', response.data, response.status);

      if (response.status === 200) {
        const { textId, textHeading, textBody, textVersion, textDuration } =
          response.data.data;
        setTextId(textId);
        setTextBody(textBody);
        setTextVersion(textVersion);
        setTextHeading(textHeading);
        setTextDuration(textDuration);

        // Process textArr to create sentences
        const sentences = processTextArrayToSentences(textBody);
        setTextData({
          textId,
          textHeading,
          textBody,
          textVersion,
          title: `ପଠନ ବିଷୟ: ଶ୍ରେଣୀ ${grade} ପାଠ୍ୟ`,
        });

        return textBody; // Return for use in other functions
      } else {
        throw new Error('Failed to fetch text data');
      }
    } catch (error) {
      console.error('Error fetching text data:', error);
    } finally {
      setLoadingText(false);
    }
  };

  // Helper function to convert text array to sentences
  const processTextArrayToSentences = textArr => {
    if (!textArr || !Array.isArray(textArr)) return [];

    const sentences = [];
    let currentSentence = [];

    textArr.forEach((word, index) => {
      currentSentence.push(word);

      // Check if word ends a sentence (contains punctuation)
      if (
        word.includes('।') ||
        word.includes('.') ||
        word.includes('!') ||
        word.includes('?')
      ) {
        sentences.push(currentSentence.join(' '));
        currentSentence = [];
      }

      // If we're at the end and have words, add as a sentence
      if (index === textArr.length - 1 && currentSentence.length > 0) {
        sentences.push(currentSentence.join(' '));
      }
    });

    // If no sentences were formed (no punctuation), join all words
    if (sentences.length === 0 && textArr.length > 0) {
      sentences.push(textArr.join(' '));
    }

    return sentences;
  };
  // Add this useEffect near your other useEffect hooks
  useEffect(() => {
    if (selectedGrade && currentSection === 'assessment') {
      console.log('Fetching text data for assessment');
      fetchTextData(selectedClass); // Use selectedClass (1, 2, 3) as grade
    }
  }, [selectedGrade, currentSection, selectedClass]);

  const renderVoiceAssessment = () => {
    const displayTextData = textData;
    console.log('displayTextData----->', displayTextData);

    const textBody = displayTextData?.textBody || '';
    const title = displayTextData?.textHeading || '';

    const textId = displayTextData?.textId || '';

    const renderTextBody = () => {
      if (!textBody) {
        return (
          <View style={styles.noTextContainer}>
            <MaterialIcons name="error" size={40} color="#ccc" />
            <Text style={styles.noTextMessage}>ପାଠ୍ୟ ସାମଗ୍ରୀ ଉପଲବ୍ଧ ନାହିଁ</Text>
          </View>
        );
      }

      // Split text by spaces to show words
      const words = textBody.split(' ');

      return (
        <View style={styles.paragraphContent}>
          <Text style={styles.paragraphBody}>{textBody}</Text>

          {/* Optional: Show word count */}
          <View style={styles.wordCountBadge}>
            <MaterialIcons name="text-fields" size={14} color="#fff" />
            <Text style={styles.wordCountText}>{words.length} ଶବ୍ଦ</Text>
          </View>
        </View>
      );
    };

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

          {/* Drafts Button in Header */}
          {draftRecordings.length > 0 && (
            <TouchableOpacity
              style={styles.draftsHeaderButton}
              onPress={() => loadDraftRecordings()}
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

              {/* Reading Passage Card - UPDATED PARAGRAPH VIEW */}
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

                  {/* Paragraph Container */}
                  <View style={styles.paragraphContainer}>
                    <View style={styles.paragraphCard}>
                      <View style={styles.paragraphIcon}>
                        <MaterialIcons
                          name="format-quote"
                          size={28}
                          color="#fe9c3b"
                        />
                      </View>

                      {renderTextBody()}

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
                {/* Main Recording Button */}
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

                {/* Recording Status */}
                {recording && (
                  <View style={styles.recordingStatusContainer}>
                    <View style={styles.recordingPulse} />
                    <Text style={styles.recordingStatusText}>
                      ରେକର୍ଡିଂ ଚାଲୁଛି... {timeLeft} ସେକେଣ୍ଡ
                    </Text>
                  </View>
                )}

                {/* Playback Controls - Only show if recording exists */}
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

                {/* Save Draft Button */}
                <TouchableOpacity
                  onPress={handleSaveDraft}
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

                {/* Save to Server Button */}
                {/* <TouchableOpacity
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
                </TouchableOpacity> */}

                {/* Upload Status */}
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

                {/* Drafts List Section - Always visible */}
                <View style={styles.draftsListSection}>
                  <View style={styles.draftsListHeader}>
                    <MaterialIcons name="folder" size={20} color="#4a6fa5" />
                    <Text style={styles.draftsListTitle}>
                      ସେଭ୍ କରାଯାଇଥିବା ଡ୍ରାଫ୍ଟଗୁଡିକ ({draftRecordings.length})
                    </Text>
                    {draftRecordings.length > 0 && (
                      <TouchableOpacity
                        style={styles.clearAllSmallButton}
                        onPress={clearAllDrafts}
                      >
                        <Text style={styles.clearAllSmallText}>ସବୁ ଡିଲିଟ୍</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {draftRecordings.length > 0 ? (
                    <FlatList
                      data={draftRecordings}
                      keyExtractor={item => item.id}
                      scrollEnabled={false}
                      contentContainerStyle={styles.draftFlatList}
                      renderItem={({ item, index }) => {
                        const progress = uploadProgress[item.id];
                        const isUploading =
                          progress && progress.status === 'uploading';
                        const isSuccess =
                          progress && progress.status === 'success';
                        const isError = progress && progress.status === 'error';

                        return (
                          <View style={styles.draftListItem}>
                            <View style={styles.draftListItemHeader}>
                              <View style={styles.draftListItemInfo}>
                                <Text style={styles.draftListItemName}>
                                  {item.studentName} (ରୋଲ୍: {item.rollNumber})
                                </Text>
                                <Text style={styles.draftListItemClass}>
                                  ଶ୍ରେଣୀ: {item.class} • {item.duration || 0}{' '}
                                  ସେକେଣ୍ଡ
                                </Text>
                              </View>
                              <View style={styles.draftListItemStatus}>
                                {isUploading && (
                                  <ActivityIndicator
                                    size="small"
                                    color="#FF9800"
                                  />
                                )}
                                {isSuccess && (
                                  <MaterialIcons
                                    name="check-circle"
                                    size={16}
                                    color="#4CAF50"
                                  />
                                )}
                                {isError && (
                                  <MaterialIcons
                                    name="error"
                                    size={16}
                                    color="#f44336"
                                  />
                                )}
                              </View>
                            </View>

                            <View style={styles.draftListItemActions}>
                              <TouchableOpacity
                                style={[
                                  styles.draftListItemButton,
                                  styles.playButtonSmall,
                                ]}
                                onPress={() => playDraftAudio(item)}
                                disabled={playing && soundObj}
                              >
                                <MaterialIcons
                                  name={
                                    playing && soundObj ? 'pause' : 'play-arrow'
                                  }
                                  size={14}
                                  color="white"
                                />
                                <Text style={styles.draftListItemButtonText}>
                                  {playing && soundObj ? 'ବିରତ' : 'ଶୁଣନ୍ତୁ'}
                                </Text>
                              </TouchableOpacity>

                              <TouchableOpacity
                                style={[
                                  styles.draftListItemButton,
                                  styles.uploadButtonSmall,
                                ]}
                                onPress={() => uploadDraftToServer(item)}
                                disabled={isLoading || batchUploading}
                              >
                                {isLoading && selectedDraft === item.id ? (
                                  <ActivityIndicator
                                    size="small"
                                    color="white"
                                  />
                                ) : (
                                  <>
                                    <MaterialIcons
                                      name="cloud-upload"
                                      size={14}
                                      color="white"
                                    />
                                    <Text
                                      style={styles.draftListItemButtonText}
                                    >
                                      {isSuccess ? 'ହୋଇଛି' : 'ଅପଲୋଡ୍'}
                                    </Text>
                                  </>
                                )}
                              </TouchableOpacity>

                              <TouchableOpacity
                                style={[
                                  styles.draftListItemButton,
                                  styles.deleteButtonSmall,
                                ]}
                                onPress={() => deleteDraftRecording(item.id)}
                                disabled={isLoading || batchUploading}
                              >
                                <MaterialIcons
                                  name="delete"
                                  size={14}
                                  color="white"
                                />
                                <Text style={styles.draftListItemButtonText}>
                                  ଡିଲିଟ୍
                                </Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        );
                      }}
                    />
                  ) : (
                    <View style={styles.noDraftsInList}>
                      <MaterialIcons
                        name="folder-open"
                        size={30}
                        color="#ccc"
                      />
                      <Text style={styles.noDraftsInListText}>
                        କୌଣସି ଡ୍ରାଫ୍ଟ ନାହିଁ
                      </Text>
                      <Text style={styles.noDraftsInListSubText}>
                        ଡ୍ରାଫ୍ଟ ଭାବରେ ସେଭ୍ କରିବାକୁ "ଡ୍ରାଫ୍ଟ ଭାବରେ ସେଭ୍ କରନ୍ତୁ"
                        ବଟନ୍ ଦବାନ୍ତୁ
                      </Text>
                    </View>
                  )}
                </View>

                {/* Batch Upload Section */}
                {draftRecordings.length > 0 && renderBatchUploadSection()}

                {/* Navigation Buttons */}
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
  // Add this function near your other functions
  const refreshStudentData = async () => {
    if (selectedClass && selectedBlockCode) {
      console.log('Refreshing student data...');
      try {
        // Show loading state
        setIsLoadingData(true);

        // Fetch updated data from server
        await fetchStudents(selectedClass, selectedBlockCode);

        // Also refresh drafts
        await loadDraftRecordings();

        console.log('Student data refreshed successfully');
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

      // Generate unique filename
      const fileName = generateUniqueFileName();

      console.log('Manual save - File path:', filePath);
      console.log('Manual save - File name:', fileName);

      // Upload to cloud
      const uploadResult = await UploadFileToCloud(filePath, fileName);
      console.log('Manual save uploadResult----->', uploadResult);

      if (uploadResult.success) {
        setUploadStatus('success');
        setAudioUrl(uploadResult.url);

        const body = {
          coordinatorId: user?.coordinatorId || 'COORD001',
          studentId: selectedStudentId,
          rollNumber: selectedStudentRoll,
          class: selectedClass,
          // udiseCode: selectedUdiseCode,
          // school: selectedSchool,
          // clusterCode: selectedClusterCode,
          // cluster: selectedCluster,
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
        console.log('response------->', response, response.status);
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
        // Mark student as completed
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

  // Main render with navigation
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
  saveButton: {
    backgroundColor: '#6C5CE7',
    marginTop: 10,
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
  addStudentButtonNew: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginVertical: 10,
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

  // ... existing styles ...

  // Gender Selection Styles
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

  // Update modal content height to accommodate gender selection
  modalContentNew: {
    width: '85%',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    maxHeight: '75%',
  },
  recordingDurationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 10,
  },
  recordingDurationText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 6,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  modalTitleNew: {
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
  modalInputNew: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    marginLeft: 10,
    padding: 0,
  },
  paragraphLine: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },

  paragraphSentence: {
    fontSize: isTablet ? 28 : 24,
    fontWeight: '500',
    color: '#2D3748',
    lineHeight: isTablet ? 40 : 36,
    textAlign: 'left',
    letterSpacing: 0.5,
    fontFamily:
      Platform.OS === 'ios' ? 'MuktaMahee-Regular' : 'sans-serif-medium',
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
  modalButtonsNew: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  modalCancelButtonNew: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalCancelButtonTextNew: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOkButtonNew: {
    flex: 1,
    backgroundColor: '#fe9c3b',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalOkButtonTextNew: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#666',
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

  studentListContainer: {
    flex: 1,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingHorizontal: 5,
  },
  // Add to your StyleSheet
  pendingStudentCard: {
    backgroundColor: '#FFF9E6',
    borderColor: '#FFC107',
  },

  pendingRollBadge: {
    backgroundColor: '#FFC107',
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

  studentMeta: {
    flexDirection: 'row',
    marginTop: 2,
    gap: 10,
  },

  assessmentScore: {
    fontSize: 11,
    color: '#2196F3',
    fontWeight: '500',
  },

  // Update existing styles for better spacing
  studentInfo: {
    marginLeft: 15,
    flex: 1,
  },

  studentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },

  studentId: {
    fontSize: 12,
    color: '#666',
  },
  listTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  statusLegend: {
    flexDirection: 'row',
    gap: 15,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 5,
  },
  availableDot: {
    backgroundColor: '#4a6fa5',
  },
  completedDot: {
    backgroundColor: '#4CAF50',
  },
  legendText: {
    fontSize: 11,
    color: '#666',
  },
  listContent: {
    paddingBottom: 20,
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
  studentId: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
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
  selectedStatus: {
    alignItems: 'center',
  },
  selectedText: {
    fontSize: 10,
    color: '#fe9c3b',
    marginTop: 2,
    fontWeight: '500',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
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
  },
  assessmentButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
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
  backButton: {
    padding: 10,
    backgroundColor: '#03030338',
    borderRadius: 60,
  },
  headerContent: {
    flex: 1,
    marginLeft: 10,
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
  contentContainer: {
    flex: 1,
    padding: 20,
    marginTop: 32,
  },
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
  disabledButton: {
    backgroundColor: '#ccc',
    opacity: 0.6,
  },
  assessmentButtonText: {
    color: 'white',
    fontSize: isTablet ? 20 : 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  buttonIcon: {
    marginLeft: 10,
  },
  // Student Selection Styles
  addStudentButton: {
    position: 'absolute',
    right: 15,
    top: 125,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 25,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    zIndex: 1,
  },
  addStudentText: {
    color: '#c02222ff',
    marginLeft: 5,
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 30,
  },
  studentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    padding: 15,
    marginVertical: 5,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  selectedStudentItem: {
    borderColor: '#4CAF50',
    borderWidth: 2,
    backgroundColor: '#f1f8e9',
  },
  completedStudentItem: {
    backgroundColor: '#f5f5f5',
    opacity: 0.7,
  },
  studentInfoContainer: {
    flex: 1,
  },
  studentRoll: {
    fontSize: isTablet ? 18 : 16,
    fontWeight: '600',
    color: '#333',
  },
  completedBadge: {
    fontSize: isTablet ? 14 : 12,
    color: '#757575',
    fontWeight: '500',
    marginTop: 4,
  },
  noStudentsText: {
    textAlign: 'center',
    fontSize: isTablet ? 18 : 16,
    color: '#666',
    marginTop: 50,
    fontStyle: 'italic',
  },
  loader: {
    marginTop: 50,
  },
  // Modal Styles
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

  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
    lineHeight: 30,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 10,
    width: '80%',
    textAlign: 'center',
    fontSize: 16,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  modalCancelButton: {
    backgroundColor: '#ccc',
    paddingVertical: 10,
    paddingHorizontal: 25,
    borderRadius: 8,
  },
  modalCancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOkButton: {
    backgroundColor: '#fe9c3b',
    paddingVertical: 10,
    paddingHorizontal: 25,
    borderRadius: 8,
  },
  modalOkButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Voice Assessment Styles
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
  timerContainer: {
    alignItems: 'center',
    marginBottom: 25,
  },
  timerCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  timerText: {
    fontSize: 32,
    fontWeight: '800',
    color: '#2c3e50',
  },
  timerLabel: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 4,
    fontWeight: '600',
  },
  recordingStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 10,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'white',
    marginRight: 6,
  },
  recordingText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '700',
  },
  wordsSection: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2c3e50',
    marginBottom: 15,
    textAlign: 'center',
  },
  wordsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
  },
  wordBox: {
    backgroundColor: 'white',
    width: (width - 80) / 4,
    height: 70,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 2,
    borderColor: '#dfe6e9',
    position: 'relative',
  },
  activeWordBox: {
    backgroundColor: '#74b9ff',
    borderColor: '#0984e3',
    transform: [{ scale: 1.05 }],
  },
  correctWordBox: {
    backgroundColor: '#d4edda',
    borderColor: '#00b894',
  },
  wrongWordBox: {
    backgroundColor: '#f8d7da',
    borderColor: '#e17055',
  },
  wordText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2d3436',
  },
  activeWordText: {
    color: 'white',
    fontWeight: '700',
  },
  statusIndicator: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: 'white',
    borderRadius: 10,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
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
  recordingAnimation: {
    position: 'absolute',
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'white',
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
  progressContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: '#dfe6e9',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4ECDC4',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: '#7f8c8d',
    fontWeight: '500',
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

  timerCircleRecording: {
    borderColor: '#FF6B6B',
    backgroundColor: '#FFF5F5',
  },
  timerCircleCompleted: {
    borderColor: '#4CAF50',
    backgroundColor: '#F0FFF4',
  },

  recordingPulse: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FF6B6B',
    marginRight: 8,
    animation: 'pulse 1.5s infinite',
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
  passageTextContainer: {
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  sentenceContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  sentenceNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fe9c3b',
    minWidth: 25,
    marginTop: 3,
  },
  sentenceTextContainer: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginLeft: 10,
  },
  wordText: {
    fontSize: isTablet ? 20 : 18,
    color: '#2D3748',
    marginRight: 4,
    marginBottom: 4,
    lineHeight: 28,
  },
  currentWordText: {
    backgroundColor: '#74b9ff',
    color: 'white',
    fontWeight: '700',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
  },
  correctWordText: {
    color: '#00b894',
    fontWeight: '600',
    textDecorationLine: 'underline',
    textDecorationColor: '#00b894',
  },
  wrongWordText: {
    color: '#e17055',
    fontWeight: '600',
    textDecorationLine: 'line-through',
    textDecorationColor: '#e17055',
  },
  sentenceStatus: {
    marginLeft: 10,
    marginTop: 6,
  },
  paragraphFooterText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    fontStyle: 'italic',
  },
  readingGuide: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 16,
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 16,
    width: '100%',
  },

  guideItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  batchUploadHeaderButton: {
    position: 'absolute',
    right: 70,
    top: 55,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2196F3',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 5,
  },
  batchUploadHeaderText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  draftsInfoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    marginHorizontal: 20,
    marginVertical: 10,
    padding: 15,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#0984e3',
    gap: 10,
  },
  draftsInfoBannerText: {
    flex: 1,
    fontSize: 14,
    color: '#2c3e50',
    fontWeight: '500',
  },
  draftStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },

  resultStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  resultStatText: {
    fontSize: 12,
    fontWeight: '500',
  },
  // Update passage subtitle
  passageSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 22,
  },
  // Drafts List Section Styles
  draftsListSection: {
    backgroundColor: '#f8f9fa',
    borderRadius: 16,
    padding: 16,
    marginTop: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  draftsListHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  draftsListTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 10,
    flex: 1,
  },
  clearAllSmallButton: {
    backgroundColor: '#f8d7da',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  clearAllSmallText: {
    fontSize: 12,
    color: '#721c24',
    fontWeight: '500',
  },
  draftFlatList: {
    paddingBottom: 5,
  },
  draftListItem: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e9ecef',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  draftListItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  draftListItemInfo: {
    flex: 1,
  },
  draftListItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  draftListItemClass: {
    fontSize: 12,
    color: '#666',
  },
  draftListItemStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  draftListItemActions: {
    flexDirection: 'row',
    gap: 8,
  },
  draftListItemButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    gap: 6,
  },
  playButtonSmall: {
    backgroundColor: '#0984e3',
  },
  uploadButtonSmall: {
    backgroundColor: '#4CAF50',
  },
  deleteButtonSmall: {
    backgroundColor: '#f44336',
  },
  draftListItemButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  noDraftsInList: {
    alignItems: 'center',
    padding: 20,
  },
  noDraftsInListText: {
    marginTop: 10,
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  noDraftsInListSubText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 5,
    lineHeight: 16,
  },

  '@keyframes pulse': {
    '0%': {
      opacity: 1,
      transform: [{ scale: 1 }],
    },
    '50%': {
      opacity: 0.5,
      transform: [{ scale: 1.2 }],
    },
    '100%': {
      opacity: 1,
      transform: [{ scale: 1 }],
    },
  },
});

export default AssessmentFlow;
