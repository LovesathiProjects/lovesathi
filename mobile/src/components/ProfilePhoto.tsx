import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, ViewStyle } from 'react-native';
import { colors, radius } from '../theme';

type ProfilePhotoProps = {
  initials: string;
  size?: number;
  style?: ViewStyle;
};

export function ProfilePhoto({ initials, size = 74, style }: ProfilePhotoProps) {
  return (
    <LinearGradient
      colors={[colors.champagneSoft, colors.taupe, colors.ink]}
      style={[
        styles.photo,
        { width: size, height: size, borderRadius: size / 2 },
        style,
      ]}
    >
      <Text style={[styles.initials, { fontSize: Math.max(18, size * 0.34) }]}>
        {initials}
      </Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  photo: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.line,
  },
  initials: {
    color: colors.white,
    fontFamily: 'Georgia',
    fontWeight: '700',
  },
});
