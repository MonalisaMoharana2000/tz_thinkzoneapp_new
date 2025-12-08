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

// Import Picker correctly - try both methods
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

const AssessmentFlow = ({ navigation, user }) => {
  // State for school selection
  const [currentSection, setCurrentSection] = useState('schoolInfo');
  const [districts, setDistricts] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [clusters, setClusters] = useState([]);
  const [schools, setSchools] = useState([]);
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);

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

  // State for student selection
  const [selectedStudentRoll, setSelectedStudentRoll] = useState(null);
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [completedStudents, setCompletedStudents] = useState([]);
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [studentNumber, setStudentNumber] = useState('');
  const [isSavingStudent, setIsSavingStudent] = useState(false);

  // State for voice assessment
  const [recording, setRecording] = useState(false);
  const [filePath, setFilePath] = useState('');
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
  const timerRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const audioInitPromiseRef = useRef(null);
  const audioInitCompletedRef = useRef(false);

  // Update the existing backAction function in useEffect
  useEffect(() => {
    const backAction = () => {
      if (currentSection === 'schoolInfo') {
        Alert.alert('', 'Are you sure you want to exit?', [
          // Alert.alert('Exit App', 'Are you sure you want to exit?', [
          {
            text: 'Cancel',
            onPress: () => null,
            style: 'cancel',
          },
          {
            text: 'YES',
            onPress: () => {
              //   BackHandler.exitApp();
              navigation.navigate('Welcome');
              setSelectedDistrict('');
              setSelectedBlock('');
              setSelectedCluster('');
              setSelectedSchool('');
              setSelectedClass('');
            },
          },
        ]);
        return true;
      } else if (currentSection === 'studentSelection') {
        Alert.alert(
          'Go Back',
          'Are you sure you want to go back to school selection?',
          [
            {
              text: 'Cancel',
              onPress: () => null,
              style: 'cancel',
            },
            {
              text: 'YES',
              onPress: () => setCurrentSection('schoolInfo'),
            },
          ],
        );
        return true;
      } else if (currentSection === 'assessment') {
        Alert.alert(
          'Go Back',
          'Are you sure you want to go back to student selection? Unsaved recording will be lost.',
          [
            {
              text: 'Cancel',
              onPress: () => null,
              style: 'cancel',
            },
            {
              text: 'YES',
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
  }, [currentSection]);

  const grade1Data = {
    words:
      'ବଣରେ ବିଲୁଆଟିଏ ଥିଲା । ସେ ଭୋକିଲା ଥିଲା । ନଦୀକୂଳରେ ଗୋଟିଏ ବତକକୁ ଦେଖିଲା । ବତକ ପୋକ ଖାଉଥିଲା । ବିଲୁଆ ବତକ ଆଡକୁ ଗଲା । ବତକ ବିଲୁଆକୁ ଦେଖି ଧାଇଁଲା । ବିଲୁଆ ତା ପଛରେ ଧାଇଁଲା । ବତକ ପାଣିକୁ ଡେଇଁ ପଡିଲା । ବତକ ପାଣିରେ ପହଁରି ପଳେଇଲା ।'
        .split(' ')
        .filter(word => word.trim() !== '' && word !== '।'),
  };

  // Back handler for exit app
  useEffect(() => {
    const backAction = () => {
      if (currentSection === 'schoolInfo') {
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
      } else if (currentSection === 'studentSelection') {
        setCurrentSection('schoolInfo');
        return true;
      } else if (currentSection === 'assessment') {
        setCurrentSection('studentSelection');
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction,
    );

    return () => backHandler.remove();
  }, [currentSection]);

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
    ]);
  }, []);

  // Get UDISE code from selected school
  const getUdiseCodeFromSelectedSchool = () => {
    const selectedSchoolObj = schools.find(
      school => school.schoolName === selectedSchool,
    );
    return selectedSchoolObj?.udiseCode || selectedUdiseCode;
  };

  // Fetch students from API
  const fetchStudents = async (classId, school) => {
    console.log('selectedCls------------>', classId);
    console.log('selectedSchool------------>', school);
    setIsLoadingData(true);

    try {
      const udiseCode = getUdiseCodeFromSelectedSchool();

      const apiUrl = `/getAllStudents?udiseCode=${udiseCode}&class=${classId}`;
      console.log('API URL:', apiUrl);

      const response = await API.get(apiUrl);

      console.log('Full response:', response);

      if (response.status === 200 && response.data) {
        const studentsData = response.data.data || response.data || [];

        console.log('Students data length:', studentsData.length);

        const formattedStudents = studentsData.map((student, index) => ({
          id: student.studentId || `student-${index}`,
          studentId: student.studentId,
          studentName: student.studentName || student.name,
          rollNumber: student.rollNumber || student.rollNo || index + 1,
          class: classId,
        }));

        setStudents(formattedStudents);
      } else {
        setStudents([]);
      }
    } catch (error) {
      console.error('Full error object:', error);
      console.error('Error config:', error.config);
      setStudents([]);
    } finally {
      setIsLoadingData(false);
    }
  };

  const saveStudentToServer = async studentData => {
    console.log('studentData---->', studentData);
    try {
      setIsSavingStudent(true);
      const response = await API.post(`/saveStudent`, studentData);
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
      console.error('Error saving student:', error);
      Alert.alert('Error', 'Failed to save student. Please try again.');
      throw error;
    } finally {
      setIsSavingStudent(false);
    }
  };

  const handleAddStudent = async () => {
    if (!studentNumber.trim()) return;

    const studentData = {
      rollNumber: parseInt(studentNumber),
      studentName: 'ନୂତନ ଶିକ୍ଷାର୍ଥୀ',
      class: selectedClass,
      school: selectedSchool,
      udiseCode: selectedUdiseCode,
      academicSession: '2025-2026',
      district: selectedDistrict,
      districtCode: selectedDistrictCode,
      block: selectedBlock,
      blockCode: selectedBlockCode,
      cluster: selectedCluster,
      clusterCode: selectedClusterCode,
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

  useEffect(() => {
    if (recording) {
      setTimeLeft(30);
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            stopRecording();
            return 30;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [recording]);

  const callSpeechToTextAPI = async audioPath => {
    try {
      setIsLoading(true);
      const filePath = audioPath;
      if (!filePath) {
        throw new Error('No audio file path found');
      }
      const fileUri = filePath.startsWith('file://')
        ? filePath
        : `file://${filePath}`;
      const formData = new FormData();
      formData.append('model', 'saarika:v2.5');
      formData.append('language_code', 'od-IN');

      formData.append('file', {
        uri: fileUri,
        type: 'audio/wav',
        name: 'rec1.wav',
      });

      const response = await fetch('https://api.sarvam.ai/speech-to-text', {
        method: 'POST',
        headers: {
          'api-subscription-key': 'sk_kqm4cwc1_jPJyRWTn0vqtvrW5uTqzEsJ8',
        },
        body: formData,
      });

      if (!response.ok) {
        setIsLoading(false);
        const text = await response.text();
        throw new Error(`API error ${response.status}: ${text}`);
      }

      const result = await response.json();
      console.log('Transcription response:', result);

      if (result.transcript) {
        const transcriptWords = result.transcript
          .split(' ')
          .filter(w => w.trim() !== '');

        console.log('Transcript words:', transcriptWords);
        console.log('Grade 1 words:', grade1Data.words);

        const newWordStatus = {};

        grade1Data.words.forEach((originalWord, index) => {
          const cleanOriginalWord = originalWord
            .replace(/[.,;:!?।]/g, '')
            .toLowerCase();

          let bestMatchScore = 0;

          transcriptWords.forEach(transcriptWord => {
            const cleanTranscriptWord = transcriptWord
              .replace(/[.,;:!?।]/g, '')
              .toLowerCase();

            const matchingChars = cleanOriginalWord
              .split('')
              .filter((char, charIndex) => {
                return cleanTranscriptWord[charIndex] === char;
              }).length;

            const matchPercentage = matchingChars / cleanOriginalWord.length;

            if (matchPercentage > bestMatchScore) {
              bestMatchScore = matchPercentage;
            }

            if (
              cleanOriginalWord.includes(cleanTranscriptWord) ||
              cleanTranscriptWord.includes(cleanOriginalWord)
            ) {
              const overlapLength = Math.min(
                cleanOriginalWord.length,
                cleanTranscriptWord.length,
              );
              const totalLength = Math.max(
                cleanOriginalWord.length,
                cleanTranscriptWord.length,
              );
              const overlapPercentage = overlapLength / totalLength;

              if (overlapPercentage > bestMatchScore) {
                bestMatchScore = overlapPercentage;
              }
            }
          });

          const fullTextMatch = result.transcript
            .replace(/[.,;:!?।]/g, '')
            .toLowerCase()
            .includes(cleanOriginalWord);

          if (fullTextMatch) {
            bestMatchScore = Math.max(bestMatchScore, 0.8);
          }

          if (bestMatchScore > 0.5) {
            newWordStatus[index] = 'correct';
            console.log(
              `✓ Word "${originalWord}" marked as correct (${Math.round(
                bestMatchScore * 100,
              )}% match)`,
            );
          } else {
            newWordStatus[index] = 'wrong';
            console.log(
              `✗ Word "${originalWord}" marked as wrong (${Math.round(
                bestMatchScore * 100,
              )}% match)`,
            );
          }
        });

        setWordStatus(newWordStatus);

        const correctCount = Object.values(newWordStatus).filter(
          status => status === 'correct',
        ).length;
        console.log(
          `📊 Results: ${correctCount}/${grade1Data.words.length} words correct`,
        );
      }
    } catch (error) {
      console.error('Speech-to-text API error:', error);
      Alert.alert('Error', 'Failed to process audio. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

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

      // ensure we only create ONE init promise and reuse it
      if (!audioInitPromise) {
        audioInitPromise = (async () => {
          await AudioRecord.init({
            sampleRate: 16000,
            channels: 1,
            bitsPerSample: 16,
            wavFile: 'recorded_audio.wav',
          });
          // tiny delay to let native side settle
          await new Promise(r => setTimeout(r, 300));
        })();
        setAudioInitialized(true);
      }

      // ✅ wait for init to complete before starting
      await audioInitPromise;

      setRecording(true);
      setTimeLeft(30);
      setCurrentWordIndex(-1);
      setWordStatus({});

      try {
        await AudioRecord.start();
        console.log('AudioRecord.start succeeded');
      } catch (err) {
        // first-run native race guard: retry once after a short delay
        console.warn('Start failed, retrying once...', err);
        await new Promise(r => setTimeout(r, 500));
        await AudioRecord.start();
        console.log('AudioRecord.start retry succeeded');
      }
    } catch (error) {
      console.error('Failed to start recording:', error);
      setRecording(false);
      Alert.alert(
        'Recording Error',
        'Failed to start recording. Please try again.',
      );
    }
  };

  const stopRecording = async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    try {
      setIsLoading(true);
      const audioFile = await AudioRecord.stop();
      setFilePath(audioFile);
      setRecording(false);
      setTimeLeft(30);

      // Just save locally, don't auto-upload
      console.log('Recording saved locally:', audioFile);

      Alert.alert(
        'Recording Saved Locally',
        'Recording completed. Click "Save to Server" to upload it to the cloud.',
        [{ text: 'OK' }],
      );
    } catch (error) {
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

  const generateUniqueFileName = () => {
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(7);
    return `assessment_${selectedStudentRoll}_${selectedClass}_${timestamp}_${randomId}.wav`;
  };

  // School Info Selection Component
  const renderSchoolInfoSelection = () => (
    <View style={styles.fullContainer}>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
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
          </View>

          <View style={styles.formGroup}>
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
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>ଶ୍ରେଣୀ </Text>
            <View style={styles.pickerContainer}>
              {isLoadingData && selectedSchool && !selectedClass ? (
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
                    }
                    if (itemValue && selectedSchool) {
                      await fetchStudents(itemValue, selectedSchool);
                    }
                  }}
                  enabled={!!selectedSchool && classes.length > 0}
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
              ଶିକ୍ଷାର୍ଥୀ ଚୟନ କରନ୍ତୁ{' '}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => setIsAddModalVisible(true)}
          style={styles.addStudentButton}
        >
          <MaterialIcons name="add" size={20} color="#c02222ff" />
          <Text style={styles.addStudentText}>ଶିକ୍ଷାର୍ଥୀ ଯୋଡ଼ନ୍ତୁ</Text>
        </TouchableOpacity>

        <Modal
          visible={isAddModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => !isSavingStudent && setIsAddModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>
                ଶିକ୍ଷାର୍ଥୀ ର ରୋଲ୍ ନମ୍ୱର ଦିଅନ୍ତୁ
              </Text>

              <TextInput
                value={studentNumber}
                onChangeText={setStudentNumber}
                keyboardType="numeric"
                placeholder="ଉଦାହରଣ: 25"
                style={styles.modalInput}
                editable={!isSavingStudent}
              />

              {isSavingStudent ? (
                <ActivityIndicator size="small" color="#fe9c3b" />
              ) : (
                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    onPress={() => {
                      setIsAddModalVisible(false);
                      setStudentNumber('');
                    }}
                    style={styles.modalCancelButton}
                  >
                    <Text style={styles.modalCancelButtonText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleAddStudent}
                    disabled={!studentNumber.trim()}
                    style={[
                      styles.modalOkButton,
                      !studentNumber.trim() && styles.disabledButton,
                    ]}
                  >
                    <Text style={styles.modalOkButtonText}>OK</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </Modal>

        <View style={styles.contentContainer}>
          {isLoadingData || isSavingStudent ? (
            <ActivityIndicator
              size="large"
              color="#4a6fa5"
              style={styles.loader}
            />
          ) : (
            <FlatList
              data={students}
              keyExtractor={item => item.id}
              renderItem={({ item }) => {
                const isCompleted = completedStudents.includes(
                  item.rollNumber?.toString(),
                );
                const isSelected = selectedStudentRoll === item.rollNumber;

                return (
                  <TouchableOpacity
                    style={[
                      styles.studentItem,
                      isSelected && styles.selectedStudentItem,
                      isCompleted && styles.completedStudentItem,
                    ]}
                    onPress={() => {
                      if (!isCompleted) {
                        setSelectedStudentRoll(item.rollNumber);
                        setSelectedStudentId(item.studentId);
                        setSelectedStudent(item.studentName);
                      }
                    }}
                    disabled={isCompleted}
                  >
                    <View style={styles.studentInfoContainer}>
                      <Text style={styles.studentRoll}>
                        Roll No: {item.rollNumber} - {item.studentName}
                      </Text>
                      {isCompleted && (
                        <Text style={styles.completedBadge}>Completed</Text>
                      )}
                    </View>

                    {isSelected && !isCompleted && (
                      <MaterialIcons
                        name="check-circle"
                        size={24}
                        color="#4CAF50"
                      />
                    )}

                    {isCompleted && (
                      <MaterialIcons
                        name="check-circle"
                        size={24}
                        color="#757575"
                      />
                    )}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <Text style={styles.noStudentsText}>
                  ଏହି ଶ୍ରେଣୀରେ କୌଣସି ଶିକ୍ଷାର୍ଥୀ ଉପଲବ୍ଧ ନାହାନ୍ତି ।
                </Text>
              }
            />
          )}

          <View style={styles.footer}>
            <TouchableOpacity
              style={[
                styles.assessmentButton,
                (!selectedStudentRoll || isLoadingData) &&
                  styles.disabledButton,
              ]}
              onPress={() => {
                handleStartAssessment();
                setCurrentSection('assessment');
              }}
              disabled={!selectedStudentRoll || isLoadingData}
            >
              <Text style={styles.assessmentButtonText}>
                {selectedClass
                  ? `ମୂଲ୍ୟାୟନ ଆରମ୍ଭ କରନ୍ତୁ`
                  : 'ମୂଲ୍ୟାୟନ ଆରମ୍ଭ କରନ୍ତୁ'}
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
  };

  // Voice Assessment Component
  const renderVoiceAssessment = () => {
    return (
      <View style={styles.fullContainer}>
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => {
                Alert.alert(
                  'Go Back',
                  'Are you sure you want to go back to student selection? Unsaved recording will be lost.',
                  [
                    {
                      text: 'Cancel',
                      onPress: () => null,
                      style: 'cancel',
                    },
                    {
                      text: 'YES',
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
          showsVerticalScrollIndicator={true}
        >
          <View style={styles.assessmentContent}>
            {/* Instructions Card */}
            <View style={styles.instructionCard}>
              <View style={styles.instructionHeader}>
                <MaterialIcons name="info" size={20} color="#0984e3" />
                <Text style={styles.instructionTitle}>Instructions</Text>
              </View>
              <Text style={styles.instructionText}>
                1. Click "Start Recording" to begin{'\n'}
                2. Read all the words aloud clearly{'\n'}
                3. You have 30 seconds to complete{'\n'}
                4. Click "Save to Server" to upload recording
              </Text>
            </View>

            {/* Timer Display */}
            <View style={styles.timerContainer}>
              <View
                style={[
                  styles.timerCircle,
                  { borderColor: recording ? '#FF6B6B' : '#4ECDC4' },
                ]}
              >
                <Text style={styles.timerText}>{formatTime(timeLeft)}</Text>
                <Text style={styles.timerLabel}>
                  {recording ? 'Recording...' : 'Ready'}
                </Text>
              </View>

              {/* Recording Status */}
              {recording && (
                <View style={styles.recordingStatus}>
                  <View style={styles.recordingDot} />
                  <Text style={styles.recordingText}>LIVE</Text>
                </View>
              )}
            </View>

            {/* Words Grid in Boxes */}
            <View style={styles.wordsSection}>
              <Text style={styles.sectionTitle}>Read these words aloud:</Text>
              <View style={styles.wordsGrid}>
                {grade1Data.words.map((word, index) => (
                  <View
                    key={index}
                    style={[
                      styles.wordBox,
                      currentWordIndex === index && styles.activeWordBox,
                      wordStatus[index] === 'correct' && styles.correctWordBox,
                      wordStatus[index] === 'wrong' && styles.wrongWordBox,
                    ]}
                  >
                    <Text
                      style={[
                        styles.wordText,
                        currentWordIndex === index && styles.activeWordText,
                      ]}
                    >
                      {word.replace(/[।,.]/g, '')}
                    </Text>
                    {wordStatus[index] && (
                      <View style={styles.statusIndicator}>
                        <MaterialIcons
                          name={
                            wordStatus[index] === 'correct' ? 'check' : 'close'
                          }
                          size={12}
                          color={
                            wordStatus[index] === 'correct'
                              ? '#00b894'
                              : '#e17055'
                          }
                        />
                      </View>
                    )}
                  </View>
                ))}
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
                  isLoading && styles.disabledButton,
                ]}
                disabled={isLoading}
              >
                <View style={styles.buttonContent}>
                  <MaterialIcons
                    name={recording ? 'stop-circle' : 'mic'}
                    size={28}
                    color="white"
                  />
                  <View style={styles.buttonTextContainer}>
                    <Text style={styles.buttonMainText}>
                      {recording ? 'Stop Recording' : 'Start Recording'}
                    </Text>
                    <Text style={styles.buttonSubText}>
                      {recording ? `${timeLeft}s remaining` : '30 seconds max'}
                    </Text>
                  </View>
                </View>
                {recording && (
                  <View style={styles.recordingAnimation}>
                    <View style={[styles.pulseDot, styles.pulse1]} />
                    <View style={[styles.pulseDot, styles.pulse2]} />
                    <View style={[styles.pulseDot, styles.pulse3]} />
                  </View>
                )}
              </TouchableOpacity>

              {/* Save Button - Only enabled when recording is complete */}
              <TouchableOpacity
                onPress={handleManualSave}
                style={[
                  styles.primaryButton,
                  styles.saveButton,
                  (!filePath || recording || playing || isLoading) &&
                    styles.disabledButton,
                ]}
                disabled={!filePath || recording || playing || isLoading}
              >
                <View style={styles.buttonContent}>
                  <MaterialIcons name="cloud-upload" size={24} color="white" />
                  <View style={styles.buttonTextContainer}>
                    <Text style={styles.buttonMainText}>
                      {isLoading ? 'Saving...' : 'Save to Server'}
                    </Text>
                    <Text style={styles.buttonSubText}>
                      Upload recording to cloud
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>

              {/* Playback Controls - Only show if recording exists */}
              {filePath && !recording && (
                <View style={styles.playbackControls}>
                  <TouchableOpacity
                    onPress={playAudio}
                    style={[styles.secondaryButton, styles.playButton]}
                    disabled={playing || isLoading}
                  >
                    <MaterialIcons
                      name={playing ? 'pause' : 'play-arrow'}
                      size={20}
                      color="white"
                    />
                    <Text style={styles.secondaryButtonText}>
                      {playing ? 'Pause' : 'Playback'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={stopAudio}
                    style={[styles.secondaryButton, styles.stopButton]}
                    disabled={isLoading}
                  >
                    <MaterialIcons name="stop" size={20} color="white" />
                    <Text style={styles.secondaryButtonText}>Stop</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Upload Status */}
              {isLoading && (
                <View style={styles.uploadStatus}>
                  <ActivityIndicator size="small" color="#4ECDC4" />
                  <Text style={styles.uploadStatusText}>
                    {uploadStatus === 'uploading'
                      ? 'Uploading recording...'
                      : 'Processing...'}
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
                    Recording uploaded successfully!
                  </Text>
                </View>
              )}

              {/* Navigation Buttons */}
              <View style={styles.navigationButtons}>
                <TouchableOpacity
                  onPress={() => {
                    Alert.alert(
                      'Go Back',
                      'Are you sure you want to go back? Unsaved recording will be lost.',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'YES',
                          onPress: () => setCurrentSection('studentSelection'),
                        },
                      ],
                    );
                  }}
                  style={[styles.navButton, styles.cancelNavButton]}
                >
                  <Text style={styles.cancelNavButtonText}>
                    Back to Students
                  </Text>
                </TouchableOpacity>

                {uploadStatus === 'success' && (
                  <TouchableOpacity
                    onPress={() => {
                      // Mark student as completed
                      setCompletedStudents(prev => [
                        ...prev,
                        selectedStudentRoll.toString(),
                      ]);
                      setCurrentSection('studentSelection');
                    }}
                    style={[styles.navButton, styles.completeNavButton]}
                  >
                    <Text style={styles.completeNavButtonText}>
                      Complete Assessment
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Progress Indicator */}
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${
                        (Object.keys(wordStatus).length /
                          grade1Data.words.length) *
                        100
                      }%`,
                    },
                  ]}
                />
              </View>
              <Text style={styles.progressText}>
                Words analyzed: {Object.keys(wordStatus).length}/
                {grade1Data.words.length}
              </Text>
            </View>
          </View>
        </ScrollView>
      </View>
    );
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

        // Mark student as completed
        setCompletedStudents(prev => [...prev, selectedStudentRoll.toString()]);

        Alert.alert('Success', 'Recording saved and uploaded successfully!', [
          {
            text: 'OK',
            onPress: () => {
              // Navigate back to student selection WITHOUT clearing form data
              setCurrentSection('studentSelection');
              // Clear only assessment-related states
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
    marginTop: 5,
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
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    width: '80%',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
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
});

export default AssessmentFlow;
