'use client';

import React from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import Image from 'next/image';

interface LogoProps {
  size?: 'small' | 'medium' | 'large';
  showText?: boolean;
}

export default function Logo({ size = 'medium', showText = true }: LogoProps) {
  const theme = useTheme();
  
  const dimensions = {
    small: { logo: 24, text: '1rem' },
    medium: { logo: 36, text: '1.25rem' },
    large: { logo: 48, text: '1.5rem' },
  };

  const { logo, text } = dimensions[size];

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
      }}
    >
      <Typography
        sx={{
          fontSize: text,
          fontWeight: 700,
          color: theme.palette.primary.main,
          letterSpacing: '-0.02em',
        }}
      >
        CP
      </Typography>
      <Box
        sx={{
          width: logo,
          height: logo,
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Image
          src="/plus-logo.png"
          alt="CentralCarePlus"
          width={logo}
          height={logo}
          style={{ objectFit: 'contain' }}
        />
      </Box>
      {showText && (
        <Typography
          sx={{
            fontSize: text,
            fontWeight: 600,
            color: theme.palette.text.primary,
            ml: 0.5,
          }}
        >
          CentralCarePlus
        </Typography>
      )}
    </Box>
  );
}
