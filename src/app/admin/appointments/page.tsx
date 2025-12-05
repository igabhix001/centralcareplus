'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  TextField,
  InputAdornment,
  Chip,
  Avatar,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  MenuItem,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Divider,
  CircularProgress,
  Snackbar,
  Alert,
  Autocomplete,
} from '@mui/material';
import { Search, Add, Edit, Delete, CalendarMonth, ViewList, EventNote, AccessTime, Person, Download } from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import AdminLayout from '@/components/layouts/AdminLayout';
import PageHeader from '@/components/common/PageHeader';
import { appointmentsApi, patientsApi, doctorsApi } from '@/lib/api';

const getStatusColor = (status: string) => {
  switch (status?.toUpperCase()) {
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

const getTypeColor = (type: string) => {
  switch (type?.toLowerCase()) {
    case 'checkup':
      return 'primary';
    case 'followup':
      return 'secondary';
    case 'consultation':
      return 'info';
    case 'emergency':
      return 'error';
    default:
      return 'default';
  }
};

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState<dayjs.Dayjs | null>(dayjs());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  
  // New appointment form
  const [newApt, setNewApt] = useState({
    patientId: '',
    doctorId: '',
    scheduledAt: dayjs(),
    type: 'consultation',
    notes: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [aptsRes, patientsRes, doctorsRes] = await Promise.all([
        appointmentsApi.getAll(),
        patientsApi.getAll(),
        doctorsApi.getAll(),
      ]);
      if (aptsRes.success) {
        const formatted = (aptsRes.data || []).map((apt: any) => ({
          id: apt.id,
          patient: `${apt.patient?.user?.firstName || ''} ${apt.patient?.user?.lastName || ''}`.trim(),
          doctor: `Dr. ${apt.doctor?.user?.firstName || ''} ${apt.doctor?.user?.lastName || ''}`.trim(),
          date: dayjs(apt.scheduledAt).format('YYYY-MM-DD'),
          time: dayjs(apt.scheduledAt).format('hh:mm A'),
          type: apt.type,
          status: apt.status?.toLowerCase(),
          notes: apt.notes || '',
          raw: apt,
        }));
        setAppointments(formatted);
      }
      if (patientsRes.success) setPatients(patientsRes.data || []);
      if (doctorsRes.success) setDoctors(doctorsRes.data || []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (appointment?: any) => {
    if (appointment) {
      // Edit mode - populate form with existing data
      setSelectedAppointment(appointment);
      setNewApt({
        patientId: appointment.raw?.patientId || '',
        doctorId: appointment.raw?.doctorId || '',
        scheduledAt: dayjs(appointment.raw?.scheduledAt),
        type: appointment.type || 'consultation',
        notes: appointment.notes || '',
      });
    } else {
      // Create mode - reset form
      setSelectedAppointment(null);
      setNewApt({
        patientId: '',
        doctorId: '',
        scheduledAt: dayjs(),
        type: 'consultation',
        notes: '',
      });
    }
    setDialogOpen(true);
  };

  const handleUpdate = async () => {
    if (!selectedAppointment) return;
    setSaving(true);
    try {
      const response = await appointmentsApi.update(selectedAppointment.id, {
        scheduledAt: newApt.scheduledAt.toISOString(),
        type: newApt.type,
        notes: newApt.notes,
      });
      if (response.success) {
        setSnackbar({ open: true, message: 'Appointment updated!', severity: 'success' });
        setDialogOpen(false);
        setSelectedAppointment(null);
        fetchData();
      }
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to update appointment', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (appointmentId: string, status: string) => {
    try {
      await appointmentsApi.update(appointmentId, { status: status.toUpperCase() });
      setSnackbar({ open: true, message: `Status updated to ${status}`, severity: 'success' });
      fetchData();
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to update status', severity: 'error' });
    }
  };

  const handleDelete = async (appointmentId: string) => {
    if (!confirm('Are you sure you want to cancel this appointment?')) return;
    try {
      await appointmentsApi.update(appointmentId, { status: 'CANCELLED' });
      setSnackbar({ open: true, message: 'Appointment cancelled', severity: 'success' });
      fetchData();
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to cancel appointment', severity: 'error' });
    }
  };

  const handleCreate = async () => {
    if (!newApt.patientId || !newApt.doctorId) {
      setSnackbar({ open: true, message: 'Please select patient and doctor', severity: 'error' });
      return;
    }
    setSaving(true);
    try {
      const response = await appointmentsApi.create({
        patientId: newApt.patientId,
        doctorId: newApt.doctorId,
        scheduledAt: newApt.scheduledAt.toISOString(),
        type: newApt.type,
        notes: newApt.notes,
      });
      if (response.success) {
        setSnackbar({ open: true, message: 'Appointment created!', severity: 'success' });
        setDialogOpen(false);
        fetchData();
        setNewApt({ patientId: '', doctorId: '', scheduledAt: dayjs(), type: 'consultation', notes: '' });
      }
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to create appointment', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleExport = () => {
    const csvContent = [
      ['Patient', 'Doctor', 'Date', 'Time', 'Type', 'Status', 'Notes'].join(','),
      ...appointments.map((apt: any) => 
        [apt.patient, apt.doctor, apt.date, apt.time, apt.type, apt.status, apt.notes].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `appointments-${dayjs().format('YYYY-MM-DD')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredAppointments = appointments.filter(
    (a: any) =>
      a.patient.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.doctor.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupedByDate = filteredAppointments.reduce((acc: any, apt: any) => {
    const date = apt.date;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(apt);
    return acc;
  }, {} as Record<string, any[]>);

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
        title="Appointments"
        subtitle="Manage and schedule appointments"
        action={
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button variant="outlined" startIcon={<Download />} onClick={handleExport}>
              Export
            </Button>
            <Button variant="contained" startIcon={<Add />} onClick={() => handleOpenDialog()}>
              New Appointment
            </Button>
          </Box>
        }
      />

      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <TextField
          placeholder="Search appointments..."
          size="small"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{ width: 300 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          }}
        />
        <DatePicker
          label="Date"
          value={selectedDate}
          onChange={setSelectedDate}
          slotProps={{ textField: { size: 'small' } }}
        />
        <TextField
          select
          size="small"
          label="Status"
          sx={{ width: 140 }}
          defaultValue=""
        >
          <MenuItem value="">All</MenuItem>
          <MenuItem value="confirmed">Confirmed</MenuItem>
          <MenuItem value="pending">Pending</MenuItem>
          <MenuItem value="completed">Completed</MenuItem>
          <MenuItem value="cancelled">Cancelled</MenuItem>
        </TextField>
        <Box sx={{ flex: 1 }} />
        <ToggleButtonGroup
          value={view}
          exclusive
          onChange={(_, newView) => newView && setView(newView)}
          size="small"
        >
          <ToggleButton value="list">
            <ViewList />
          </ToggleButton>
          <ToggleButton value="calendar">
            <CalendarMonth />
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {view === 'list' ? (
        <Card>
          <CardContent>
            {Object.entries(groupedByDate as Record<string, any[]>).map(([date, dateAppointments]) => (
              <Box key={date} sx={{ mb: 4 }}>
                <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <EventNote color="primary" />
                  {dayjs(date).format('dddd, MMMM D, YYYY')}
                  <Chip label={`${dateAppointments.length} appointments`} size="small" />
                </Typography>
                <List>
                  {dateAppointments.map((apt: any, idx: number) => (
                    <React.Fragment key={apt.id}>
                      <ListItem
                        sx={{
                          borderRadius: 2,
                          bgcolor: 'background.paper',
                          border: 1,
                          borderColor: 'divider',
                          mb: 1,
                        }}
                        secondaryAction={
                          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                            <Chip
                              label={apt.status}
                              size="small"
                              color={getStatusColor(apt.status) as any}
                              sx={{ textTransform: 'capitalize' }}
                            />
                            <IconButton
                              size="small"
                              onClick={() => handleOpenDialog(apt)}
                            >
                              <Edit fontSize="small" />
                            </IconButton>
                            <IconButton size="small" color="error" onClick={() => handleDelete(apt.id)}>
                              <Delete fontSize="small" />
                            </IconButton>
                          </Box>
                        }
                      >
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: 'primary.light' }}>
                            <Person />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="subtitle2">{apt.patient}</Typography>
                              <Chip
                                label={apt.type}
                                size="small"
                                color={getTypeColor(apt.type) as any}
                                sx={{ textTransform: 'capitalize', height: 20 }}
                              />
                            </Box>
                          }
                          secondary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 0.5 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Person sx={{ fontSize: 16 }} />
                                <Typography variant="caption">{apt.doctor}</Typography>
                              </Box>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <AccessTime sx={{ fontSize: 16 }} />
                                <Typography variant="caption">{apt.time}</Typography>
                              </Box>
                            </Box>
                          }
                        />
                      </ListItem>
                    </React.Fragment>
                  ))}
                </List>
              </Box>
            ))}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 8 }}>
            <CalendarMonth sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6">Calendar View Coming Soon</Typography>
            <Typography variant="body2" color="text.secondary">
              Full calendar with drag-and-drop rescheduling
            </Typography>
          </CardContent>
        </Card>
      )}

      {/* Appointment Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {selectedAppointment ? 'Edit Appointment' : 'New Appointment'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <Autocomplete
                options={patients}
                getOptionLabel={(option: any) => `${option.user?.firstName || ''} ${option.user?.lastName || ''}`.trim()}
                value={patients.find((p: any) => p.id === newApt.patientId) || null}
                onChange={(_, val) => setNewApt({ ...newApt, patientId: val?.id || '' })}
                renderInput={(params) => <TextField {...params} label="Patient" required />}
              />
            </Grid>
            <Grid item xs={12}>
              <Autocomplete
                options={doctors}
                getOptionLabel={(option: any) => `Dr. ${option.user?.firstName || ''} ${option.user?.lastName || ''} - ${option.specialization || ''}`.trim()}
                value={doctors.find((d: any) => d.id === newApt.doctorId) || null}
                onChange={(_, val) => setNewApt({ ...newApt, doctorId: val?.id || '' })}
                renderInput={(params) => <TextField {...params} label="Doctor" required />}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <DatePicker
                label="Date & Time"
                value={newApt.scheduledAt}
                onChange={(val) => val && setNewApt({ ...newApt, scheduledAt: val })}
                slotProps={{ textField: { fullWidth: true } }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                select
                label="Type"
                value={newApt.type}
                onChange={(e) => setNewApt({ ...newApt, type: e.target.value })}
              >
                <MenuItem value="checkup">Checkup</MenuItem>
                <MenuItem value="followup">Follow-up</MenuItem>
                <MenuItem value="consultation">Consultation</MenuItem>
                <MenuItem value="emergency">Emergency</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Notes"
                multiline
                rows={3}
                value={newApt.notes}
                onChange={(e) => setNewApt({ ...newApt, notes: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={selectedAppointment ? handleUpdate : handleCreate} disabled={saving}>
            {saving ? <CircularProgress size={20} /> : selectedAppointment ? 'Update' : 'Schedule'}
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
    </AdminLayout>
  );
}
