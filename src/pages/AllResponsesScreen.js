// AllResponsesScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  FlatList,
  ActivityIndicator,
  Alert,
  Dimensions,
  Modal,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import axios from 'axios';

const { width } = Dimensions.get('window');

const AllResponsesScreen = ({ navigation }) => {
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedResponse, setSelectedResponse] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  const fetchAllResponses = async () => {
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

      if (response.data && Array.isArray(response.data)) {
        // Filter out empty responses and sort by date
        const filteredResponses = response.data
          .filter(
            item =>
              item.mlResponse &&
              item.mlResponse.length > 1 &&
              !(
                item.mlResponse.length === 1 &&
                item.mlResponse[0]['ଦକ୍ଷତା'] === ':---'
              ),
          )
          .sort((a, b) => {
            const dateA = new Date(a._meta?.inserted_at || 0);
            const dateB = new Date(b._meta?.inserted_at || 0);
            return dateB - dateA;
          });

        setResponses(filteredResponses);
      } else {
        setResponses([]);
      }
    } catch (error) {
      console.error('Error fetching responses:', error);
      Alert.alert('Error', 'Failed to fetch responses. Please try again.');
      setResponses([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAllResponses();
  }, []);

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

  const calculateSummary = mlResponse => {
    if (!mlResponse) return { total: 0, plus: 0, triangle: 0, star: 0 };

    let total = 0;
    let plus = 0;
    let triangle = 0;
    let star = 0;

    mlResponse.forEach(row => {
      // Check if this is a data row (not header row)
      if (
        row['ସୂଚକାଙ୍କ'] &&
        row['ସୂଚକାଙ୍କ'] !== ':---' &&
        row['ସୂଚକାଙ୍କ'] !== ''
      ) {
        for (let i = 1; i <= 30; i++) {
          const key = i.toString().split('').join('');
          const value = row[key];
          if (value === '+') plus++;
          if (value === '▲') triangle++;
          if (value === '*') star++;
          if (value && value !== ':---' && value !== '') total++;
        }
      }
    });

    return { total, plus, triangle, star };
  };

  const renderSymbol = symbol => {
    console.log('symbol------->', symbol);
    if (!symbol || symbol === ':---' || symbol === '') {
      return <Text style={styles.emptySymbol}>-</Text>;
    }

    switch (symbol) {
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

  const renderResponseItem = ({ item }) => {
    const summary = calculateSummary(item.mlResponse);
    const date = formatDate(
      item._meta?.inserted_at || new Date().toISOString(),
    );
    const validRows = item.mlResponse.filter(
      row =>
        row['ସୂଚକାଙ୍କ'] && row['ସୂଚକାଙ୍କ'] !== ':---' && row['ସୂଚକାଙ୍କ'] !== '',
    );

    return (
      <TouchableOpacity
        style={styles.responseItem}
        onPress={() => {
          setSelectedResponse(item);
          setShowDetails(true);
        }}
      >
        <View style={styles.responseHeader}>
          <View style={styles.responseIcon}>
            <Icon name="image" size={24} color="#5856D6" />
          </View>
          <View style={styles.responseInfo}>
            <Text style={styles.responseImgId}>{item.imgId}</Text>
            <Text style={styles.responseDate}>{date}</Text>
            <Text style={styles.rowCount}>{validRows.length} indicators</Text>
          </View>
        </View>

        <View style={styles.responseStats}>
          {/* <View style={styles.statItem}>
            <Text style={styles.statNumber}>{summary.total}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View> */}
          {/* <View style={styles.statDivider} /> */}
          {/* <View style={styles.statItem}>
            <View style={styles.symbolCountRow}>
              <View
                style={[styles.symbol, styles.plusSymbol, styles.smallSymbol]}
              >
                <Text style={styles.symbolText}>+</Text>
              </View>
              <Text style={[styles.statNumber, { color: '#34C759' }]}>
                {summary.plus}
              </Text>
            </View>
            <Text style={styles.statLabel}>Excellent</Text>
          </View> */}
          {/* <View style={styles.statDivider} /> */}
          {/* <View style={styles.statItem}>
            <View style={styles.symbolCountRow}>
              <View
                style={[
                  styles.symbol,
                  styles.triangleSymbol,
                  styles.smallSymbol,
                ]}
              >
                <Text style={styles.symbolText}>▲</Text>
              </View>
              <Text style={[styles.statNumber, { color: '#FF9500' }]}>
                {summary.triangle}
              </Text>
            </View>
            <Text style={styles.statLabel}>Good</Text>
          </View> */}
          {/* <View style={styles.statDivider} /> */}
          {/* <View style={styles.statItem}>
            <View style={styles.symbolCountRow}>
              <View
                style={[styles.symbol, styles.starSymbol, styles.smallSymbol]}
              >
                <Text style={styles.symbolText}>*</Text>
              </View>
              <Text style={[styles.statNumber, { color: '#FF3B30' }]}>
                {summary.star}
              </Text>
            </View>
            <Text style={styles.statLabel}>Needs Improve</Text>
          </View> */}
        </View>

        <TouchableOpacity
          style={styles.viewDetailsButton}
          onPress={() => {
            setSelectedResponse(item);
            setShowDetails(true);
          }}
        >
          <Text style={styles.viewDetailsText}>View Full Table</Text>
          <Icon name="chevron-right" size={20} color="#5856D6" />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const renderResponseDetailsModal = () => {
    if (!selectedResponse) return null;

    const validRows = selectedResponse.mlResponse.filter(
      row =>
        row['ସୂଚକାଙ୍କ'] && row['ସୂଚକାଙ୍କ'] !== ':---' && row['ସୂଚକାଙ୍କ'] !== '',
    );

    return (
      <Modal
        visible={showDetails}
        animationType="slide"
        onRequestClose={() => setShowDetails(false)}
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleContainer}>
                <Icon name="table-chart" size={24} color="#5856D6" />
                <Text style={styles.modalTitle}>Assessment Data Table</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowDetails(false)}
                style={styles.modalCloseButton}
              >
                <Icon name="close" size={24} color="#1C1C1E" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.responseInfoHeader}>
                <Text style={styles.responseId}>{selectedResponse.imgId}</Text>
                <Text style={styles.responseDate}>
                  {formatDate(selectedResponse._meta?.inserted_at)}
                </Text>
              </View>

              <View style={styles.tableWrapper}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={true}
                  style={styles.horizontalScroll}
                >
                  <View>
                    {/* Table Header */}
                    <View style={styles.tableHeaderRow}>
                      <View
                        style={[
                          styles.tableHeaderCell,
                          styles.indicatorHeaderCell,
                        ]}
                      >
                        <Text style={styles.tableHeaderText}>
                          ସୂଚକାଙ୍କ (Indicator)
                        </Text>
                      </View>
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
                        <View key={index} style={styles.tableHeaderCell}>
                          <Text style={styles.tableHeaderText}>{odiaNum}</Text>
                        </View>
                      ))}
                    </View>

                    {/* Table Rows */}
                    {validRows.map((row, rowIndex) => (
                      <View key={rowIndex} style={styles.tableDataRow}>
                        <View
                          style={[
                            styles.tableDataCell,
                            styles.indicatorDataCell,
                          ]}
                        >
                          <Text style={styles.indicatorText} numberOfLines={2}>
                            {row['ସୂଚକାଙ୍କ']}
                          </Text>
                        </View>
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
                            <View
                              key={`${rowIndex}-${colIndex}`}
                              style={styles.tableDataCell}
                            >
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
                style={styles.closeModalButton}
                onPress={() => setShowDetails(false)}
              >
                <Text style={styles.closeModalText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#5856D6" />
          <Text style={styles.loadingText}>Loading responses...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color="#1C1C1E" />
        </TouchableOpacity>
        <Text style={styles.title}>All Responses</Text>
        <TouchableOpacity
          onPress={() => {
            setRefreshing(true);
            fetchAllResponses();
          }}
          style={styles.refreshButton}
        >
          <Icon name="refresh" size={24} color="#5856D6" />
        </TouchableOpacity>
      </View>

      {responses.length === 0 ? (
        <View style={styles.centerContainer}>
          <Icon name="folder-open" size={60} color="#8E8E93" />
          <Text style={styles.emptyText}>No responses found</Text>
          <Text style={styles.emptySubtext}>
            Process some images to see responses here
          </Text>
          <TouchableOpacity
            style={styles.uploadButton}
            onPress={() => navigation.navigate('ImageCapture')}
          >
            <Text style={styles.uploadButtonText}>Upload Image</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={responses}
          renderItem={renderResponseItem}
          keyExtractor={item => item.imgId}
          contentContainerStyle={styles.listContainer}
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            fetchAllResponses();
          }}
        />
      )}

      {renderResponseDetailsModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
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
  refreshButton: {
    padding: 8,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: '#8E8E93',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#8E8E93',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 24,
  },
  uploadButton: {
    backgroundColor: '#5856D6',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  uploadButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  listContainer: {
    padding: 20,
  },
  responseItem: {
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
  responseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  responseIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#5856D610',
    justifyContent: 'center',
    alignItems: 'center',
  },
  responseInfo: {
    flex: 1,
  },
  responseImgId: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  responseDate: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 4,
  },
  rowCount: {
    fontSize: 12,
    color: '#5856D6',
    fontWeight: '500',
  },
  responseStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#8E8E93',
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#E5E5EA',
  },
  symbolCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  symbol: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  smallSymbol: {
    width: 16,
    height: 16,
    borderRadius: 8,
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
  viewDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 16,
  },
  viewDetailsText: {
    color: '#5856D6',
    fontSize: 14,
    fontWeight: '600',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    width: '100%',
    maxHeight: '90%',
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
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  modalTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  modalCloseButton: {
    padding: 8,
  },
  modalBody: {
    padding: 16,
  },
  responseInfoHeader: {
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  responseId: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  tableWrapper: {
    maxHeight: 400,
    marginBottom: 20,
  },
  horizontalScroll: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 8,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#5856D6',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    overflow: 'hidden',
  },
  tableHeaderCell: {
    width: 50,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 4,
  },
  indicatorHeaderCell: {
    width: 200,
    alignItems: 'flex-start',
    paddingLeft: 12,
  },
  tableHeaderText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
  tableDataRow: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  tableDataCell: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#F2F2F7',
    paddingHorizontal: 4,
  },
  indicatorDataCell: {
    width: 200,
    alignItems: 'flex-start',
    paddingLeft: 12,
    backgroundColor: '#F8F9FA',
  },
  indicatorText: {
    fontSize: 10,
    color: '#1C1C1E',
    lineHeight: 14,
  },
  closeModalButton: {
    backgroundColor: '#5856D6',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  closeModalText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default AllResponsesScreen;
