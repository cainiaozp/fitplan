import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase';

export const uploadFoodPhoto = async (
  uid: string,
  date: string,
  photoUri: string
): Promise<string> => {
  const response = await fetch(photoUri);
  const blob = await response.blob();
  const path = `photos/${uid}/${date}/${Date.now()}.jpg`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, blob);
  return getDownloadURL(storageRef);
};
