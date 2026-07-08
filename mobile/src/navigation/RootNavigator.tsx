import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, Image, StyleSheet, View } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { AuthScreen } from '../screens/AuthScreen';
import { VerifyEmailScreen } from '../screens/VerifyEmailScreen';
import { colors, spacing } from '../theme';
import { MainTabs } from './MainTabs';
import { OnboardingStackScreen } from './OnboardingStack';
import type {
  AuthStackParamList,
  RootStackParamList,
  VerifyStackParamList,
} from './types';

const RootStack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const VerifyStack = createNativeStackNavigator<VerifyStackParamList>();
const logoImage = require('../../assets/lovesathi-logo.png');

function AuthStackScreen() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Auth" component={AuthScreen} />
    </AuthStack.Navigator>
  );
}

function VerifyStackScreen() {
  return (
    <VerifyStack.Navigator screenOptions={{ headerShown: false }}>
      <VerifyStack.Screen name="VerifyEmail" component={VerifyEmailScreen} />
    </VerifyStack.Navigator>
  );
}

function LoadingScreen() {
  return (
    <View style={styles.loading}>
      <Image source={logoImage} resizeMode="contain" style={styles.logo} />
      <ActivityIndicator color={colors.rose} size="large" style={styles.spinner} />
    </View>
  );
}

export function RootNavigator() {
  const { appFlow } = useAuth();

  if (appFlow === 'loading') {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {appFlow === 'auth' && (
          <RootStack.Screen name="AuthStack" component={AuthStackScreen} />
        )}
        {appFlow === 'verify-email' && (
          <RootStack.Screen name="VerifyStack" component={VerifyStackScreen} />
        )}
        {appFlow === 'onboarding' && (
          <RootStack.Screen name="OnboardingStack" component={OnboardingStackScreen} />
        )}
        {appFlow === 'main' && (
          <RootStack.Screen name="MainTabs" component={MainTabs} />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.ivory,
  },
  logo: {
    width: 220,
    height: 90,
  },
  spinner: {
    marginTop: spacing.lg,
  },
});
