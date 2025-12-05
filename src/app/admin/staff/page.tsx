'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  TextField,
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Snackbar,
  Alert,
} from '@mui/material';
import { Add, Edit, Delete, Person, AdminPanelSettings } from '@mui/icons-material';
import AdminLayout from '@/components/layouts/AdminLayout';
import PageHeader from '@/components/common/PageHeader';
import { extendedAuthApi } from '@/lib/api';

interface StaffUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

export default function StaffManagementPage() {
  const [staffUsers, setStaffUsers] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const [newStaff, setNewStaff] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    role: 'STAFF',
  });

  useEffect(() => {
    fetchStaffUsers();
  }, []);

  const fetchStaffUsers = async () => {
    setLoading(true);
    try {
      // Staff list would require a dedicated endpoint
      // For now, show empty - created staff can login immediately
      setStaffUsers([]);
    } catch (error) {
      console.error('Failed to fetch staff:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newStaff.email || !newStaff.firstName || !newStaff.password) {
      setSnackbar({ open: true, message: 'Please fill required fields (Name, Email, Password)', severity: 'error' });
      return;
    }
    if (newStaff.password.length < 6) {
      setSnackbar({ open: true, message: 'Password must be at least 6 characters', severity: 'error' });
      return;
    }
    setSaving(true);
    try {
      const response = await extendedAuthApi.createStaff(newStaff);
      if (response.success) {
        setSnackbar({ 
          open: true, 
          message: `Staff user created! Email: ${newStaff.email}`, 
          severity: 'success' 
        });
        setDialogOpen(false);
        setNewStaff({
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          password: '',
          role: 'STAFF',
        });
        fetchStaffUsers();
      } else {
        setSnackbar({ open: true, message: response.error || 'Failed to create staff', severity: 'error' });
      }
    } catch (error: any) {
      setSnackbar({ 
        open: true, 
        message: error.response?.data?.error || 'Failed to create staff user', 
        severity: 'error' 
      });
    } finally {
      setSaving(false);
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'SUPERADMIN':
        return 'error';
      case 'STAFF':
        return 'primary';
      default:
        return 'default';
    }
  };

  return (
    <AdminLayout>
      <PageHeader
        title="Staff Management"
        subtitle="Create and manage admin and staff users"
        action={
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setDialogOpen(true)}
          >
            Add Staff
          </Button>
        }
      />

      <Card>
        <CardContent>
          <Box sx={{ mb: 3 }}>
            <Typography variant="body2" color="text.secondary">
              Create staff and admin users who can access the admin portal. Staff users can manage patients, 
              doctors, and appointments. Superadmins have full system access.
            </Typography>
          </Box>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>User</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Phone</TableCell>
                    <TableCell>Role</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {staffUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                        <Typography color="text.secondary">
                          No staff users found. Click "Add Staff" to create one.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    staffUsers.map((staff) => (
                      <TableRow key={staff.id}>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Avatar sx={{ bgcolor: staff.role === 'SUPERADMIN' ? 'error.main' : 'primary.main' }}>
                              {staff.role === 'SUPERADMIN' ? <AdminPanelSettings /> : <Person />}
                            </Avatar>
                            <Box>
                              <Typography variant="body2" fontWeight={600}>
                                {staff.firstName} {staff.lastName}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>{staff.email}</TableCell>
                        <TableCell>{staff.phone || '-'}</TableCell>
                        <TableCell>
                          <Chip 
                            label={staff.role} 
                            size="small" 
                            color={getRoleColor(staff.role) as any}
                          />
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={staff.isActive ? 'Active' : 'Inactive'} 
                            size="small" 
                            color={staff.isActive ? 'success' : 'default'}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <IconButton size="small">
                            <Edit fontSize="small" />
                          </IconButton>
                          <IconButton size="small" color="error">
                            <Delete fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Create Staff Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add New Staff User</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="First Name"
                required
                value={newStaff.firstName}
                onChange={(e) => setNewStaff({ ...newStaff, firstName: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Last Name"
                value={newStaff.lastName}
                onChange={(e) => setNewStaff({ ...newStaff, lastName: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                required
                value={newStaff.email}
                onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Phone"
                value={newStaff.phone}
                onChange={(e) => setNewStaff({ ...newStaff, phone: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                select
                label="Role"
                required
                value={newStaff.role}
                onChange={(e) => setNewStaff({ ...newStaff, role: e.target.value })}
              >
                <MenuItem value="STAFF">Staff</MenuItem>
                <MenuItem value="SUPERADMIN">Super Admin</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Password"
                type="password"
                required
                value={newStaff.password}
                onChange={(e) => setNewStaff({ ...newStaff, password: e.target.value })}
                helperText="Minimum 6 characters. User should change after first login."
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreate} disabled={saving}>
            {saving ? <CircularProgress size={20} /> : 'Create User'}
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
