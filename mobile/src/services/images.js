import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

const MAX_DATA_URL_LENGTH = 850000;
const COMPRESSION_STEPS = [
  { width: 1600, compress: 0.7 },
  { width: 1280, compress: 0.6 },
  { width: 960, compress: 0.5 },
  { width: 720, compress: 0.4 },
];

export async function prepareForumImage(uri) {
  for (const step of COMPRESSION_STEPS) {
    const result = await manipulateAsync(
      uri,
      [{ resize: { width: step.width } }],
      { base64: true, compress: step.compress, format: SaveFormat.JPEG },
    );
    const dataUrl = `data:image/jpeg;base64,${result.base64}`;
    if (dataUrl.length <= MAX_DATA_URL_LENGTH) {
      return { uri: result.uri, dataUrl };
    }
  }

  throw new Error('La fotografía es demasiado pesada. Intenta con otra imagen.');
}
