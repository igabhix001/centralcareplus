'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Grid,
  Avatar,
  Divider,
  Alert,
  MenuItem,
  CircularProgress,
  Snackbar,
} from '@mui/material';
import { Save, Upload, Person, PhotoCamera } from '@mui/icons-material';
import PatientLayout from '@/components/layouts/PatientLayout';
import PageHeader from '@/components/common/PageHeader';
import { useAuthStore } from '@/store/authStore';
import { patientsApi, authApi } from '@/lib/api';
import dayjs from 'dayjs';

export default function PatientProfilePage() {
  const { user, login: updateUser } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [profile, setProfile] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    gender: '',
    bloodGroup: '',
    address: '',
    emergencyContact: '',
    emergencyPhone: '',
    insuranceId: '',
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const response = await authApi.me();
      if (response.success && response.data) {
        const userData = response.data;
        setProfile({
          firstName: userData.firstName || '',
          lastName: userData.lastName || '',
          email: userData.email || '',
          phone: userData.phone || '',
          dateOfBirth: userData.patient?.dateOfBirth ? dayjs(userData.patient.dateOfBirth).format('YYYY-MM-DD') : '',
          gender: userData.patient?.gender || '',
          bloodGroup: userData.patient?.bloodGroup || '',
          address: userData.patient?.address || '',
          emergencyContact: userData.patient?.emergencyContact || '',
          emergencyPhone: userData.patient?.emergencyPhone || '',
          insuranceId: userData.patient?.insuranceId || '',
        });
        if (userData.avatar) {
          setAvatarPreview(userData.avatar);
        }
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setProfile({ ...profile, [field]: e.target.value });
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Update patient profile
      if (user?.patientId) {
        await patientsApi.update(user.patientId, {
          dateOfBirth: profile.dateOfBirth ? new Date(profile.dateOfBirth) : undefined,
          gender: profile.gender,
          bloodGroup: profile.bloodGroup,
          address: profile.address,
          emergencyContact: profile.emergencyContact,
          emergencyPhone: profile.emergencyPhone,
          insuranceId: profile.insuranceId,
        });
      }
      setSnackbar({ open: true, message: 'Profile updated successfully!', severity: 'success' });
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to update profile', severity: 'error' });
    } finally {
      setSaving(false);
    }
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
        title="My Profile"
        subtitle="Manage your personal information"
      />

      <Grid container spacing={3}>
        {/* Profile Photo & Basic Info */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Box sx={{ position: 'relative', display: 'inline-block' }}>
                <Avatar
                  src={avatarPreview || undefined}
                  sx={{
                    width: 120,
                    height: 120,
                    mx: 'auto',
                    mb: 2,
                    bgcolor: 'primary.main',
                    fontSize: 48,
                  }}
                >
                  {profile.firstName?.[0]}{profile.lastName?.[0]}
                </Avatar>
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={handlePhotoUpload}
                  style={{ display: 'none' }}
                />
                <Button
                  size="small"
                  variant="contained"
                  sx={{
                    position: 'absolute',
                    bottom: 15,
                    right: -10,
                    minWidth: 36,
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    p: 0,
                  }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <PhotoCamera fontSize="small" />
                </Button>
              </Box>
              <Typography variant="h6">
                {profile.firstName} {profile.lastName}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {profile.email}
              </Typography>
              <Button variant="outlined" startIcon={<Upload />} sx={{ mt: 2 }} onClick={() => fileInputRef.current?.click()}>
                Change Photo
              </Button>
            </CardContent>
          </Card>

          <Card sx={{ mt: 3 }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                Quick Info
              </Typography>
              <Box sx={{ '& > div': { py: 1, borderBottom: 1, borderColor: 'divider' } }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Blood Group</Typography>
                  <Typography variant="body2" fontWeight={500}>{profile.bloodGroup}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Gender</Typography>
                  <Typography variant="body2" fontWeight={500}>{profile.gender}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Date of Birth</Typography>
                  <Typography variant="body2" fontWeight={500}>{profile.dateOfBirth}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', border: 0 }}>
                  <Typography variant="body2" color="text.secondary">Insurance ID</Typography>
                  <Typography variant="body2" fontWeight={500}>{profile.insuranceId}</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Edit Form */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <Person color="primary" />
                <Typography variant="h6">Personal Information</Typography>
              </Box>

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="First Name"
                    fullWidth
                    value={profile.firstName}
                    onChange={handleChange('firstName')}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Last Name"
                    fullWidth
                    value={profile.lastName}
                    onChange={handleChange('lastName')}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Email"
                    type="email"
                    fullWidth
                    value={profile.email}
                    onChange={handleChange('email')}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Phone"
                    fullWidth
                    value={profile.phone}
                    onChange={handleChange('phone')}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Date of Birth"
                    type="date"
                    fullWidth
                    value={profile.dateOfBirth}
                    onChange={handleChange('dateOfBirth')}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Gender"
                    select
                    fullWidth
                    value={profile.gender}
                    onChange={handleChange('gender')}
                  >
                    <MenuItem value="Male">Male</MenuItem>
                    <MenuItem value="Female">Female</MenuItem>
                    <MenuItem value="Other">Other</MenuItem>
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Blood Group"
                    select
                    fullWidth
                    value={profile.bloodGroup}
                    onChange={handleChange('bloodGroup')}
                  >
                    {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map((bg) => (
                      <MenuItem key={bg} value={bg}>{bg}</MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Insurance ID"
                    fullWidth
                    value={profile.insuranceId}
                    onChange={handleChange('insuranceId')}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label="Address"
                    fullWidth
                    multiline
                    rows={2}
                    value={profile.address}
                    onChange={handleChange('address')}
                  />
                </Grid>
              </Grid>

              <Divider sx={{ my: 3 }} />

              <Typography variant="h6" gutterBottom>
                Emergency Contact
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Contact Name"
                    fullWidth
                    value={profile.emergencyContact}
                    onChange={handleChange('emergencyContact')}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Contact Phone"
                    fullWidth
                    value={profile.emergencyPhone}
                    onChange={handleChange('emergencyPhone')}
                  />
                </Grid>
              </Grid>

              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
                <Button
                  variant="contained"
                  size="large"
                  startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <Save />}
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </PatientLayout>
  );
}
