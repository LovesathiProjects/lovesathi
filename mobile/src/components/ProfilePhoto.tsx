import { useEffect, useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { Image, StyleSheet, Text, ViewStyle } from 'react-native';
import { colors, radius } from '../theme';

type ProfilePhotoProps = {
  initials: string;
  size?: number;
  style?: ViewStyle;
  uri?: string;
};

export function ProfilePhoto({ initials, size = 74, style, uri }: ProfilePhotoProps) {
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [uri]);

  if (uri && !imageFailed) {
    return (
      <Image
        source={{ uri }}
        resizeMode="cover"
        onError={() => setImageFailed(true)}
        style={[
          styles.photo,
          { width: size, height: size, borderRadius: size / 2 },
          style as any,
        ]}
      />
    );
  }

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
