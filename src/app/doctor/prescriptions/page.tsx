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
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Autocomplete,
  Divider,
  CircularProgress,
  Snackbar,
  Alert,
} from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { Search, Add, Delete, Visibility, Download, Close } from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import DoctorLayout from '@/components/layouts/DoctorLayout';
import PageHeader from '@/components/common/PageHeader';
import { prescriptionsApi, patientsApi } from '@/lib/api';

const commonMedications = [
  'Paracetamol 500mg',
  'Amoxicillin 500mg',
  'Ibuprofen 400mg',
  'Amlodipine 5mg',
  'Metformin 500mg',
  'Omeprazole 20mg',
  'Aspirin 75mg',
  'Atorvastatin 10mg',
  'Crocin 650mg',
  'Azithromycin 500mg',
];

interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
}

export default function DoctorPrescriptionsPage() {
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialog, setViewDialog] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState<any>(null);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [validUntil, setValidUntil] = useState<dayjs.Dayjs | null>(dayjs().add(30, 'day'));
  const [medications, setMedications] = useState<Medication[]>([
    { name: '', dosage: '', frequency: '', duration: '' },
  ]);
  const [instructions, setInstructions] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [rxRes, patientsRes] = await Promise.all([
        prescriptionsApi.getAll(),
        patientsApi.getAll(),
      ]);
      if (rxRes.success) {
        const formatted = (rxRes.data || []).map((rx: any) => ({
          id: rx.id,
          patient: `${rx.patient?.user?.firstName || ''} ${rx.patient?.user?.lastName || ''}`.trim(),
          patientId: rx.patientId,
          date: dayjs(rx.createdAt).format('YYYY-MM-DD'),
          medications: rx.medications?.length || 0,
          medicationsList: rx.medications || [],
          status: dayjs(rx.validUntil).isAfter(dayjs()) ? 'active' : 'expired',
          validUntil: dayjs(rx.validUntil).format('YYYY-MM-DD'),
          instructions: rx.instructions,
          doctor: rx.doctor,
          raw: rx,
        }));
        setPrescriptions(formatted);
      }
      if (patientsRes.success) {
        setPatients(patientsRes.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleView = (rx: any) => {
    setSelectedPrescription(rx);
    setViewDialog(true);
  };

  const handleDownload = (rx: any) => {
    const content = `
PRESCRIPTION
============
Date: ${rx.date}
Patient: ${rx.patient}
Valid Until: ${rx.validUntil}

MEDICATIONS:
${rx.medicationsList.map((m: any, i: number) => `${i + 1}. ${m.name} - ${m.dosage}, ${m.frequency} for ${m.duration}`).join('\n')}

INSTRUCTIONS:
${rx.instructions || 'None'}

Doctor: Dr. ${rx.doctor?.user?.firstName} ${rx.doctor?.user?.lastName}
${rx.doctor?.specialization}
    `.trim();

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prescription-${rx.patient.replace(/\s+/g, '-')}-${rx.date}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const columns: GridColDef[] = [
    { field: 'patient', headerName: 'Patient', flex: 1 },
    { field: 'date', headerName: 'Date', width: 120 },
    { field: 'medications', headerName: 'Medications', width: 120, align: 'center' },
    { field: 'validUntil', headerName: 'Valid Until', width: 120 },
    {
      field: 'status',
      headerName: 'Status',
      width: 100,
      renderCell: (params) => (
        <Chip
          label={params.value}
          size="small"
          color={params.value === 'active' ? 'success' : 'default'}
          sx={{ textTransform: 'capitalize' }}
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
          <IconButton size="small" color="primary" onClick={() => handleView(params.row)}>
            <Visibility />
          </IconButton>
          <IconButton size="small" onClick={() => handleDownload(params.row)}>
            <Download />
          </IconButton>
        </Box>
      ),
    },
  ];

  const filteredPrescriptions = prescriptions.filter((rx: any) =>
    rx.patient.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddMedication = () => {
    setMedications([...medications, { name: '', dosage: '', frequency: '', duration: '' }]);
  };

  const handleRemoveMedication = (index: number) => {
    setMedications(medications.filter((_, i) => i !== index));
  };

  const handleMedicationChange = (index: number, field: keyof Medication, value: string) => {
    const updated = [...medications];
    updated[index][field] = value;
    setMedications(updated);
  };

  const handleCreatePrescription = async () => {
    if (!selectedPatientId || medications.every((m) => !m.name)) {
      setSnackbar({ open: true, message: 'Please fill required fields', severity: 'error' });
      return;
    }

    setSaving(true);
    try {
      const response = await prescriptionsApi.create({
        patientId: selectedPatientId,
        validUntil: validUntil?.toISOString(),
        medications: medications.filter((m) => m.name),
        instructions,
      });

      if (response.success) {
        setSnackbar({ open: true, message: 'Prescription created!', severity: 'success' });
        setDialogOpen(false);
        fetchData();
        // Reset form
        setSelectedPatientId(null);
        setValidUntil(dayjs().add(30, 'day'));
        setMedications([{ name: '', dosage: '', frequency: '', duration: '' }]);
        setInstructions('');
      } else {
        setSnackbar({ open: true, message: 'Failed to create prescription', severity: 'error' });
      }
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to create prescription', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

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
        title="Prescriptions"
        subtitle="Create and manage patient prescriptions"
        action={
          <Button variant="contained" startIcon={<Add />} onClick={() => setDialogOpen(true)}>
            New Prescription
          </Button>
        }
      />

      <Card>
        <CardContent>
          <TextField
            placeholder="Search by patient name..."
            size="small"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ mb: 2, width: 300 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
          />

          <DataGrid
            rows={filteredPrescriptions}
            columns={columns}
            initialState={{
              pagination: { paginationModel: { pageSize: 10 } },
            }}
            pageSizeOptions={[10, 25, 50]}
            disableRowSelectionOnClick
            autoHeight
            sx={{
              border: 0,
              '& .MuiDataGrid-cell:focus': { outline: 'none' },
            }}
          />
        </CardContent>
      </Card>

      {/* Create Prescription Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Create New Prescription</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <Autocomplete
                options={patients}
                getOptionLabel={(option: any) => `${option.user?.firstName || ''} ${option.user?.lastName || ''}`.trim()}
                value={patients.find((p: any) => p.id === selectedPatientId) || null}
                onChange={(_, newValue) => setSelectedPatientId(newValue?.id || null)}
                renderInput={(params) => <TextField {...params} label="Select Patient" required />}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <DatePicker
                label="Valid Until"
                value={validUntil}
                onChange={setValidUntil}
                minDate={dayjs()}
                slotProps={{ textField: { fullWidth: true } }}
              />
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle1" fontWeight={600}>
                  Medications
                </Typography>
                <Button size="small" startIcon={<Add />} onClick={handleAddMedication}>
                  Add Medication
                </Button>
              </Box>

              {medications.map((med, index) => (
                <Box
                  key={index}
                  sx={{
                    p: 2,
                    mb: 2,
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 1,
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="subtitle2">Medication {index + 1}</Typography>
                    {medications.length > 1 && (
                      <IconButton size="small" color="error" onClick={() => handleRemoveMedication(index)}>
                        <Delete />
                      </IconButton>
                    )}
                  </Box>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Autocomplete
                        freeSolo
                        options={commonMedications}
                        value={med.name}
                        onInputChange={(_, newValue) => handleMedicationChange(index, 'name', newValue)}
                        renderInput={(params) => (
                          <TextField {...params} label="Medication Name" size="small" required />
                        )}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="Dosage"
                        size="small"
                        fullWidth
                        value={med.dosage}
                        onChange={(e) => handleMedicationChange(index, 'dosage', e.target.value)}
                        placeholder="e.g., 1 tablet"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="Frequency"
                        size="small"
                        fullWidth
                        value={med.frequency}
                        onChange={(e) => handleMedicationChange(index, 'frequency', e.target.value)}
                        placeholder="e.g., Twice daily"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="Duration"
                        size="small"
                        fullWidth
                        value={med.duration}
                        onChange={(e) => handleMedicationChange(index, 'duration', e.target.value)}
                        placeholder="e.g., 7 days"
                      />
                    </Grid>
                  </Grid>
                </Box>
              ))}
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Special Instructions"
                multiline
                rows={3}
                fullWidth
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="e.g., Take with food. Avoid alcohol."
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleCreatePrescription}
            disabled={saving || !selectedPatientId || medications.every((m) => !m.name)}
          >
            {saving ? <CircularProgress size={20} /> : 'Create Prescription'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Prescription Dialog */}
      <Dialog open={viewDialog} onClose={() => setViewDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            Prescription Details
            <IconButton onClick={() => setViewDialog(false)}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedPrescription && (
            <Box>
              <Typography variant="subtitle2" color="text.secondary">Patient</Typography>
              <Typography variant="body1" gutterBottom>{selectedPrescription.patient}</Typography>
              
              <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 2 }}>Date</Typography>
              <Typography variant="body1" gutterBottom>{selectedPrescription.date}</Typography>
              
              <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 2 }}>Valid Until</Typography>
              <Typography variant="body1" gutterBottom>{selectedPrescription.validUntil}</Typography>
              
              <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 2 }}>Medications</Typography>
              {selectedPrescription.medicationsList?.map((m: any, i: number) => (
                <Box key={i} sx={{ p: 1, bgcolor: 'action.hover', borderRadius: 1, mb: 1 }}>
                  <Typography variant="body2" fontWeight={600}>{m.name}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {m.dosage} • {m.frequency} • {m.duration}
                  </Typography>
                </Box>
              ))}
              
              {selectedPrescription.instructions && (
                <>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 2 }}>Instructions</Typography>
                  <Typography variant="body1">{selectedPrescription.instructions}</Typography>
                </>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => handleDownload(selectedPrescription)} startIcon={<Download />}>
            Download
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
