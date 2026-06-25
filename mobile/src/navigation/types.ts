export type AuthStackParamList = {
  Auth: undefined;
};

export type VerifyStackParamList = {
  VerifyEmail: undefined;
};

export type OnboardingStackParamList = {
  Verification: undefined;
  MatrimonySetup: undefined;
};

export type MainTabParamList = {
  Discover: undefined;
  Shortlist: undefined;
  Chat: { matchId?: string } | undefined;
  Activity: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  AuthStack: undefined;
  VerifyStack: undefined;
  OnboardingStack: undefined;
  MainTabs: undefined;
};
