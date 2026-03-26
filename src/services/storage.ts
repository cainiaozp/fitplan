import {
  documentDirectory,
  makeDirectoryAsync,
  getInfoAsync,
  copyAsync,
} from 'expo-file-system/legacy';

const PHOTOS_DIR = documentDirectory + 'photos/';

/** Ensure photos directory exists */
const ensureDir = async () => {
  const info = await getInfoAsync(PHOTOS_DIR);
  if (!info.exists) {
    await makeDirectoryAsync(PHOTOS_DIR, { intermediates: true });
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
  const filename = `${uid}_${date}_${Math.random().toString(36).slice(2)}.jpg`;
  const dest = PHOTOS_DIR + filename;
  await copyAsync({ from: photoUri, to: dest });
  return dest;
};
