'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  Chip,
  Avatar,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Snackbar,
  Alert,
} from '@mui/material';
import {
  AccessTime,
  Person,
  EventNote,
  Edit,
  CheckCircle,
  Cancel,
} from '@mui/icons-material';
import DoctorLayout from '@/components/layouts/DoctorLayout';
import PageHeader from '@/components/common/PageHeader';
import { appointmentsApi } from '@/lib/api';
import dayjs from 'dayjs';

export default function DoctorSchedulePage() {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [editDialog, setEditDialog] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  useEffect(() => {
    fetchAppointments();
  }, [selectedDate]);

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const response = await appointmentsApi.getAll({ date: selectedDate });
      if (response.success) {
        setAppointments(response.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (apt: any) => {
    setSelectedAppointment(apt);
    setNotes(apt.notes || '');
    setStatus(apt.status);
    setEditDialog(true);
  };

  const handleSave = async () => {
    if (!selectedAppointment) return;
    setSaving(true);
    try {
      await appointmentsApi.update(selectedAppointment.id, { notes, status });
      setSnackbar({ open: true, message: 'Appointment updated!', severity: 'success' });
      fetchAppointments();
      setEditDialog(false);
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to update', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'success';
      case 'IN_PROGRESS': return 'primary';
      case 'SCHEDULED': return 'warning';
      case 'CONFIRMED': return 'info';
      case 'CANCELLED': return 'error';
      default: return 'default';
    }
  };

  // Generate week dates
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const date = dayjs().add(i, 'day');
    return {
      date: date.format('YYYY-MM-DD'),
      day: date.format('ddd'),
      dayNum: date.format('D'),
      isToday: date.isSame(dayjs(), 'day'),
    };
  });

  if (loading) {
    return (
      <DoctorLayout>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
          <CircularProgress />
        </Box>
      </DoctorLayout>
    );
  }

  return (
    <DoctorLayout>
      <PageHeader
        title="My Schedule"
        subtitle="View and manage your appointments"
      />

      {/* Date Selector */}
      <Box sx={{ display: 'flex', gap: 1, mb: 4, overflowX: 'auto', pb: 1 }}>
        {weekDates.map((d) => (
          <Button
            key={d.date}
            variant={selectedDate === d.date ? 'contained' : 'outlined'}
            onClick={() => setSelectedDate(d.date)}
            sx={{
              minWidth: 70,
              flexDirection: 'column',
              py: 1.5,
              borderColor: d.isToday ? 'primary.main' : undefined,
            }}
          >
            <Typography variant="caption">{d.day}</Typography>
            <Typography variant="h6">{d.dayNum}</Typography>
          </Button>
        ))}
      </Box>

      {/* Appointments */}
      <Grid container spacing={2}>
        {appointments.length === 0 ? (
          <Grid item xs={12}>
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 6 }}>
                <EventNote sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                <Typography color="text.secondary">
                  No appointments scheduled for this date
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ) : (
          appointments.map((apt: any) => (
            <Grid item xs={12} md={6} key={apt.id}>
              <Card sx={{ 
                borderLeft: 4, 
                borderColor: apt.status === 'COMPLETED' ? 'success.main' : 
                             apt.status === 'IN_PROGRESS' ? 'primary.main' : 'warning.main' 
              }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                      <Avatar sx={{ bgcolor: 'primary.light' }}>
                        {apt.patient?.user?.firstName?.[0]}{apt.patient?.user?.lastName?.[0]}
                      </Avatar>
                      <Box>
                        <Typography variant="subtitle1" fontWeight={600}>
                          {apt.patient?.user?.firstName} {apt.patient?.user?.lastName}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {apt.type}
                        </Typography>
                      </Box>
                    </Box>
                    <Chip
                      label={apt.status?.toLowerCase().replace('_', ' ')}
                      size="small"
                      color={getStatusColor(apt.status) as any}
                      sx={{ textTransform: 'capitalize' }}
                    />
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <AccessTime fontSize="small" color="action" />
                    <Typography variant="body2">
                      {dayjs(apt.scheduledAt).format('hh:mm A')}
                    </Typography>
                  </Box>

                  {apt.notes && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      Notes: {apt.notes}
                    </Typography>
                  )}

                  <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                    <Button size="small" variant="outlined" startIcon={<Edit />} onClick={() => handleEdit(apt)}>
                      Edit
                    </Button>
                    {apt.status === 'SCHEDULED' || apt.status === 'CONFIRMED' ? (
                      <Button 
                        size="small" 
                        variant="contained" 
                        startIcon={<CheckCircle />}
                        onClick={async () => {
                          await appointmentsApi.update(apt.id, { status: 'IN_PROGRESS' });
                          fetchAppointments();
                        }}
                      >
                        Start
                      </Button>
                    ) : apt.status === 'IN_PROGRESS' ? (
                      <Button 
                        size="small" 
                        variant="contained" 
                        color="success"
                        startIcon={<CheckCircle />}
                        onClick={async () => {
                          await appointmentsApi.update(apt.id, { status: 'COMPLETED' });
                          fetchAppointments();
                        }}
                      >
                        Complete
                      </Button>
                    ) : null}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))
        )}
      </Grid>

      {/* Edit Dialog */}
      <Dialog open={editDialog} onClose={() => setEditDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Appointment</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2, mb: 2 }}>
            <InputLabel>Status</InputLabel>
            <Select value={status} label="Status" onChange={(e) => setStatus(e.target.value)}>
              <MenuItem value="SCHEDULED">Scheduled</MenuItem>
              <MenuItem value="CONFIRMED">Confirmed</MenuItem>
              <MenuItem value="IN_PROGRESS">In Progress</MenuItem>
              <MenuItem value="COMPLETED">Completed</MenuItem>
              <MenuItem value="CANCELLED">Cancelled</MenuItem>
            </Select>
          </FormControl>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? <CircularProgress size={20} /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </DoctorLayout>
  );
}
