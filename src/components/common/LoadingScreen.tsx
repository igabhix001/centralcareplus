'use client';

import React from 'react';
import { Box, CircularProgress, Typography, useTheme } from '@mui/material';
import Logo from './Logo';

export default function LoadingScreen() {
  const theme = useTheme();

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        bgcolor: theme.palette.background.default,
      }}
    >
      <Logo size="large" />
      <CircularProgress size={40} thickness={4} />
      <Typography variant="body2" color="text.secondary">
        Loading...
      </Typography>
    </Box>
  );
}
