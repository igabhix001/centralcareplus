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
  Rating,
  CircularProgress,
  Snackbar,
  Alert,
} from '@mui/material';
import { Search, Add, Edit, Visibility, Delete, Star, Schedule } from '@mui/icons-material';
import AdminLayout from '@/components/layouts/AdminLayout';
import PageHeader from '@/components/common/PageHeader';
import { doctorsApi } from '@/lib/api';

const specializations = [
  'Cardiology',
  'Neurology',
  'Orthopedics',
  'Pediatrics',
  'Dermatology',
  'Psychiatry',
  'General Medicine',
  'Gynecology',
  'Ophthalmology',
  'ENT',
];

export default function DoctorsPage() {
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const [newDoctor, setNewDoctor] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: 'Doctor@123', // Default password
    specialization: '',
    experience: 0,
    consultationFee: 0,
    qualification: '',
    bio: '',
  });

  useEffect(() => {
    fetchDoctors();
  }, []);

  const fetchDoctors = async () => {
    setLoading(true);
    try {
      const response = await doctorsApi.getAll();
      if (response.success) {
        const formattedDoctors = (response.data || []).map((d: any) => ({
          id: d.id,
          name: `Dr. ${d.user?.firstName || ''} ${d.user?.lastName || ''}`.trim(),
          email: d.user?.email || '',
          phone: d.user?.phone || '',
          specialization: d.specialization || '',
          experience: d.experience || 0,
          fee: d.consultationFee || 0,
          rating: d.rating || 4.5,
          patients: d.totalPatients || 0,
          status: d.isAvailable ? 'available' : 'busy',
          raw: d,
        }));
        setDoctors(formattedDoctors);
      }
    } catch (error) {
      console.error('Failed to fetch doctors:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this doctor?')) return;
    try {
      await doctorsApi.delete(id);
      setSnackbar({ open: true, message: 'Doctor deleted', severity: 'success' });
      fetchDoctors();
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to delete', severity: 'error' });
    }
  };

  const handleOpenDialog = (doctor?: any) => {
    if (doctor) {
      // Edit mode - populate form with existing data
      setSelectedDoctor(doctor);
      setNewDoctor({
        firstName: doctor.raw?.user?.firstName || doctor.name?.replace('Dr. ', '').split(' ')[0] || '',
        lastName: doctor.raw?.user?.lastName || doctor.name?.replace('Dr. ', '').split(' ').slice(1).join(' ') || '',
        email: doctor.email || '',
        phone: doctor.phone || '',
        password: '', // Don't show password for edit
        specialization: doctor.specialization || '',
        experience: doctor.experience || 0,
        consultationFee: doctor.fee || 0,
        qualification: doctor.raw?.qualification || '',
        bio: doctor.raw?.bio || '',
      });
    } else {
      // Create mode - reset form
      setSelectedDoctor(null);
      setNewDoctor({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        password: 'Doctor@123',
        specialization: '',
        experience: 0,
        consultationFee: 0,
        qualification: '',
        bio: '',
      });
    }
    setDialogOpen(true);
  };

  const handleUpdate = async () => {
    if (!selectedDoctor) return;
    if (!newDoctor.firstName || !newDoctor.specialization) {
      setSnackbar({ open: true, message: 'Please fill required fields', severity: 'error' });
      return;
    }
    setSaving(true);
    try {
      const response = await doctorsApi.update(selectedDoctor.id, {
        firstName: newDoctor.firstName,
        lastName: newDoctor.lastName,
        specialization: newDoctor.specialization,
        experience: Number(newDoctor.experience),
        consultationFee: Number(newDoctor.consultationFee),
        qualification: newDoctor.qualification,
        bio: newDoctor.bio,
      });
      if (response.success) {
        setSnackbar({ open: true, message: 'Doctor updated successfully!', severity: 'success' });
        setDialogOpen(false);
        setSelectedDoctor(null);
        fetchDoctors();
      } else {
        setSnackbar({ open: true, message: response.error || 'Failed to update', severity: 'error' });
      }
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to update doctor', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleCreate = async () => {
    if (!newDoctor.email || !newDoctor.firstName || !newDoctor.specialization) {
      setSnackbar({ open: true, message: 'Please fill required fields', severity: 'error' });
      return;
    }
    setSaving(true);
    try {
      const response = await doctorsApi.create({
        ...newDoctor,
        experience: Number(newDoctor.experience),
        consultationFee: Number(newDoctor.consultationFee),
      });
      if (response.success) {
        setSnackbar({ open: true, message: `Doctor created successfully! Email: ${newDoctor.email}`, severity: 'success' });
        setDialogOpen(false);
        fetchDoctors();
        setNewDoctor({
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          password: 'Doctor@123',
          specialization: '',
          experience: 0,
          consultationFee: 0,
          qualification: '',
          bio: '',
        });
      } else {
        setSnackbar({ open: true, message: response.error || 'Failed to create', severity: 'error' });
      }
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to create doctor', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'success';
      case 'busy':
        return 'warning';
      case 'on-leave':
        return 'error';
      default:
        return 'default';
    }
  };

  const filteredDoctors = doctors.filter(
    (d: any) =>
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.specialization.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
        title="Doctors"
        subtitle="Manage doctor profiles and schedules"
        action={
          <Button variant="contained" startIcon={<Add />} onClick={() => handleOpenDialog()}>
            Add Doctor
          </Button>
        }
      />

      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <TextField
          placeholder="Search doctors..."
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
        <TextField
          select
          size="small"
          label="Specialization"
          sx={{ width: 180 }}
          defaultValue=""
        >
          <MenuItem value="">All</MenuItem>
          {specializations.map((spec) => (
            <MenuItem key={spec} value={spec}>
              {spec}
            </MenuItem>
          ))}
        </TextField>
      </Box>

      <Grid container spacing={3}>
        {filteredDoctors.map((doctor) => (
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
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Avatar
                      sx={{
                        width: 64,
                        height: 64,
                        bgcolor: 'primary.main',
                        fontSize: '1.5rem',
                      }}
                    >
                      {doctor.name.split(' ').slice(1).map((n: string) => n[0]).join('')}
                    </Avatar>
                    <Box>
                      <Typography variant="h6" fontWeight={600}>
                        {doctor.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {doctor.specialization}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                        <Star sx={{ fontSize: 16, color: 'warning.main' }} />
                        <Typography variant="body2" fontWeight={500}>
                          {doctor.rating}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                  <Chip
                    label={doctor.status}
                    size="small"
                    color={getStatusColor(doctor.status) as any}
                    sx={{ textTransform: 'capitalize' }}
                  />
                </Box>

                <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
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
                      Patients
                    </Typography>
                    <Typography variant="body2" fontWeight={500}>
                      {doctor.patients}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Fee
                    </Typography>
                    <Typography variant="body2" fontWeight={500}>
                      ${doctor.fee}
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<Schedule />}
                    fullWidth
                  >
                    Schedule
                  </Button>
                  <IconButton
                    size="small"
                    onClick={() => handleOpenDialog(doctor)}
                  >
                    <Edit fontSize="small" />
                  </IconButton>
                  <IconButton size="small" color="error" onClick={() => handleDelete(doctor.id)}>
                    <Delete fontSize="small" />
                  </IconButton>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Doctor Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {selectedDoctor ? 'Edit Doctor' : 'Add New Doctor'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="First Name"
                required
                value={newDoctor.firstName}
                onChange={(e) => setNewDoctor({ ...newDoctor, firstName: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Last Name"
                value={newDoctor.lastName}
                onChange={(e) => setNewDoctor({ ...newDoctor, lastName: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                required
                value={newDoctor.email}
                onChange={(e) => setNewDoctor({ ...newDoctor, email: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Phone"
                value={newDoctor.phone}
                onChange={(e) => setNewDoctor({ ...newDoctor, phone: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Password"
                type="password"
                required
                value={newDoctor.password}
                onChange={(e) => setNewDoctor({ ...newDoctor, password: e.target.value })}
                helperText="Minimum 6 characters. Doctor should change after first login."
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                select
                label="Specialization"
                required
                value={newDoctor.specialization}
                onChange={(e) => setNewDoctor({ ...newDoctor, specialization: e.target.value })}
              >
                {specializations.map((spec) => (
                  <MenuItem key={spec} value={spec}>
                    {spec}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Experience (years)"
                type="number"
                value={newDoctor.experience}
                onChange={(e) => setNewDoctor({ ...newDoctor, experience: Number(e.target.value) })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Consultation Fee (₹)"
                type="number"
                value={newDoctor.consultationFee}
                onChange={(e) => setNewDoctor({ ...newDoctor, consultationFee: Number(e.target.value) })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Qualification"
                placeholder="e.g., MD, MBBS, PhD"
                value={newDoctor.qualification}
                onChange={(e) => setNewDoctor({ ...newDoctor, qualification: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Bio"
                multiline
                rows={3}
                placeholder="Brief description about the doctor"
                value={newDoctor.bio}
                onChange={(e) => setNewDoctor({ ...newDoctor, bio: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={selectedDoctor ? handleUpdate : handleCreate} disabled={saving}>
            {saving ? <CircularProgress size={20} /> : selectedDoctor ? 'Update' : 'Create'}
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
