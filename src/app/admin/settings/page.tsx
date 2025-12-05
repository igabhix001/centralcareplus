'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  Divider,
  Grid,
  Avatar,
  Alert,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Person,
  Security,
  Notifications,
  Palette,
  Language,
  Save,
  Upload,
} from '@mui/icons-material';
import AdminLayout from '@/components/layouts/AdminLayout';
import PageHeader from '@/components/common/PageHeader';
import { useAuthStore } from '@/store/authStore';
import { extendedAuthApi } from '@/lib/api';

export default function AdminSettingsPage() {
  const { user } = useAuthStore();
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [passwordDialog, setPasswordDialog] = useState(false);
  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordError, setPasswordError] = useState('');
  const [profile, setProfile] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  });

  useEffect(() => {
    if (user) {
      setProfile({
        firstName: user.name?.split(' ')[0] || '',
        lastName: user.name?.split(' ').slice(1).join(' ') || '',
        email: user.email || '',
        phone: '',
      });
    }
  }, [user]);
  const [settings, setSettings] = useState({
    emailNotifications: true,
    pushNotifications: true,
    twoFactorAuth: false,
    darkMode: false,
    language: 'en',
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      await extendedAuthApi.updateProfile({
        firstName: profile.firstName,
        lastName: profile.lastName,
        phone: profile.phone,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Failed to save profile:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    setPasswordError('');
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }
    if (passwordData.newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return;
    }
    setSaving(true);
    try {
      await extendedAuthApi.changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });
      setPasswordDialog(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error: any) {
      setPasswordError(error.response?.data?.error || 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <PageHeader
        title="Settings"
        subtitle="Manage your account and system preferences"
      />

      {saved && (
        <Alert severity="success" sx={{ mb: 3 }}>
          Settings saved successfully!
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Profile Settings */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <Person color="primary" />
                <Typography variant="h6">Profile Settings</Typography>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 3 }}>
                <Avatar sx={{ width: 80, height: 80, bgcolor: 'primary.main', fontSize: 32 }}>
                  AU
                </Avatar>
                <Button variant="outlined" startIcon={<Upload />}>
                  Change Photo
                </Button>
              </Box>

              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TextField
                    label="First Name"
                    fullWidth
                    value={profile.firstName}
                    onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Last Name"
                    fullWidth
                    value={profile.lastName}
                    onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label="Email"
                    type="email"
                    fullWidth
                    value={profile.email}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label="Phone"
                    fullWidth
                    value={profile.phone}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Security Settings */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <Security color="primary" />
                <Typography variant="h6">Security</Typography>
              </Box>

              <Button variant="outlined" fullWidth sx={{ mb: 2 }} onClick={() => setPasswordDialog(true)}>
                Change Password
              </Button>

              <FormControlLabel
                control={
                  <Switch
                    checked={settings.twoFactorAuth}
                    onChange={(e) => setSettings({ ...settings, twoFactorAuth: e.target.checked })}
                  />
                }
                label="Enable Two-Factor Authentication"
              />
              <Typography variant="caption" color="text.secondary" display="block" sx={{ ml: 6, mb: 2 }}>
                Add an extra layer of security to your account
              </Typography>

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle2" gutterBottom>
                Active Sessions
              </Typography>
              <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
                <Typography variant="body2" fontWeight={500}>
                  Current Session
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Windows • Chrome • Last active: Just now
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Notification Settings */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <Notifications color="primary" />
                <Typography variant="h6">Notifications</Typography>
              </Box>

              <List disablePadding>
                <ListItem sx={{ px: 0 }}>
                  <ListItemText
                    primary="Email Notifications"
                    secondary="Receive email updates about appointments and system alerts"
                  />
                  <ListItemSecondaryAction>
                    <Switch
                      checked={settings.emailNotifications}
                      onChange={(e) => setSettings({ ...settings, emailNotifications: e.target.checked })}
                    />
                  </ListItemSecondaryAction>
                </ListItem>
                <ListItem sx={{ px: 0 }}>
                  <ListItemText
                    primary="Push Notifications"
                    secondary="Get instant notifications in your browser"
                  />
                  <ListItemSecondaryAction>
                    <Switch
                      checked={settings.pushNotifications}
                      onChange={(e) => setSettings({ ...settings, pushNotifications: e.target.checked })}
                    />
                  </ListItemSecondaryAction>
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Appearance Settings */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <Palette color="primary" />
                <Typography variant="h6">Appearance</Typography>
              </Box>

              <List disablePadding>
                <ListItem sx={{ px: 0 }}>
                  <ListItemIcon>
                    <Palette />
                  </ListItemIcon>
                  <ListItemText
                    primary="Dark Mode"
                    secondary="Switch between light and dark themes"
                  />
                  <ListItemSecondaryAction>
                    <Switch
                      checked={settings.darkMode}
                      onChange={(e) => setSettings({ ...settings, darkMode: e.target.checked })}
                    />
                  </ListItemSecondaryAction>
                </ListItem>
                <ListItem sx={{ px: 0 }}>
                  <ListItemIcon>
                    <Language />
                  </ListItemIcon>
                  <ListItemText
                    primary="Language"
                    secondary="English (US)"
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Save Button */}
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              size="large"
              startIcon={<Save />}
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </Box>
        </Grid>
      </Grid>

      {/* Password Change Dialog */}
      <Dialog open={passwordDialog} onClose={() => setPasswordDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Change Password</DialogTitle>
        <DialogContent>
          {passwordError && (
            <Alert severity="error" sx={{ mb: 2, mt: 1 }}>{passwordError}</Alert>
          )}
          <TextField
            fullWidth
            label="Current Password"
            type="password"
            value={passwordData.currentPassword}
            onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
            sx={{ mt: 2 }}
          />
          <TextField
            fullWidth
            label="New Password"
            type="password"
            value={passwordData.newPassword}
            onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
            sx={{ mt: 2 }}
          />
          <TextField
            fullWidth
            label="Confirm New Password"
            type="password"
            value={passwordData.confirmPassword}
            onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setPasswordDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleChangePassword} disabled={saving}>
            {saving ? 'Changing...' : 'Change Password'}
          </Button>
        </DialogActions>
      </Dialog>
    </AdminLayout>
  );
}
