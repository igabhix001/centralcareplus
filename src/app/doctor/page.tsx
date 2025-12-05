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
  IconButton,
  Divider,
  LinearProgress,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import {
  People,
  EventNote,
  CheckCircle,
  ArrowForward,
  AccessTime,
  Person,
  MedicalServices,
  Edit,
} from '@mui/icons-material';
import DoctorLayout from '@/components/layouts/DoctorLayout';
import StatCard from '@/components/common/StatCard';
import PageHeader from '@/components/common/PageHeader';
import { dashboardApi, appointmentsApi, prescriptionsApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import dayjs from 'dayjs';

const getStatusColor = (status: string) => {
  switch (status) {
    case 'COMPLETED':
      return 'success';
    case 'IN_PROGRESS':
      return 'primary';
    case 'SCHEDULED':
      return 'warning';
    case 'CONFIRMED':
      return 'info';
    default:
      return 'default';
  }
};

export default function DoctorDashboard() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notesDialog, setNotesDialog] = useState(false);
  const [prescribeDialog, setPrescribeDialog] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const response = await dashboardApi.getDoctorStats();
      if (response.success) {
        setStats(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNotes = (apt: any) => {
    setSelectedAppointment(apt);
    setNotes(apt.notes || '');
    setNotesDialog(true);
  };

  const handleSaveNotes = async () => {
    if (!selectedAppointment) return;
    setSaving(true);
    try {
      await appointmentsApi.update(selectedAppointment.id, { notes });
      fetchDashboard();
      setNotesDialog(false);
    } catch (error) {
      console.error('Failed to save notes:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleStartAppointment = async (apt: any) => {
    try {
      await appointmentsApi.update(apt.id, { status: 'IN_PROGRESS' });
      fetchDashboard();
    } catch (error) {
      console.error('Failed to start appointment:', error);
    }
  };

  const handleCompleteAppointment = async (apt: any) => {
    try {
      await appointmentsApi.update(apt.id, { status: 'COMPLETED' });
      fetchDashboard();
    } catch (error) {
      console.error('Failed to complete appointment:', error);
    }
  };

  if (loading) {
    return (
      <DoctorLayout>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
          <CircularProgress />
        </Box>
      </DoctorLayout>
    );
  }

  const todayAppointments = stats?.todayAppointments || [];
  const recentPatients = stats?.recentPatients || [];
  const completedCount = todayAppointments.filter((a: any) => a.status === 'COMPLETED').length;
  const totalCount = todayAppointments.length;
  const currentAppointment = todayAppointments.find((a: any) => a.status === 'IN_PROGRESS');

  return (
    <DoctorLayout>
      <PageHeader
        title={`Good Morning, Dr. ${user?.lastName || 'Doctor'}!`}
        subtitle="Here's your schedule for today"
      />

      {/* Stats */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard
            title="Today's Appointments"
            value={totalCount}
            icon={<EventNote sx={{ fontSize: 28 }} />}
            color="primary"
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard
            title="Completed"
            value={completedCount}
            icon={<CheckCircle sx={{ fontSize: 28 }} />}
            color="success"
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard
            title="Total Patients"
            value="156"
            icon={<People sx={{ fontSize: 28 }} />}
            trend={{ value: 8, isPositive: true }}
            color="info"
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard
            title="Pending Reviews"
            value="12"
            icon={<MedicalServices sx={{ fontSize: 28 }} />}
            color="warning"
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Today's Schedule */}
        <Grid item xs={12} lg={8}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Box>
                  <Typography variant="h6" fontWeight={600}>
                    Today's Schedule
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {completedCount} of {totalCount} appointments completed
                  </Typography>
                </Box>
                <Box sx={{ width: 120 }}>
                  <LinearProgress
                    variant="determinate"
                    value={(completedCount / totalCount) * 100}
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                </Box>
              </Box>
              <List>
                {todayAppointments.length === 0 ? (
                  <Typography color="text.secondary" textAlign="center" py={4}>
                    No appointments scheduled for today
                  </Typography>
                ) : todayAppointments.map((apt: any, idx: number) => (
                  <React.Fragment key={apt.id}>
                    <ListItem
                      sx={{
                        py: 2,
                        px: 0,
                        opacity: apt.status === 'COMPLETED' ? 0.6 : 1,
                      }}
                      secondaryAction={
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                          <Chip
                            label={apt.status?.toLowerCase().replace('_', ' ')}
                            size="small"
                            color={getStatusColor(apt.status) as any}
                            sx={{ textTransform: 'capitalize' }}
                          />
                          {apt.status === 'SCHEDULED' || apt.status === 'CONFIRMED' ? (
                            <Button size="small" variant="outlined" onClick={() => handleStartAppointment(apt)}>
                              Start
                            </Button>
                          ) : apt.status === 'IN_PROGRESS' ? (
                            <Button size="small" variant="contained" onClick={() => handleCompleteAppointment(apt)}>
                              Complete
                            </Button>
                          ) : null}
                        </Box>
                      }
                    >
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: apt.status === 'IN_PROGRESS' ? 'primary.main' : 'grey.300' }}>
                          {apt.patient?.user?.firstName?.[0]}{apt.patient?.user?.lastName?.[0]}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="subtitle2">
                              {apt.patient?.user?.firstName} {apt.patient?.user?.lastName}
                            </Typography>
                            <Chip label={apt.type} size="small" variant="outlined" sx={{ height: 20 }} />
                          </Box>
                        }
                        secondary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                            <AccessTime sx={{ fontSize: 14 }} />
                            <Typography variant="caption">{dayjs(apt.scheduledAt).format('hh:mm A')}</Typography>
                          </Box>
                        }
                      />
                    </ListItem>
                    {idx < todayAppointments.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Right Sidebar */}
        <Grid item xs={12} lg={4}>
          {/* Current Patient */}
          {currentAppointment && (
            <Card sx={{ mb: 3, border: 2, borderColor: 'primary.main' }}>
              <CardContent>
                <Chip label="In Progress" color="primary" size="small" sx={{ mb: 2 }} />
                <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                  <Avatar sx={{ width: 56, height: 56, bgcolor: 'primary.main' }}>
                    {currentAppointment.patient?.user?.firstName?.[0]}{currentAppointment.patient?.user?.lastName?.[0]}
                  </Avatar>
                  <Box>
                    <Typography variant="h6" fontWeight={600}>
                      {currentAppointment.patient?.user?.firstName} {currentAppointment.patient?.user?.lastName}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {currentAppointment.type} Visit
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Started at {dayjs(currentAppointment.scheduledAt).format('hh:mm A')}
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button variant="contained" fullWidth startIcon={<Edit />} onClick={() => handleAddNotes(currentAppointment)}>
                    Add Notes
                  </Button>
                  <Button variant="outlined" fullWidth startIcon={<MedicalServices />} href="/doctor/prescriptions">
                    Prescribe
                  </Button>
                </Box>
              </CardContent>
            </Card>
          )}

          {/* Recent Patients */}
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" fontWeight={600}>
                  Recent Patients
                </Typography>
                <IconButton size="small" href="/doctor/patients">
                  <ArrowForward />
                </IconButton>
              </Box>
              {recentPatients.length === 0 ? (
                <Typography color="text.secondary" textAlign="center" py={2}>
                  No recent patients
                </Typography>
              ) : recentPatients.map((patient: any) => (
                <Box
                  key={patient.id}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    p: 1.5,
                    mb: 1,
                    borderRadius: 2,
                    bgcolor: 'action.hover',
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'action.selected' },
                    '&:last-child': { mb: 0 },
                  }}
                >
                  <Avatar sx={{ bgcolor: 'secondary.light' }}>
                    <Person />
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle2" fontWeight={500}>
                      {patient.user?.firstName} {patient.user?.lastName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {patient.bloodGroup || 'Patient'}
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    {patient.lastVisit}
                  </Typography>
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Add Notes Dialog */}
      <Dialog open={notesDialog} onClose={() => setNotesDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Notes</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNotesDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveNotes} disabled={saving}>
            {saving ? <CircularProgress size={20} /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </DoctorLayout>
  );
}
