'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Box, CircularProgress } from '@mui/material';
import { useAuthStore } from '@/store/authStore';

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, user, isLoading, setLoading } = useAuthStore();

  useEffect(() => {
    setLoading(false);
    
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }

    // Redirect based on role
    switch (user?.role) {
      case 'SUPERADMIN':
      case 'STAFF':
        router.push('/admin');
        break;
      case 'DOCTOR':
        router.push('/doctor');
        break;
      case 'PATIENT':
        router.push('/patient');
        break;
      default:
        router.push('/auth/login');
    }
  }, [isAuthenticated, user, router, setLoading]);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
      }}
    >
      <CircularProgress />
    </Box>
  );
}
