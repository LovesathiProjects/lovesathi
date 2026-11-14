import { supabase } from './supabase';
import { File } from 'expo-file-system';
import { randomUUID } from 'expo-crypto';
import { Platform } from 'react-native';

export type UploadFile = {
  uri: string;
  name: string;
  mimeType: string;
  size?: number;
};

async function readFileBytes(file: UploadFile) {
  if (Platform.OS === 'web') {
    const response = await fetch(file.uri);
    if (!response.ok) throw new Error('Could not read this file. Please select it again.');
    return response.arrayBuffer();
  }
  // Native fetch is not a reliable file/content URI reader on Android.
  return new File(file.uri).arrayBuffer();
}

export async function uploadToStorageBucket(
  bucket: string,
  file: UploadFile,
  objectPrefix: string,
) {
  if (!supabase) {
    throw new Error('Supabase is not configured.');
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('User not authenticated');
  }

  const fileExt = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  const fileName = `${user.id}/${objectPrefix}-${randomUUID()}.${fileExt}`;
  const bytes = await readFileBytes(file);
  if (!bytes.byteLength) throw new Error('This file is empty. Please select it again.');
  if (bucket === 'matrimony-photos' && bytes.byteLength > 10 * 1024 * 1024) {
    throw new Error('Each photo must be 10 MB or smaller.');
  }

  const { data, error } = await supabase.storage.from(bucket).upload(fileName, bytes, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.mimeType,
  });

  if (error) {
    throw new Error(`Storage upload failed: ${error.message}`);
  }
  if (!data?.path) throw new Error('The upload did not finish. Please try again.');

  const privateBucket = bucket === 'verification-documents' || bucket === 'face-scans';
  const url = privateBucket
    ? `supabase://${bucket}/${data.path}`
    : supabase.storage.from(bucket).getPublicUrl(data.path).data.publicUrl;

  return {
    path: data.path,
    url,
    fileName: file.name,
    fileSize: file.size ?? bytes.byteLength,
  };
}

export async function uploadMatrimonyPhoto(file: UploadFile) {
  if (!file.mimeType.startsWith('image/')) throw new Error('Please select an image.');
  if (file.size && file.size > 10 * 1024 * 1024) throw new Error('Each photo must be 10 MB or smaller.');
  const uploaded = await uploadToStorageBucket('matrimony-photos', file, 'photo');
  return uploaded.url;
}
