import React, { useState, useEffect } from 'react';
import { StyleSheet, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { Text, View } from '@/components/Themed';
import { authService } from '../../services/authService';
import { companyService } from '../../services/companyService';
import { User } from '../../types/auth';
import { Company } from '../../types/company';

export default function HomeScreen() {
  const [user, setUser] = useState<User | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const userResponse = await authService.getCurrentUser();
      if (userResponse.success && userResponse.data) {
        setUser(userResponse.data.user);

        // Load company info
        const companyResponse = await companyService.getCurrentCompany();
        if (companyResponse.success && companyResponse.data) {
          setCompany(companyResponse.data);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#1890ff" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>欢迎回来</Text>
        <Text style={styles.subtitle}>
          {user?.realName || user?.username || '用户'}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>个人信息</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>用户名:</Text>
          <Text style={styles.infoValue}>{user?.username}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>邮箱:</Text>
          <Text style={styles.infoValue}>{user?.email}</Text>
        </View>
        {user?.phone && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>手机:</Text>
            <Text style={styles.infoValue}>{user.phone}</Text>
          </View>
        )}
      </View>

      {company && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>当前企业</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>企业名称:</Text>
            <Text style={styles.infoValue}>{company.name}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>企业代码:</Text>
            <Text style={styles.infoValue}>{company.code}</Text>
          </View>
          {company.description && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>描述:</Text>
              <Text style={styles.infoValue}>{company.description}</Text>
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentContainer: {
    padding: 20,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    opacity: 0.7,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  infoRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    flex: 1,
    fontSize: 14,
    color: '#666',
  },
  infoValue: {
    flex: 2,
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
});
