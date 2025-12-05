'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Chip,
  Button,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Snackbar,
} from '@mui/material';
import { EventNote, AccessTime, Cancel, Refresh } from '@mui/icons-material';
import PatientLayout from '@/components/layouts/PatientLayout';
import PageHeader from '@/components/common/PageHeader';
import EmptyState from '@/components/common/EmptyState';
import { appointmentsApi } from '@/lib/api';
import dayjs from 'dayjs';

const getStatusColor = (status: string) => {
  switch (status) {
    case 'CONFIRMED': return 'success';
    case 'SCHEDULED': return 'warning';
    case 'COMPLETED': return 'info';
    case 'CANCELLED': return 'error';
    case 'NO_SHOW': return 'default';
    default: return 'default';
  }
};

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
}

export default function PatientAppointmentsPage() {
  const [tabValue, setTabValue] = useState(0);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [cancelling, setCancelling] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const response = await appointmentsApi.getAll();
      if (response.success) {
        setAppointments(response.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  const upcomingAppointments = appointments.filter(apt => 
    ['SCHEDULED', 'CONFIRMED'].includes(apt.status) && dayjs(apt.scheduledAt).isAfter(dayjs())
  );
  const pastAppointments = appointments.filter(apt => 
    apt.status === 'COMPLETED' || (dayjs(apt.scheduledAt).isBefore(dayjs()) && apt.status !== 'CANCELLED')
  );
  const cancelledAppointments = appointments.filter(apt => apt.status === 'CANCELLED');

  const handleCancelClick = (appointment: any) => {
    setSelectedAppointment(appointment);
    setCancelDialogOpen(true);
  };

  const handleConfirmCancel = async () => {
    if (!selectedAppointment) return;
    
    setCancelling(true);
    try {
      const response = await appointmentsApi.cancel(selectedAppointment.id);
      if (response.success) {
        setSnackbar({ open: true, message: 'Appointment cancelled successfully', severity: 'success' });
        fetchAppointments();
      } else {
        setSnackbar({ open: true, message: response.error || 'Failed to cancel', severity: 'error' });
      }
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to cancel appointment', severity: 'error' });
    } finally {
      setCancelling(false);
      setCancelDialogOpen(false);
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = dayjs(dateString);
    return {
      date: date.format('MMM DD, YYYY'),
      time: date.format('hh:mm A'),
    };
  };

  const renderAppointmentList = (items: any[]) => {
    if (loading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      );
    }

    if (items.length === 0) {
      return (
        <EmptyState
          icon={<EventNote sx={{ fontSize: 40 }} />}
          title="No appointments"
          description="You dont have any appointments in this category"
        />
      );
    }

    return (
      <List>
        {items.map((apt) => {
          const { date, time } = formatDateTime(apt.scheduledAt);
          const doctorName = apt.doctor?.user ? 
            `Dr. ${apt.doctor.user.firstName} ${apt.doctor.user.lastName}` : 'Doctor';
          
          return (
            <ListItem
              key={apt.id}
              sx={{
                mb: 2,
                p: 2,
                borderRadius: 2,
                bgcolor: 'background.paper',
                border: 1,
                borderColor: 'divider',
              }}
            >
              <ListItemAvatar>
                <Avatar sx={{ bgcolor: 'primary.main', width: 56, height: 56 }}>
                  {apt.doctor?.user?.firstName?.[0]}{apt.doctor?.user?.lastName?.[0]}
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                sx={{ ml: 1 }}
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <Typography variant="subtitle1" fontWeight={600}>
                      {doctorName}
                    </Typography>
                    <Chip
                      label={apt.type}
                      size="small"
                      sx={{ textTransform: 'capitalize', height: 22 }}
                    />
                  </Box>
                }
                secondary={
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      {apt.doctor?.specialization}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <EventNote sx={{ fontSize: 16, color: 'text.secondary' }} />
                        <Typography variant="caption">{date}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <AccessTime sx={{ fontSize: 16, color: 'text.secondary' }} />
                        <Typography variant="caption">{time}</Typography>
                      </Box>
                    </Box>
                  </Box>
                }
              />
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
                <Chip
                  label={apt.status.toLowerCase().replace('_', ' ')}
                  size="small"
                  color={getStatusColor(apt.status) as any}
                  sx={{ textTransform: 'capitalize' }}
                />
                {['CONFIRMED', 'SCHEDULED'].includes(apt.status) && dayjs(apt.scheduledAt).isAfter(dayjs()) && (
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button 
                      size="small" 
                      variant="outlined" 
                      color="error" 
                      startIcon={<Cancel />}
                      onClick={() => handleCancelClick(apt)}
                    >
                      Cancel
                    </Button>
                    <Button size="small" variant="outlined" startIcon={<Refresh />} href="/patient/doctors">
                      Reschedule
                    </Button>
                  </Box>
                )}
                {apt.status === 'COMPLETED' && (
                  <Button size="small" variant="outlined" href="/patient/records">
                    View Records
                  </Button>
                )}
              </Box>
            </ListItem>
          );
        })}
      </List>
    );
  };

  return (
    <PatientLayout>
      <PageHeader
        title="My Appointments"
        subtitle="View and manage your appointments"
        action={
          <Button variant="contained" startIcon={<EventNote />} href="/patient/doctors">
            Book New Appointment
          </Button>
        }
      />

      <Card>
        <CardContent>
          <Tabs
            value={tabValue}
            onChange={(_, newValue) => setTabValue(newValue)}
            sx={{ borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab label={`Upcoming (${upcomingAppointments.length})`} />
            <Tab label={`Past (${pastAppointments.length})`} />
            <Tab label={`Cancelled (${cancelledAppointments.length})`} />
          </Tabs>

          <TabPanel value={tabValue} index={0}>
            {renderAppointmentList(upcomingAppointments)}
          </TabPanel>
          <TabPanel value={tabValue} index={1}>
            {renderAppointmentList(pastAppointments)}
          </TabPanel>
          <TabPanel value={tabValue} index={2}>
            {renderAppointmentList(cancelledAppointments)}
          </TabPanel>
        </CardContent>
      </Card>

      {/* Cancel Confirmation Dialog */}
      <Dialog open={cancelDialogOpen} onClose={() => setCancelDialogOpen(false)}>
        <DialogTitle>Cancel Appointment</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to cancel your appointment with{' '}
            <strong>
              Dr. {selectedAppointment?.doctor?.user?.firstName} {selectedAppointment?.doctor?.user?.lastName}
            </strong>
            {' '}on {selectedAppointment && formatDateTime(selectedAppointment.scheduledAt).date}?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelDialogOpen(false)}>No, Keep It</Button>
          <Button 
            color="error" 
            variant="contained" 
            onClick={handleConfirmCancel}
            disabled={cancelling}
          >
            {cancelling ? <CircularProgress size={20} /> : 'Yes, Cancel'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </PatientLayout>
  );
}
