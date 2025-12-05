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
  Grid,
} from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { Search, Visibility, Download } from '@mui/icons-material';
import AdminLayout from '@/components/layouts/AdminLayout';
import PageHeader from '@/components/common/PageHeader';
import { recordsApi } from '@/lib/api';
import dayjs from 'dayjs';

export default function AdminRecordsPage() {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const response = await recordsApi.getAll();
      if (response.success) {
        setRecords(response.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch records:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (record: any) => {
    setSelectedRecord(record);
    setDetailsOpen(true);
  };

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
    { field: 'diagnosis', headerName: 'Diagnosis', flex: 1 },
    {
      field: 'createdAt',
      headerName: 'Date',
      width: 120,
      valueFormatter: (params) => dayjs(params.value).format('MMM DD, YYYY'),
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

  const filteredRecords = records.filter((record) => {
    const patientName = `${record.patient?.user?.firstName} ${record.patient?.user?.lastName}`.toLowerCase();
    const doctorName = `${record.doctor?.user?.firstName} ${record.doctor?.user?.lastName}`.toLowerCase();
    const diagnosis = record.diagnosis?.toLowerCase() || '';
    return patientName.includes(searchQuery.toLowerCase()) ||
           doctorName.includes(searchQuery.toLowerCase()) ||
           diagnosis.includes(searchQuery.toLowerCase());
  });

  return (
    <AdminLayout>
      <PageHeader
        title="Medical Records"
        subtitle="View all patient medical records"
      />

      <Card>
        <CardContent>
          <TextField
            placeholder="Search by patient, doctor or diagnosis..."
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
              rows={filteredRecords}
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

      {/* Record Details Dialog */}
      <Dialog open={detailsOpen} onClose={() => setDetailsOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Medical Record Details</DialogTitle>
        <DialogContent>
          {selectedRecord && (
            <Box sx={{ mt: 2 }}>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Typography variant="caption" color="text.secondary">Patient</Typography>
                  <Typography variant="body1" fontWeight={500}>
                    {selectedRecord.patient?.user?.firstName} {selectedRecord.patient?.user?.lastName}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="caption" color="text.secondary">Doctor</Typography>
                  <Typography variant="body1" fontWeight={500}>
                    Dr. {selectedRecord.doctor?.user?.firstName} {selectedRecord.doctor?.user?.lastName}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="caption" color="text.secondary">Date</Typography>
                  <Typography variant="body1">
                    {dayjs(selectedRecord.createdAt).format('MMMM DD, YYYY')}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="caption" color="text.secondary">Diagnosis</Typography>
                  <Typography variant="body1" fontWeight={500}>
                    {selectedRecord.diagnosis}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary">Symptoms</Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 0.5 }}>
                    {selectedRecord.symptoms?.map((symptom: string, idx: number) => (
                      <Chip key={idx} label={symptom} size="small" />
                    ))}
                  </Box>
                </Grid>
                {selectedRecord.vitals && (
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">Vitals</Typography>
                    <Box sx={{ display: 'flex', gap: 3, mt: 1 }}>
                      {selectedRecord.vitals.bloodPressure && (
                        <Box>
                          <Typography variant="caption">BP</Typography>
                          <Typography variant="body2" fontWeight={500}>{selectedRecord.vitals.bloodPressure}</Typography>
                        </Box>
                      )}
                      {selectedRecord.vitals.heartRate && (
                        <Box>
                          <Typography variant="caption">Heart Rate</Typography>
                          <Typography variant="body2" fontWeight={500}>{selectedRecord.vitals.heartRate} bpm</Typography>
                        </Box>
                      )}
                      {selectedRecord.vitals.temperature && (
                        <Box>
                          <Typography variant="caption">Temperature</Typography>
                          <Typography variant="body2" fontWeight={500}>{selectedRecord.vitals.temperature}°F</Typography>
                        </Box>
                      )}
                    </Box>
                  </Grid>
                )}
                {selectedRecord.notes && (
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">Notes</Typography>
                    <Typography variant="body2">{selectedRecord.notes}</Typography>
                  </Grid>
                )}
              </Grid>
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
