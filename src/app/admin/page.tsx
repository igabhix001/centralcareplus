'use client';

import React, { useState, useEffect } from 'react';
import { Box, Grid, Card, CardContent, Typography, Avatar, Chip, List, ListItem, ListItemAvatar, ListItemText, LinearProgress, CircularProgress } from '@mui/material';
import { People, LocalHospital, EventNote, MedicalServices } from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import AdminLayout from '@/components/layouts/AdminLayout';
import StatCard from '@/components/common/StatCard';
import PageHeader from '@/components/common/PageHeader';
import { dashboardApi } from '@/lib/api';
import dayjs from 'dayjs';

const appointmentTrends = [
  { date: 'Mon', count: 45 },
  { date: 'Tue', count: 52 },
  { date: 'Wed', count: 38 },
  { date: 'Thu', count: 67 },
  { date: 'Fri', count: 55 },
  { date: 'Sat', count: 42 },
  { date: 'Sun', count: 30 },
];

const getStatusColor = (status: string) => {
  switch (status) {
    case 'CONFIRMED':
      return 'success';
    case 'SCHEDULED':
      return 'warning';
    case 'COMPLETED':
      return 'info';
    case 'CANCELLED':
      return 'error';
    default:
      return 'default';
  }
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const response = await dashboardApi.getAdminStats();
      if (response.success) {
        setStats(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
          <CircularProgress />
        </Box>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <PageHeader
        title="Dashboard"
        subtitle="Welcome back! Here's what's happening today."
      />

      {/* Stats Grid */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard
            title="Total Patients"
            value={stats?.stats?.totalPatients?.toString() || '0'}
            icon={<People sx={{ fontSize: 28 }} />}
            trend={{ value: 12, isPositive: true }}
            color="primary"
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard
            title="Total Doctors"
            value={stats?.stats?.totalDoctors?.toString() || '0'}
            icon={<LocalHospital sx={{ fontSize: 28 }} />}
            trend={{ value: 5, isPositive: true }}
            color="success"
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard
            title="Today Appointments"
            value={stats?.stats?.todayAppointments?.toString() || '0'}
            icon={<EventNote sx={{ fontSize: 28 }} />}
            trend={{ value: stats?.stats?.appointmentTrend || 0, isPositive: (stats?.stats?.appointmentTrend || 0) >= 0 }}
            color="info"
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard
            title="Monthly Appointments"
            value={stats?.stats?.monthlyAppointments?.toString() || '0'}
            icon={<MedicalServices sx={{ fontSize: 28 }} />}
            trend={{ value: stats?.stats?.appointmentTrend || 0, isPositive: (stats?.stats?.appointmentTrend || 0) >= 0 }}
            color="warning"
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Appointment Trends Chart */}
        <Grid item xs={12} lg={8}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box>
                  <Typography variant="h6" fontWeight={600}>
                    Appointment Trends
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Weekly appointment overview
                  </Typography>
                </Box>
                <Chip
                  label={`${stats?.stats?.appointmentTrend >= 0 ? '+' : ''}${stats?.stats?.appointmentTrend || 0}% this month`}
                  color={stats?.stats?.appointmentTrend >= 0 ? 'success' : 'error'}
                  size="small"
                />
              </Box>
              <Box sx={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={appointmentTrends}>
                    <defs>
                      <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#1976D2" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#1976D2" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="date" stroke="#64748B" />
                    <YAxis stroke="#64748B" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#fff',
                        border: '1px solid #E2E8F0',
                        borderRadius: 8,
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke="#1976D2"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorCount)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Top Doctors */}
        <Grid item xs={12} lg={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
                Top Performing Doctors
              </Typography>
              {(stats?.topDoctors || []).map((doctor: any, index: number) => (
                <Box
                  key={doctor.id}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    p: 2,
                    mb: 1,
                    borderRadius: 2,
                    bgcolor: 'action.hover',
                  }}
                >
                  <Avatar sx={{ bgcolor: 'primary.main', width: 48, height: 48 }}>
                    {index + 1}
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle2" fontWeight={600}>
                      Dr. {doctor.user?.firstName} {doctor.user?.lastName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {doctor.specialization}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                      <Chip label={`★ ${doctor.rating?.toFixed(1) || '4.5'}`} size="small" color="warning" />
                    </Box>
                  </Box>
                </Box>
              ))}
              {(!stats?.topDoctors || stats.topDoctors.length === 0) && (
                <Typography variant="body2" color="text.secondary" textAlign="center" py={2}>
                  No doctors data available
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Appointments */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" fontWeight={600}>
                  Recent Appointments
                </Typography>
                <Chip label={`${stats?.recentAppointments?.length || 0} shown`} size="small" />
              </Box>
              <List>
                {(stats?.recentAppointments || []).map((apt: any) => (
                  <ListItem
                    key={apt.id}
                    sx={{
                      borderRadius: 2,
                      mb: 1,
                      bgcolor: 'background.paper',
                      border: 1,
                      borderColor: 'divider',
                    }}
                    secondaryAction={
                      <Chip
                        label={apt.status?.toLowerCase().replace('_', ' ')}
                        size="small"
                        color={getStatusColor(apt.status) as any}
                        sx={{ textTransform: 'capitalize' }}
                      />
                    }
                  >
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: 'secondary.light' }}>
                        {apt.patient?.user?.firstName?.[0]}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={`${apt.patient?.user?.firstName} ${apt.patient?.user?.lastName}`}
                      secondary={`Dr. ${apt.doctor?.user?.firstName} ${apt.doctor?.user?.lastName} • ${dayjs(apt.scheduledAt).format('MMM DD, hh:mm A')}`}
                      primaryTypographyProps={{ fontWeight: 500 }}
                    />
                  </ListItem>
                ))}
                {(!stats?.recentAppointments || stats.recentAppointments.length === 0) && (
                  <Typography variant="body2" color="text.secondary" textAlign="center" py={2}>
                    No recent appointments
                  </Typography>
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </AdminLayout>
  );
}
