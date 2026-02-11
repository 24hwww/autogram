import { useEffect } from 'react';
import { apiRequest } from '@/lib/queryClient';

export function useImageCleanup() {
  useEffect(() => {
    // Run cleanup on frontend start (only if user is authenticated)
    const runCleanup = async () => {
      try {
        console.log('🧹 Frontend: Running image cleanup on start...');
        await apiRequest('POST', '/api/cleanup/images');
        console.log('✅ Frontend: Image cleanup completed successfully');
      } catch (error) {
        console.warn('⚠️ Frontend: Image cleanup failed (user may not be authenticated):', error);
        // Don't show error to user as this is background task
      }
    };

    // Small delay to ensure server is ready
    const timeoutId = setTimeout(runCleanup, 2000);

    return () => clearTimeout(timeoutId);
  }, []);
}
