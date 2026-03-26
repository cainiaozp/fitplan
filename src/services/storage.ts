import * as FileSystem from 'expo-file-system';

const PHOTOS_DIR = FileSystem.documentDirectory + 'photos/';

/** Ensure photos directory exists */
const ensureDir = async () => {
  const info = await FileSystem.getInfoAsync(PHOTOS_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(PHOTOS_DIR, { intermediates: true });
  }
};

/**
 * Save a food photo locally.
 * Returns a file:// URI that can be used as photoUrl.
 */
export const uploadFoodPhoto = async (
  uid: string,
  date: string,
  photoUri: string
): Promise<string> => {
  await ensureDir();
  const filename = \`\${uid}_\${date}_\${Math.random().toString(36).slice(2)}.jpg\`;
  const dest = PHOTOS_DIR + filename;
  await FileSystem.copyAsync({ from: photoUri, to: dest });
  return dest;
};
