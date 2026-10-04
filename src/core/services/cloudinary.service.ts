// Ported from gymtrack-web's StorageService (src/app/core/services/storage.service.ts).
// The DOM `File` object becomes a plain { uri, name, type } descriptor (e.g. from
// expo-image-picker's ImagePickerAsset) — React Native's fetch + FormData otherwise
// behave the same as the web version.
// Not wired into any screen yet (no image upload in the MVP) — kept as a ready-to-use stub.

const CLOUD_NAME = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

export const isCloudinaryConfigured = !!CLOUD_NAME;

export interface UploadableImage {
  uri: string;
  name: string;
  type: string;
}

export async function uploadImage(image: UploadableImage): Promise<string> {
  if (!isCloudinaryConfigured) {
    throw new Error("Cloudinary is not configured for this project yet.");
  }

  const formData = new FormData();
  // React Native's FormData accepts this shape in place of a web File/Blob.
  formData.append("file", { uri: image.uri, name: image.name, type: image.type } as unknown as Blob);
  formData.append("upload_preset", UPLOAD_PRESET as string);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    method: "POST",
    body: formData,
  });
  if (!response.ok) {
    throw new Error("Image upload failed.");
  }

  const data = await response.json();
  return data.secure_url as string;
}
