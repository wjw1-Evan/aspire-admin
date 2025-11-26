import React, { useState, useEffect } from 'react';
import { StyleSheet, ScrollView, RefreshControl, ActivityIndicator, View as RNView, Text as RNText, Platform } from 'react-native';
import { Text, View } from '@/components/Themed';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { AppStyles, commonStyles } from '../../constants/AppStyles';
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
        setUser(userResponse.data);

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
      <View style={commonStyles.pageContainer}>
        <ActivityIndicator size="large" color={AppStyles.colors.primary} />
      </View>
    );
  }

  return (
    <View style={commonStyles.pageContainer}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <LinearGradient
          colors={AppStyles.gradients.primary}
          style={commonStyles.gradientHeader}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          locations={[0, 0.5, 1]}
        >
          <RNView style={styles.headerContent}>
            <RNView>
              <RNText style={styles.greeting}>欢迎回来</RNText>
              <RNText style={styles.userName}>
                {user?.realName || user?.username || '用户'}
              </RNText>
            </RNView>
            <RNView style={styles.avatarContainer}>
              <RNText style={styles.avatarText}>
                {(user?.realName || user?.username || 'U').charAt(0).toUpperCase()}
              </RNText>
            </RNView>
          </RNView>
        </LinearGradient>
        <View style={styles.contentSection}>
        <View style={commonStyles.card}>
          <View style={commonStyles.cardHeader}>
            <Ionicons name="person-circle-outline" size={24} color={AppStyles.colors.primary} />
            <Text style={commonStyles.cardTitle}>个人信息</Text>
          </View>
          <View style={commonStyles.infoRow}>
            <View style={commonStyles.infoIconContainer}>
              <Ionicons name="person-outline" size={16} color={AppStyles.colors.primary} />
            </View>
            <Text style={commonStyles.infoLabel}>用户名</Text>
            <Text style={commonStyles.infoValue}>{user?.username}</Text>
          </View>
          <View style={commonStyles.infoRow}>
            <View style={commonStyles.infoIconContainer}>
              <Ionicons name="mail-outline" size={16} color={AppStyles.colors.primary} />
            </View>
            <Text style={commonStyles.infoLabel}>邮箱</Text>
            <Text style={commonStyles.infoValue}>{user?.email || '未设置'}</Text>
          </View>
          {user?.phone && (
            <View style={commonStyles.infoRow}>
              <View style={commonStyles.infoIconContainer}>
                <Ionicons name="call-outline" size={16} color={AppStyles.colors.primary} />
              </View>
              <Text style={commonStyles.infoLabel}>手机</Text>
              <Text style={commonStyles.infoValue}>{user.phone}</Text>
            </View>
          )}
        </View>

        {company && (
          <View style={commonStyles.card}>
            <View style={commonStyles.cardHeader}>
              <Ionicons name="business-outline" size={24} color={AppStyles.colors.primary} />
              <Text style={commonStyles.cardTitle}>当前企业</Text>
            </View>
            <View style={commonStyles.infoRow}>
              <View style={commonStyles.infoIconContainer}>
                <Ionicons name="business" size={16} color={AppStyles.colors.primary} />
              </View>
              <Text style={commonStyles.infoLabel}>企业名称</Text>
              <Text style={commonStyles.infoValue}>{company.name}</Text>
            </View>
            <View style={commonStyles.infoRow}>
              <View style={commonStyles.infoIconContainer}>
                <Ionicons name="code-slash-outline" size={16} color={AppStyles.colors.primary} />
              </View>
              <Text style={commonStyles.infoLabel}>企业代码</Text>
              <Text style={commonStyles.infoValue}>{company.code}</Text>
            </View>
            {company.description && (
              <View style={commonStyles.infoRow}>
                <View style={commonStyles.infoIconContainer}>
                  <Ionicons name="document-text-outline" size={16} color={AppStyles.colors.primary} />
                </View>
                <Text style={commonStyles.infoLabel}>描述</Text>
                <Text style={commonStyles.infoValue}>{company.description}</Text>
              </View>
            )}
          </View>
        )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  greeting: {
    fontSize: AppStyles.fontSize.md,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: AppStyles.spacing.xs,
  },
  userName: {
    fontSize: AppStyles.fontSize.xxxl,
    fontWeight: 'bold',
    color: '#fff',
  },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  avatarText: {
    fontSize: AppStyles.fontSize.xl,
    fontWeight: 'bold',
    color: '#fff',
  },
  scrollView: {
    flex: 1,
    width: '100%',
    ...Platform.select({
      web: {
        overflowY: 'auto',
        maxWidth: '100%',
      },
      default: {},
    }),
  },
  contentContainer: {
    flexGrow: 1,
    width: '100%',
    ...Platform.select({
      web: {
        maxWidth: '100%',
      },
      default: {},
    }),
  },
  contentSection: {
    padding: AppStyles.spacing.lg,
    paddingTop: 0,
  },
});
