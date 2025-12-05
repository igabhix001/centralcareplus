'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
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
  CircularProgress,
  Snackbar,
  Alert,
} from '@mui/material';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { Search, Add, Edit, Visibility, Delete, FilterList } from '@mui/icons-material';
import AdminLayout from '@/components/layouts/AdminLayout';
import PageHeader from '@/components/common/PageHeader';
import { patientsApi } from '@/lib/api';
import dayjs from 'dayjs';

export default function PatientsPage() {
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    setLoading(true);
    try {
      const response = await patientsApi.getAll();
      if (response.success) {
        const formattedPatients = (response.data || []).map((p: any) => ({
          id: p.id,
          name: `${p.user?.firstName || ''} ${p.user?.lastName || ''}`.trim(),
          email: p.user?.email || '',
          phone: p.user?.phone || '',
          age: p.dateOfBirth ? dayjs().diff(dayjs(p.dateOfBirth), 'year') : '-',
          gender: p.gender || '-',
          status: p.user?.isActive ? 'active' : 'inactive',
          lastVisit: p.lastVisit ? dayjs(p.lastVisit).format('YYYY-MM-DD') : '-',
          bloodGroup: p.bloodGroup,
          raw: p,
        }));
        setPatients(formattedPatients);
      }
    } catch (error) {
      console.error('Failed to fetch patients:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this patient?')) return;
    try {
      await patientsApi.delete(id);
      setSnackbar({ open: true, message: 'Patient deleted', severity: 'success' });
      fetchPatients();
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to delete', severity: 'error' });
    }
  };

  const columns: GridColDef[] = [
    {
      field: 'name',
      headerName: 'Patient',
      flex: 1,
      minWidth: 200,
      renderCell: (params: GridRenderCellParams) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar sx={{ bgcolor: 'primary.main', width: 36, height: 36 }}>
            {params.value.charAt(0)}
          </Avatar>
          <Box>
            <Typography variant="body2" fontWeight={500}>
              {params.value}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {params.row.email}
            </Typography>
          </Box>
        </Box>
      ),
    },
    { field: 'phone', headerName: 'Phone', flex: 0.5, minWidth: 120 },
    { field: 'age', headerName: 'Age', width: 80 },
    { field: 'gender', headerName: 'Gender', width: 100 },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      renderCell: (params: GridRenderCellParams) => (
        <Chip
          label={params.value}
          size="small"
          color={params.value === 'active' ? 'success' : 'default'}
          sx={{ textTransform: 'capitalize' }}
        />
      ),
    },
    { field: 'lastVisit', headerName: 'Last Visit', width: 120 },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 150,
      sortable: false,
      renderCell: (params: GridRenderCellParams) => (
        <Box>
          <IconButton size="small" onClick={() => handleView(params.row)}>
            <Visibility fontSize="small" />
          </IconButton>
          <IconButton size="small" onClick={() => handleEdit(params.row)}>
            <Edit fontSize="small" />
          </IconButton>
          <IconButton size="small" color="error" onClick={() => handleDelete(params.row.id)}>
            <Delete fontSize="small" />
          </IconButton>
        </Box>
      ),
    },
  ];

  const handleView = (patient: any) => {
    setSelectedPatient(patient);
    setDialogOpen(true);
  };

  const handleEdit = (patient: any) => {
    setSelectedPatient(patient);
    setDialogOpen(true);
  };

  const filteredPatients = patients.filter(
    (p: any) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.email.toLowerCase().includes(searchQuery.toLowerCase())
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
        title="Patients"
        subtitle="Manage all patient records"
        action={
          <Button variant="contained" startIcon={<Add />} onClick={() => setDialogOpen(true)}>
            Add Patient
          </Button>
        }
      />

      <Card>
        <Box sx={{ p: 2, display: 'flex', gap: 2 }}>
          <TextField
            placeholder="Search patients..."
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
          <Button variant="outlined" startIcon={<FilterList />}>
            Filters
          </Button>
        </Box>
        <DataGrid
          rows={filteredPatients}
          columns={columns}
          pageSizeOptions={[10, 25, 50]}
          initialState={{
            pagination: { paginationModel: { pageSize: 10 } },
          }}
          sx={{
            border: 'none',
            '& .MuiDataGrid-row:hover': {
              bgcolor: 'action.hover',
            },
          }}
          autoHeight
          disableRowSelectionOnClick
        />
      </Card>

      {/* Patient Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {selectedPatient ? 'Edit Patient' : 'Add New Patient'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Full Name"
                defaultValue={selectedPatient?.name}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                defaultValue={selectedPatient?.email}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Phone"
                defaultValue={selectedPatient?.phone}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Age"
                type="number"
                defaultValue={selectedPatient?.age}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                select
                label="Gender"
                defaultValue={selectedPatient?.gender || ''}
              >
                <MenuItem value="Male">Male</MenuItem>
                <MenuItem value="Female">Female</MenuItem>
                <MenuItem value="Other">Other</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                select
                label="Status"
                defaultValue={selectedPatient?.status || 'active'}
              >
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Address"
                multiline
                rows={2}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => setDialogOpen(false)}>
            {selectedPatient ? 'Update' : 'Create'}
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
