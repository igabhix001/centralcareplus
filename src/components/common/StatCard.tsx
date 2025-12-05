'use client';

import React from 'react';
import { Box, Card, CardContent, Typography, useTheme } from '@mui/material';
import { TrendingUp, TrendingDown } from '@mui/icons-material';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
}

export default function StatCard({ title, value, icon, trend, color = 'primary' }: StatCardProps) {
  const theme = useTheme();

  const colorMap = {
    primary: theme.palette.primary.main,
    secondary: theme.palette.secondary.main,
    success: theme.palette.success.main,
    warning: theme.palette.warning.main,
    error: theme.palette.error.main,
    info: theme.palette.info.main,
  };

  const bgColorMap = {
    primary: `${theme.palette.primary.main}15`,
    secondary: `${theme.palette.secondary.main}15`,
    success: `${theme.palette.success.main}15`,
    warning: `${theme.palette.warning.main}15`,
    error: `${theme.palette.error.main}15`,
    info: `${theme.palette.info.main}15`,
  };

  return (
    <Card
      sx={{
        height: '100%',
        transition: 'all 0.3s ease',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
        },
      }}
    >
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography
              variant="body2"
              sx={{ color: 'text.secondary', mb: 0.5, fontWeight: 500 }}
            >
              {title}
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
              {value}
            </Typography>
            {trend && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                {trend.isPositive ? (
                  <TrendingUp sx={{ fontSize: 18, color: 'success.main' }} />
                ) : (
                  <TrendingDown sx={{ fontSize: 18, color: 'error.main' }} />
                )}
                <Typography
                  variant="caption"
                  sx={{
                    color: trend.isPositive ? 'success.main' : 'error.main',
                    fontWeight: 600,
                  }}
                >
                  {trend.value}% from last week
                </Typography>
              </Box>
            )}
          </Box>
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: bgColorMap[color],
              color: colorMap[color],
            }}
          >
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}
