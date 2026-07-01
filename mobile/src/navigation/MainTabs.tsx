import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Image, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActivityScreen } from '../screens/ActivityScreen';
import { ChatScreen } from '../screens/ChatScreen';
import { DiscoveryScreen } from '../screens/DiscoveryScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { colors, radius, shadow, spacing } from '../theme';
import type { MainTabParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();
const logoImage = require('../../assets/lovesathi-logo.jpeg');

const tabLabels: Record<keyof MainTabParamList, string> = {
  Discover: 'Discover',
  Shortlist: 'Saved',
  Chat: 'Chat',
  Activity: 'Activity',
  Profile: 'Profile',
};

export function MainTabs() {
  return (
    <SafeAreaView style={styles.shell} edges={['top']}>
      <View style={styles.header}>
        <Image source={logoImage} resizeMode="contain" style={styles.logo} />
        <Text style={styles.subtitle}>Premium Matrimony</Text>
      </View>
      <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: colors.white,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabel: tabLabels[route.name],
        tabBarLabelStyle: styles.tabLabel,
        tabBarIcon: ({ focused }) => (
          <View style={[styles.tabDot, focused && styles.tabDotActive]} />
        ),
      })}
    >
      <Tab.Screen name="Discover" component={DiscoveryScreen} />
      <Tab.Screen name="Shortlist">
        {() => <ActivityScreen mode="shortlist" />}
      </Tab.Screen>
      <Tab.Screen name="Chat" component={ChatScreen} />
      <Tab.Screen name="Activity" component={ActivityScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: colors.ivory,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    alignItems: 'center',
  },
  logo: {
    width: 180,
    height: 54,
  },
  subtitle: {
    marginTop: 2,
    color: colors.champagne,
    fontSize: 11,
    letterSpacing: 3,
    textTransform: 'uppercase',
    fontWeight: '800',
  },
  tabBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 18,
    height: 64,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    borderTopWidth: 0,
    borderWidth: 1,
    borderColor: colors.line,
    paddingTop: 8,
    paddingBottom: 8,
    ...shadow,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '800',
  },
  tabDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.line,
    marginBottom: 2,
  },
  tabDotActive: {
    backgroundColor: colors.rose,
  },
});
