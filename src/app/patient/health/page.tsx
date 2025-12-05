'use client';

import React, { useState, useEffect, Suspense } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  ToggleButton,
  ToggleButtonGroup,
  LinearProgress,
  Avatar,
  CircularProgress,
  Snackbar,
  Alert,
} from '@mui/material';
import {
  FitnessCenter,
  DirectionsWalk,
  Favorite,
  LocalFireDepartment,
  NightsStay,
  Sync,
  CheckCircle,
  Link as LinkIcon,
  LinkOff,
} from '@mui/icons-material';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
} from 'recharts';
import PatientLayout from '@/components/layouts/PatientLayout';
import PageHeader from '@/components/common/PageHeader';
import { googleFitApi } from '@/lib/api';
import dayjs from 'dayjs';
import { useSearchParams } from 'next/navigation';

function HealthDataContent() {
  const searchParams = useSearchParams();
  const [timeRange, setTimeRange] = useState<'week' | 'month'>('week');
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [healthData, setHealthData] = useState<any[]>([]);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  useEffect(() => {
    // Check for OAuth callback params
    const connected = searchParams.get('connected');
    const error = searchParams.get('error');
    
    if (connected === 'true') {
      setSnackbar({ open: true, message: 'Google Fit connected successfully!', severity: 'success' });
    } else if (error) {
      setSnackbar({ open: true, message: 'Failed to connect Google Fit', severity: 'error' });
    }
    
    fetchHealthData();
  }, [searchParams]);

  const fetchHealthData = async () => {
    setLoading(true);
    try {
      const response = await googleFitApi.getData() as any;
      if (response.success) {
        // Backend returns { success, data: [...], connected: boolean }
        const healthDataArray = Array.isArray(response.data) ? response.data : [];
        setHealthData(healthDataArray);
        setIsConnected(response.connected === true);
        console.log('Google Fit data:', { connected: response.connected, dataCount: healthDataArray.length });
      }
    } catch (error) {
      console.error('Failed to fetch health data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    try {
      const response = await googleFitApi.getAuthUrl();
      if (response.success && response.data?.url) {
        window.location.href = response.data.url;
      }
    } catch (error) {
      console.error('Failed to get auth URL:', error);
      setSnackbar({ open: true, message: 'Failed to connect to Google Fit', severity: 'error' });
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      await fetchHealthData();
      setSnackbar({ open: true, message: 'Health data synced!', severity: 'success' });
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to sync data', severity: 'error' });
    } finally {
      setSyncing(false);
    }
  };

  // Process health data for charts
  const weeklyData = {
    steps: healthData.slice(0, 7).reverse().map((d: any) => ({
      day: dayjs(d.date).format('ddd'),
      value: d.steps || 0,
    })),
    heartRate: healthData.slice(0, 7).reverse().map((d: any) => ({
      day: dayjs(d.date).format('ddd'),
      value: d.heartRate || 72,
      min: (d.heartRate || 72) - 15,
      max: (d.heartRate || 72) + 20,
    })),
    calories: healthData.slice(0, 7).reverse().map((d: any) => ({
      day: dayjs(d.date).format('ddd'),
      value: d.calories || 0,
    })),
    sleep: healthData.slice(0, 7).reverse().map((d: any) => ({
      day: dayjs(d.date).format('ddd'),
      value: d.sleepHours || 7,
    })),
  };

  // Today's stats (most recent data)
  const todayData = healthData[0] || {};
  const todayStats = {
    steps: todayData.steps || 0,
    stepsGoal: 10000,
    heartRate: todayData.heartRate || 0,
    heartRateRange: { min: (todayData.heartRate || 72) - 15, max: (todayData.heartRate || 72) + 20 },
    calories: todayData.calories || 0,
    caloriesGoal: 2200,
    sleep: todayData.sleepHours || 0,
    sleepGoal: 8,
  };

  if (loading) {
    return (
      <PatientLayout>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
          <CircularProgress />
        </Box>
      </PatientLayout>
    );
  }

  return (
    <PatientLayout>
      <PageHeader
        title="Health Data"
        subtitle="Your fitness and health metrics from Google Fit"
        action={
          isConnected ? (
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <Chip
                icon={<CheckCircle />}
                label="Google Fit Connected"
                color="success"
                variant="outlined"
              />
              <Button variant="outlined" startIcon={syncing ? <CircularProgress size={16} /> : <Sync />} onClick={handleSync} disabled={syncing}>
                {syncing ? 'Syncing...' : 'Sync Now'}
              </Button>
            </Box>
          ) : (
            <Button variant="contained" startIcon={<LinkIcon />} onClick={handleConnect}>
              Connect Google Fit
            </Button>
          )
        }
      />

      {!isConnected ? (
        <Card sx={{ textAlign: 'center', py: 8 }}>
          <CardContent>
            <Avatar sx={{ width: 80, height: 80, bgcolor: 'primary.light', mx: 'auto', mb: 3 }}>
              <FitnessCenter sx={{ fontSize: 40, color: 'primary.main' }} />
            </Avatar>
            <Typography variant="h5" gutterBottom>
              Connect Google Fit
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 400, mx: 'auto' }}>
              Connect your Google Fit account to sync your health data and track your fitness progress.
            </Typography>
            <Button variant="contained" size="large" startIcon={<LinkIcon />} onClick={handleConnect}>
              Connect Google Fit
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Today's Stats */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={6} sm={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <DirectionsWalk color="primary" />
                    <Typography variant="body2" color="text.secondary">
                      Steps
                    </Typography>
                  </Box>
                  <Typography variant="h4" fontWeight={700}>
                    {todayStats.steps.toLocaleString()}
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={(todayStats.steps / todayStats.stepsGoal) * 100}
                    sx={{ mt: 1, height: 6, borderRadius: 3 }}
                  />
                  <Typography variant="caption" color="text.secondary">
                    Goal: {todayStats.stepsGoal.toLocaleString()}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Favorite color="error" />
                    <Typography variant="body2" color="text.secondary">
                      Heart Rate
                    </Typography>
                  </Box>
                  <Typography variant="h4" fontWeight={700}>
                    {todayStats.heartRate}
                    <Typography component="span" variant="body1" color="text.secondary">
                      {' '}bpm
                    </Typography>
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Range: {todayStats.heartRateRange.min}-{todayStats.heartRateRange.max} bpm
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <LocalFireDepartment color="warning" />
                    <Typography variant="body2" color="text.secondary">
                      Calories
                    </Typography>
                  </Box>
                  <Typography variant="h4" fontWeight={700}>
                    {todayStats.calories.toLocaleString()}
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={(todayStats.calories / todayStats.caloriesGoal) * 100}
                    color="warning"
                    sx={{ mt: 1, height: 6, borderRadius: 3 }}
                  />
                  <Typography variant="caption" color="text.secondary">
                    Goal: {todayStats.caloriesGoal.toLocaleString()} kcal
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <NightsStay color="secondary" />
                    <Typography variant="body2" color="text.secondary">
                      Sleep
                    </Typography>
                  </Box>
                  <Typography variant="h4" fontWeight={700}>
                    {todayStats.sleep}
                    <Typography component="span" variant="body1" color="text.secondary">
                      {' '}hrs
                    </Typography>
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={(todayStats.sleep / todayStats.sleepGoal) * 100}
                    color="secondary"
                    sx={{ mt: 1, height: 6, borderRadius: 3 }}
                  />
                  <Typography variant="caption" color="text.secondary">
                    Goal: {todayStats.sleepGoal} hours
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Time Range Toggle */}
          <Box sx={{ mb: 3, display: 'flex', justifyContent: 'flex-end' }}>
            <ToggleButtonGroup
              value={timeRange}
              exclusive
              onChange={(_, value) => value && setTimeRange(value)}
              size="small"
            >
              <ToggleButton value="week">Week</ToggleButton>
              <ToggleButton value="month">Month</ToggleButton>
            </ToggleButtonGroup>
          </Box>

          {/* Charts */}
          <Grid container spacing={3}>
            {/* Steps Chart */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" fontWeight={600} gutterBottom>
                    Steps Trend
                  </Typography>
                  <Box sx={{ height: 250 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={weeklyData.steps}>
                        <defs>
                          <linearGradient id="stepsGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#1976D2" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#1976D2" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                        <XAxis dataKey="day" />
                        <YAxis />
                        <Tooltip />
                        <Area type="monotone" dataKey="value" stroke="#1976D2" fill="url(#stepsGrad)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Heart Rate Chart */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" fontWeight={600} gutterBottom>
                    Heart Rate
                  </Typography>
                  <Box sx={{ height: 250 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={weeklyData.heartRate}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                        <XAxis dataKey="day" />
                        <YAxis domain={[40, 120]} />
                        <Tooltip />
                        <Line type="monotone" dataKey="value" stroke="#D32F2F" strokeWidth={2} dot={{ fill: '#D32F2F' }} />
                        <Line type="monotone" dataKey="max" stroke="#FFCDD2" strokeDasharray="5 5" />
                        <Line type="monotone" dataKey="min" stroke="#FFCDD2" strokeDasharray="5 5" />
                      </LineChart>
                    </ResponsiveContainer>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Calories Chart */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" fontWeight={600} gutterBottom>
                    Calories Burned
                  </Typography>
                  <Box sx={{ height: 250 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={weeklyData.calories}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                        <XAxis dataKey="day" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="value" fill="#ED6C02" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Sleep Chart */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" fontWeight={600} gutterBottom>
                    Sleep Duration
                  </Typography>
                  <Box sx={{ height: 250 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={weeklyData.sleep}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                        <XAxis dataKey="day" />
                        <YAxis domain={[0, 12]} />
                        <Tooltip />
                        <Bar dataKey="value" fill="#9C27B0" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </>
      )}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </PatientLayout>
  );
}

export default function HealthDataPage() {
  return (
    <Suspense fallback={
      <PatientLayout>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
          <CircularProgress />
        </Box>
      </PatientLayout>
    }>
      <HealthDataContent />
    </Suspense>
  );
}
