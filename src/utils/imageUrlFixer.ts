/**
 * Utility to fix broken R2 custom domain URLs
 * Converts broken pub- URLs to working direct R2 URLs
 */

export const fixImageUrl = (imageUrl: string): string => {
  if (!imageUrl) {
    console.log('[fixImageUrl] No URL provided');
    return imageUrl;
  }
  
  console.log('[fixImageUrl] Input URL:', imageUrl);
  
  // REVERSE FIX: Convert direct R2 URLs back to working custom domain URLs
  // This is needed because the database was updated but images still exist at old locations
  if (imageUrl.includes('147322994f8cbee5b63de04ff2919a74.r2.cloudflarestorage.com/nhs-app-public-dev/')) {
    const workingUrl = imageUrl.replace(
      'https://147322994f8cbee5b63de04ff2919a74.r2.cloudflarestorage.com/nhs-app-public-dev/',
      'https://pub-8eafccb788484d2db8560b92e1252627.r2.dev/'
    );
    console.log('[fixImageUrl] ✅ Converting direct R2 to working custom domain:', workingUrl);
    return workingUrl;
  }
  
  // Keep custom domain URLs as they are (they work)
  if (imageUrl.includes('pub-8eafccb788484d2db8560b92e1252627.r2.dev')) {
    console.log('[fixImageUrl] ✅ Using existing working custom domain URL:', imageUrl);
    return imageUrl;
  }
  
  console.log('[fixImageUrl] ⚠️ URL format not recognized, returning as-is:', imageUrl);
  return imageUrl;
};

export default fixImageUrl;