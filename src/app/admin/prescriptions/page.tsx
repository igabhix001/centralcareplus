'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  InputAdornment,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Avatar,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { Search, Visibility, Download } from '@mui/icons-material';
import AdminLayout from '@/components/layouts/AdminLayout';
import PageHeader from '@/components/common/PageHeader';
import { prescriptionsApi } from '@/lib/api';
import dayjs from 'dayjs';

export default function AdminPrescriptionsPage() {
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPrescription, setSelectedPrescription] = useState<any>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  useEffect(() => {
    fetchPrescriptions();
  }, []);

  const fetchPrescriptions = async () => {
    setLoading(true);
    try {
      const response = await prescriptionsApi.getAll();
      if (response.success) {
        setPrescriptions(response.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch prescriptions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (prescription: any) => {
    setSelectedPrescription(prescription);
    setDetailsOpen(true);
  };

  const isExpired = (validUntil: string) => dayjs(validUntil).isBefore(dayjs());

  const columns: GridColDef[] = [
    {
      field: 'patient',
      headerName: 'Patient',
      flex: 1,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
            {params.row.patient?.user?.firstName?.[0]}
          </Avatar>
          <Typography variant="body2">
            {params.row.patient?.user?.firstName} {params.row.patient?.user?.lastName}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'doctor',
      headerName: 'Doctor',
      flex: 1,
      renderCell: (params) => (
        <Typography variant="body2">
          Dr. {params.row.doctor?.user?.firstName} {params.row.doctor?.user?.lastName}
        </Typography>
      ),
    },
    {
      field: 'medications',
      headerName: 'Medications',
      width: 120,
      renderCell: (params) => (
        <Chip label={`${params.row.medications?.length || 0} items`} size="small" />
      ),
    },
    {
      field: 'createdAt',
      headerName: 'Date',
      width: 120,
      valueFormatter: (params) => dayjs(params.value).format('MMM DD, YYYY'),
    },
    {
      field: 'validUntil',
      headerName: 'Status',
      width: 100,
      renderCell: (params) => (
        <Chip 
          label={isExpired(params.value) ? 'Expired' : 'Active'} 
          size="small"
          color={isExpired(params.value) ? 'default' : 'success'}
        />
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 150,
      sortable: false,
      renderCell: (params) => (
        <Box>
          <Button
            size="small"
            startIcon={<Visibility />}
            onClick={() => handleViewDetails(params.row)}
          >
            View
          </Button>
        </Box>
      ),
    },
  ];

  const filteredPrescriptions = prescriptions.filter((rx) => {
    const patientName = `${rx.patient?.user?.firstName} ${rx.patient?.user?.lastName}`.toLowerCase();
    const doctorName = `${rx.doctor?.user?.firstName} ${rx.doctor?.user?.lastName}`.toLowerCase();
    return patientName.includes(searchQuery.toLowerCase()) ||
           doctorName.includes(searchQuery.toLowerCase());
  });

  return (
    <AdminLayout>
      <PageHeader
        title="Prescriptions"
        subtitle="View all patient prescriptions"
      />

      <Card>
        <CardContent>
          <TextField
            placeholder="Search by patient or doctor..."
            size="small"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ mb: 2, width: 350 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
          />

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <DataGrid
              rows={filteredPrescriptions}
              columns={columns}
              initialState={{
                pagination: { paginationModel: { pageSize: 10 } },
              }}
              pageSizeOptions={[10, 25, 50]}
              disableRowSelectionOnClick
              autoHeight
              sx={{ border: 0 }}
            />
          )}
        </CardContent>
      </Card>

      {/* Prescription Details Dialog */}
      <Dialog open={detailsOpen} onClose={() => setDetailsOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Prescription Details</DialogTitle>
        <DialogContent>
          {selectedPrescription && (
            <Box sx={{ mt: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">Patient</Typography>
                  <Typography variant="body1" fontWeight={500}>
                    {selectedPrescription.patient?.user?.firstName} {selectedPrescription.patient?.user?.lastName}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Doctor</Typography>
                  <Typography variant="body1" fontWeight={500}>
                    Dr. {selectedPrescription.doctor?.user?.firstName} {selectedPrescription.doctor?.user?.lastName}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Valid Until</Typography>
                  <Typography variant="body1">
                    {dayjs(selectedPrescription.validUntil).format('MMM DD, YYYY')}
                  </Typography>
                </Box>
              </Box>

              <Typography variant="subtitle2" gutterBottom>Medications</Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Medicine</TableCell>
                    <TableCell>Dosage</TableCell>
                    <TableCell>Frequency</TableCell>
                    <TableCell>Duration</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {selectedPrescription.medications?.map((med: any, idx: number) => (
                    <TableRow key={idx}>
                      <TableCell>{med.name}</TableCell>
                      <TableCell>{med.dosage}</TableCell>
                      <TableCell>{med.frequency}</TableCell>
                      <TableCell>{med.duration}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {selectedPrescription.instructions && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="caption" color="text.secondary">Instructions</Typography>
                  <Typography variant="body2">{selectedPrescription.instructions}</Typography>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsOpen(false)}>Close</Button>
          <Button variant="outlined" startIcon={<Download />}>
            Download PDF
          </Button>
        </DialogActions>
      </Dialog>
    </AdminLayout>
  );
}
