import { supabase } from './supabase';

export type UploadFile = {
  uri: string;
  name: string;
  mimeType: string;
  size?: number;
};

async function readFileBytes(file: UploadFile) {
  const response = await fetch(file.uri);
  return response.arrayBuffer();
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

  const fileExt = file.name.split('.').pop() || 'jpg';
  const fileName = `${user.id}/${objectPrefix}-${Date.now()}.${fileExt}`;
  const bytes = await readFileBytes(file);

  const { data, error } = await supabase.storage.from(bucket).upload(fileName, bytes, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.mimeType,
  });

  if (error) {
    throw new Error(`Storage upload failed: ${error.message}`);
  }

  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path);

  return {
    path: data.path,
    url: urlData.publicUrl,
    fileName: file.name,
    fileSize: file.size ?? bytes.byteLength,
  };
}

export async function uploadMatrimonyPhoto(file: UploadFile) {
  const uploaded = await uploadToStorageBucket('matrimony-photos', file, 'photo');
  return uploaded.url;
}
