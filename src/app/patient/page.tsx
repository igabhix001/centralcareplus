'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Avatar,
  Chip,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  LinearProgress,
  IconButton,
  CircularProgress,
} from '@mui/material';
import {
  EventNote,
  LocalHospital,
  Description,
  FitnessCenter,
  DirectionsWalk,
  Favorite,
  LocalFireDepartment,
  ArrowForward,
  AccessTime,
  LinkOff,
} from '@mui/icons-material';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import PatientLayout from '@/components/layouts/PatientLayout';
import PageHeader from '@/components/common/PageHeader';
import { useAuthStore } from '@/store/authStore';
import { appointmentsApi, prescriptionsApi, googleFitApi, dashboardApi } from '@/lib/api';
import dayjs from 'dayjs';
import { useRouter } from 'next/navigation';

export default function PatientDashboard() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [healthData, setHealthData] = useState<any[]>([]);
  const [isGoogleFitConnected, setIsGoogleFitConnected] = useState(false);
  const [stats, setStats] = useState({ steps: 0, heartRate: 0, calories: 0 });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [aptsRes, rxRes, fitRes] = await Promise.all([
        appointmentsApi.getAll({ status: 'SCHEDULED,CONFIRMED', limit: 3 }),
        prescriptionsApi.getAll({ limit: 3 }),
        googleFitApi.getData(),
      ]);

      if (aptsRes.success) setAppointments(aptsRes.data || []);
      if (rxRes.success) setPrescriptions(rxRes.data || []);
      if (fitRes.success && fitRes.data) {
        // Backend returns { success, data: { connected, data: [...] } }
        const { connected, data: fitData } = fitRes.data;
        const healthDataArray = Array.isArray(fitData) ? fitData : [];
        setHealthData(healthDataArray);
        setIsGoogleFitConnected(connected === true);
        
        // Get today's stats
        const today = healthDataArray[0] || {};
        setStats({
          steps: today.steps || 0,
          heartRate: today.heartRate || 0,
          calories: today.calories || 0,
        });
        console.log('Dashboard Google Fit:', { connected, dataCount: healthDataArray.length, todayStats: today });
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const weeklySteps = healthData.slice(0, 7).reverse().map((d: any) => ({
    day: dayjs(d.date).format('ddd'),
    steps: d.steps || 0,
  }));

  const userName = user?.firstName || user?.name?.split(' ')[0] || 'Patient';

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
        title={`Welcome Back, ${userName}!`}
        subtitle="Here's your health overview for today"
      />

      <Grid container spacing={3}>
        {/* Health Stats */}
        <Grid item xs={12} md={8}>
          <Grid container spacing={3}>
            {/* Steps Card */}
            <Grid item xs={12} sm={4}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: 2,
                        bgcolor: 'primary.light',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <DirectionsWalk sx={{ color: 'primary.main' }} />
                    </Box>
                    <Chip label="Today" size="small" />
                  </Box>
                  <Typography variant="h4" fontWeight={700}>
                    {stats.steps.toLocaleString()}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Steps
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min((stats.steps / 10000) * 100, 100)}
                    sx={{ height: 6, borderRadius: 3 }}
                  />
                  <Typography variant="caption" color="text.secondary">
                    {Math.max(10000 - stats.steps, 0)} steps to goal
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* Heart Rate Card */}
            <Grid item xs={12} sm={4}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: 2,
                        bgcolor: 'error.light',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Favorite sx={{ color: 'error.main' }} />
                    </Box>
                    <Chip label="Now" size="small" color="success" />
                  </Box>
                  <Typography variant="h4" fontWeight={700}>
                    {stats.heartRate || '--'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    BPM
                  </Typography>
                  <Typography variant="caption" color="success.main">
                    Normal range
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* Calories Card */}
            <Grid item xs={12} sm={4}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: 2,
                        bgcolor: 'warning.light',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <LocalFireDepartment sx={{ color: 'warning.main' }} />
                    </Box>
                    <Chip label="Today" size="small" />
                  </Box>
                  <Typography variant="h4" fontWeight={700}>
                    {stats.calories.toLocaleString()}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Calories
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min((stats.calories / 2200) * 100, 100)}
                    color="warning"
                    sx={{ height: 6, borderRadius: 3 }}
                  />
                  <Typography variant="caption" color="text.secondary">
                    Goal: 2,200 kcal
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* Weekly Activity Chart */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Box>
                      <Typography variant="h6" fontWeight={600}>
                        Weekly Activity
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Your step count this week
                      </Typography>
                    </Box>
                    <Button endIcon={<ArrowForward />} size="small">
                      View Details
                    </Button>
                  </Box>
                  <Box sx={{ height: 200 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={weeklySteps}>
                        <defs>
                          <linearGradient id="stepsGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#9C27B0" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#9C27B0" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="day" axisLine={false} tickLine={false} />
                        <YAxis hide />
                        <Tooltip />
                        <Area
                          type="monotone"
                          dataKey="steps"
                          stroke="#9C27B0"
                          strokeWidth={2}
                          fill="url(#stepsGradient)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Grid>

        {/* Right Sidebar */}
        <Grid item xs={12} md={4}>
          {/* Google Fit Connection */}
          <Card sx={{ mb: 3, background: isGoogleFitConnected ? 'linear-gradient(135deg, #1976D2 0%, #1565C0 100%)' : 'linear-gradient(135deg, #757575 0%, #616161 100%)', color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <FitnessCenter />
                <Typography variant="h6" fontWeight={600}>
                  Google Fit
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ opacity: 0.9, mb: 2 }}>
                {isGoogleFitConnected ? 'Your health data is synced and up to date' : 'Connect to sync your health data'}
              </Typography>
              {isGoogleFitConnected ? (
                <Chip label="Connected" size="small" sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }} />
              ) : (
                <Button size="small" variant="outlined" sx={{ color: 'white', borderColor: 'white' }} onClick={() => router.push('/patient/health')}>
                  Connect
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Upcoming Appointments */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" fontWeight={600}>
                  Upcoming Appointments
                </Typography>
                <IconButton size="small" onClick={() => router.push('/patient/appointments')}>
                  <ArrowForward />
                </IconButton>
              </Box>
              {appointments.length === 0 ? (
                <Typography color="text.secondary" textAlign="center" py={2}>
                  No upcoming appointments
                </Typography>
              ) : (
                <List disablePadding>
                  {appointments.slice(0, 3).map((apt: any) => (
                    <ListItem
                      key={apt.id}
                      sx={{
                        px: 0,
                        borderBottom: 1,
                        borderColor: 'divider',
                        '&:last-child': { borderBottom: 0 },
                      }}
                    >
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: 'primary.main' }}>
                          {apt.doctor?.user?.firstName?.[0]}{apt.doctor?.user?.lastName?.[0]}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={`Dr. ${apt.doctor?.user?.firstName} ${apt.doctor?.user?.lastName}`}
                        secondary={
                          <Box>
                            <Typography variant="caption" color="text.secondary">
                              {apt.doctor?.specialization}
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                              <AccessTime sx={{ fontSize: 14 }} />
                              <Typography variant="caption">
                                {dayjs(apt.scheduledAt).format('MMM DD, YYYY')} at {dayjs(apt.scheduledAt).format('hh:mm A')}
                              </Typography>
                            </Box>
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              )}
              <Button fullWidth variant="outlined" sx={{ mt: 2 }} onClick={() => router.push('/patient/doctors')}>
                Book New Appointment
              </Button>
            </CardContent>
          </Card>

          {/* Recent Prescriptions */}
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" fontWeight={600}>
                  Recent Prescriptions
                </Typography>
                <IconButton size="small" onClick={() => router.push('/patient/records')}>
                  <ArrowForward />
                </IconButton>
              </Box>
              {prescriptions.length === 0 ? (
                <Typography color="text.secondary" textAlign="center" py={2}>
                  No prescriptions yet
                </Typography>
              ) : (
                prescriptions.slice(0, 3).map((rx: any) => (
                  <Box
                    key={rx.id}
                    sx={{
                      p: 2,
                      mb: 1,
                      borderRadius: 2,
                      bgcolor: 'action.hover',
                      '&:last-child': { mb: 0 },
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                      <Box>
                        <Typography variant="subtitle2" fontWeight={600}>
                          {rx.medications?.[0]?.name || 'Prescription'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Dr. {rx.doctor?.user?.firstName} • {dayjs(rx.createdAt).format('MMM DD, YYYY')}
                        </Typography>
                      </Box>
                      <Chip
                        label={rx.status || 'active'}
                        size="small"
                        color="success"
                        sx={{ textTransform: 'capitalize' }}
                      />
                    </Box>
                  </Box>
                ))
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </PatientLayout>
  );
}
