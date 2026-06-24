import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MatrimonySetupScreen } from '../screens/onboarding/MatrimonySetupScreen';
import { VerificationScreen } from '../screens/onboarding/VerificationScreen';
import type { OnboardingStackParamList } from './types';

const OnboardingStack = createNativeStackNavigator<OnboardingStackParamList>();

export function OnboardingStackScreen() {
  return (
    <OnboardingStack.Navigator screenOptions={{ headerShown: false }}>
      <OnboardingStack.Screen name="Verification">
        {({ navigation }) => (
          <VerificationScreen
            onComplete={() => navigation.navigate('MatrimonySetup')}
            onSkip={() => navigation.navigate('MatrimonySetup')}
          />
        )}
      </OnboardingStack.Screen>
      <OnboardingStack.Screen name="MatrimonySetup" component={MatrimonySetupScreen} />
    </OnboardingStack.Navigator>
  );
}
