'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  TextField,
  InputAdornment,
  MenuItem,
  Avatar,
  Button,
  Rating,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
  Snackbar,
} from '@mui/material';
import { Search, Schedule, AccessTime } from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import PatientLayout from '@/components/layouts/PatientLayout';
import PageHeader from '@/components/common/PageHeader';
import { doctorsApi, appointmentsApi } from '@/lib/api';

const specializations = [
  'All Specializations',
  'Cardiology',
  'Neurology',
  'Orthopedics',
  'Pediatrics',
  'Dermatology',
  'Gynecology',
  'General Medicine',
];

export default function DoctorsDirectoryPage() {
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [specialty, setSpecialty] = useState('All Specializations');
  const [bookingOpen, setBookingOpen] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<dayjs.Dayjs | null>(dayjs());
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [booking, setBooking] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const [appointmentType, setAppointmentType] = useState('consultation');

  useEffect(() => {
    fetchDoctors();
  }, [searchQuery, specialty]);

  const fetchDoctors = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (searchQuery) params.search = searchQuery;
      if (specialty !== 'All Specializations') params.specialization = specialty;
      
      const response = await doctorsApi.getAll(params);
      if (response.success) {
        setDoctors(response.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch doctors:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSlots = async (doctorId: string, date: dayjs.Dayjs) => {
    setLoadingSlots(true);
    try {
      const response = await doctorsApi.getSlots(doctorId, date.format('YYYY-MM-DD'));
      if (response.success) {
        setAvailableSlots(response.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch slots:', error);
      setAvailableSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleBookAppointment = (doctor: any) => {
    setSelectedDoctor(doctor);
    setSelectedSlot(null);
    setBookingOpen(true);
    if (selectedDate) {
      fetchSlots(doctor.id, selectedDate);
    }
  };

  const handleDateChange = (date: dayjs.Dayjs | null) => {
    setSelectedDate(date);
    setSelectedSlot(null);
    if (date && selectedDoctor) {
      fetchSlots(selectedDoctor.id, date);
    }
  };

  const handleConfirmBooking = async () => {
    if (!selectedDoctor || !selectedDate || !selectedSlot) return;

    setBooking(true);
    try {
      const [hours, minutes] = selectedSlot.split(':');
      const scheduledAt = selectedDate
        .hour(parseInt(hours))
        .minute(parseInt(minutes))
        .second(0)
        .toISOString();

      const response = await appointmentsApi.create({
        doctorId: selectedDoctor.id,
        scheduledAt,
        type: appointmentType,
        notes: `Appointment with Dr. ${selectedDoctor.user.firstName} ${selectedDoctor.user.lastName}`,
      });

      if (response.success) {
        setSnackbar({ open: true, message: 'Appointment booked successfully!', severity: 'success' });
        setBookingOpen(false);
        setSelectedSlot(null);
      } else {
        setSnackbar({ open: true, message: response.error || 'Failed to book appointment', severity: 'error' });
      }
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to book appointment', severity: 'error' });
    } finally {
      setBooking(false);
    }
  };

  const formatSlotTime = (slot: string) => {
    const [hours, minutes] = slot.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const displayHour = h > 12 ? h - 12 : h === 0 ? 12 : h;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  return (
    <PatientLayout>
      <PageHeader
        title="Find Doctors"
        subtitle="Browse and book appointments with our specialists"
      />

      {/* Filters */}
      <Box sx={{ display: 'flex', gap: 2, mb: 4, flexWrap: 'wrap' }}>
        <TextField
          placeholder="Search doctors..."
          size="small"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{ width: { xs: '100%', sm: 300 } }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          }}
        />
        <TextField
          select
          size="small"
          value={specialty}
          onChange={(e) => setSpecialty(e.target.value)}
          sx={{ width: { xs: '100%', sm: 200 } }}
        >
          {specializations.map((spec) => (
            <MenuItem key={spec} value={spec}>
              {spec}
            </MenuItem>
          ))}
        </TextField>
      </Box>

      {/* Doctors Grid */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : doctors.length === 0 ? (
        <Alert severity="info">No doctors found matching your criteria.</Alert>
      ) : (
        <Grid container spacing={3}>
          {doctors.map((doctor) => (
            <Grid item xs={12} sm={6} lg={4} key={doctor.id}>
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
                <CardContent>
                  <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                    <Avatar
                      sx={{
                        width: 72,
                        height: 72,
                        bgcolor: 'primary.main',
                        fontSize: '1.5rem',
                      }}
                    >
                      {doctor.user?.firstName?.[0]}{doctor.user?.lastName?.[0]}
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6" fontWeight={600}>
                        Dr. {doctor.user?.firstName} {doctor.user?.lastName}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {doctor.specialization}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                        <Rating value={doctor.rating || 4.5} precision={0.1} size="small" readOnly />
                        <Typography variant="caption" color="text.secondary">
                          ({doctor.reviewCount || 0})
                        </Typography>
                      </Box>
                    </Box>
                  </Box>

                  <Box sx={{ display: 'flex', gap: 3, mb: 2 }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Experience
                      </Typography>
                      <Typography variant="body2" fontWeight={500}>
                        {doctor.experience} years
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Consultation
                      </Typography>
                      <Typography variant="body2" fontWeight={500}>
                        ₹{doctor.consultationFee}
                      </Typography>
                    </Box>
                  </Box>

                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      p: 1.5,
                      bgcolor: 'success.light',
                      borderRadius: 1,
                      mb: 2,
                    }}
                  >
                    <AccessTime sx={{ fontSize: 18, color: 'success.main' }} />
                    <Typography variant="body2" fontWeight={500}>
                      Available {doctor.availableDays?.slice(0, 3).join(', ')}
                    </Typography>
                  </Box>

                  <Button
                    fullWidth
                    variant="contained"
                    startIcon={<Schedule />}
                    onClick={() => handleBookAppointment(doctor)}
                  >
                    Book Appointment
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Booking Dialog */}
      <Dialog open={bookingOpen} onClose={() => setBookingOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Book Appointment with Dr. {selectedDoctor?.user?.firstName} {selectedDoctor?.user?.lastName}
        </DialogTitle>
        <DialogContent>
          {selectedDoctor && (
            <Box sx={{ mt: 2 }}>
              <Box sx={{ display: 'flex', gap: 2, mb: 3, p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
                <Avatar sx={{ width: 56, height: 56, bgcolor: 'primary.main' }}>
                  {selectedDoctor.user?.firstName?.[0]}{selectedDoctor.user?.lastName?.[0]}
                </Avatar>
                <Box>
                  <Typography variant="subtitle1" fontWeight={600}>
                    Dr. {selectedDoctor.user?.firstName} {selectedDoctor.user?.lastName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedDoctor.specialization}
                  </Typography>
                  <Typography variant="body2" fontWeight={500} color="primary">
                    Consultation Fee: ₹{selectedDoctor.consultationFee}
                  </Typography>
                </Box>
              </Box>

              <TextField
                select
                fullWidth
                label="Appointment Type"
                value={appointmentType}
                onChange={(e) => setAppointmentType(e.target.value)}
                sx={{ mb: 3 }}
              >
                <MenuItem value="consultation">Consultation</MenuItem>
                <MenuItem value="checkup">Check-up</MenuItem>
                <MenuItem value="followup">Follow-up</MenuItem>
              </TextField>

              <Typography variant="subtitle2" gutterBottom>
                Select Date
              </Typography>
              <DatePicker
                value={selectedDate}
                onChange={handleDateChange}
                minDate={dayjs()}
                slotProps={{ textField: { fullWidth: true, sx: { mb: 3 } } }}
              />

              <Typography variant="subtitle2" gutterBottom>
                Available Time Slots
              </Typography>
              {loadingSlots ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                  <CircularProgress size={24} />
                </Box>
              ) : availableSlots.length === 0 ? (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  No slots available for this date. Please select another date.
                </Alert>
              ) : (
                <Grid container spacing={1}>
                  {availableSlots.map((slot) => (
                    <Grid item xs={4} key={slot}>
                      <Button
                        fullWidth
                        variant={selectedSlot === slot ? 'contained' : 'outlined'}
                        size="small"
                        onClick={() => setSelectedSlot(slot)}
                        sx={{ py: 1 }}
                      >
                        {formatSlotTime(slot)}
                      </Button>
                    </Grid>
                  ))}
                </Grid>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setBookingOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleConfirmBooking}
            disabled={!selectedSlot || booking}
          >
            {booking ? <CircularProgress size={20} /> : 'Confirm Booking'}
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
