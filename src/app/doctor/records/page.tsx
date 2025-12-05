'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  TextField,
  InputAdornment,
  Chip,
  Avatar,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Snackbar,
  Alert,
} from '@mui/material';
import {
  Search,
  Add,
  Description,
  Person,
  Download,
} from '@mui/icons-material';
import DoctorLayout from '@/components/layouts/DoctorLayout';
import PageHeader from '@/components/common/PageHeader';
import { recordsApi, patientsApi } from '@/lib/api';
import dayjs from 'dayjs';

export default function DoctorRecordsPage() {
  const [records, setRecords] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [createDialog, setCreateDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  
  const [newRecord, setNewRecord] = useState({
    patientId: '',
    diagnosis: '',
    symptoms: '',
    notes: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [recordsRes, patientsRes] = await Promise.all([
        recordsApi.getAll(),
        patientsApi.getAll(),
      ]);
      if (recordsRes.success) setRecords(recordsRes.data || []);
      if (patientsRes.success) setPatients(patientsRes.data || []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newRecord.patientId || !newRecord.diagnosis) {
      setSnackbar({ open: true, message: 'Please fill required fields', severity: 'error' });
      return;
    }
    
    setSaving(true);
    try {
      const response = await recordsApi.create({
        patientId: newRecord.patientId,
        diagnosis: newRecord.diagnosis,
        symptoms: newRecord.symptoms.split(',').map(s => s.trim()).filter(Boolean),
        notes: newRecord.notes,
      });
      
      if (response.success) {
        setSnackbar({ open: true, message: 'Record created!', severity: 'success' });
        fetchData();
        setCreateDialog(false);
        setNewRecord({ patientId: '', diagnosis: '', symptoms: '', notes: '' });
      }
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to create record', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = (record: any) => {
    const content = `
MEDICAL RECORD
==============
Date: ${dayjs(record.createdAt).format('MMMM DD, YYYY')}
Patient: ${record.patient?.user?.firstName} ${record.patient?.user?.lastName}
Diagnosis: ${record.diagnosis}
Symptoms: ${record.symptoms?.join(', ') || 'None'}
Notes: ${record.notes || 'No notes'}
    `.trim();
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `record-${record.patient?.user?.firstName}-${dayjs(record.createdAt).format('YYYY-MM-DD')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredRecords = records.filter((r: any) => {
    const patientName = `${r.patient?.user?.firstName} ${r.patient?.user?.lastName}`.toLowerCase();
    const diagnosis = r.diagnosis?.toLowerCase() || '';
    return patientName.includes(search.toLowerCase()) || diagnosis.includes(search.toLowerCase());
  });

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
        title="Medical Records"
        subtitle="View and create patient medical records"
        action={
          <Button variant="contained" startIcon={<Add />} onClick={() => setCreateDialog(true)}>
            Add Record
          </Button>
        }
      />

      {/* Search */}
      <TextField
        fullWidth
        placeholder="Search by patient name or diagnosis..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Search />
            </InputAdornment>
          ),
        }}
        sx={{ mb: 3 }}
      />

      {/* Records List */}
      <Grid container spacing={2}>
        {filteredRecords.length === 0 ? (
          <Grid item xs={12}>
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 6 }}>
                <Description sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                <Typography color="text.secondary">
                  No medical records found
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ) : (
          filteredRecords.map((record: any) => (
            <Grid item xs={12} md={6} key={record.id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                      <Avatar sx={{ bgcolor: 'primary.light' }}>
                        <Person />
                      </Avatar>
                      <Box>
                        <Typography variant="subtitle1" fontWeight={600}>
                          {record.patient?.user?.firstName} {record.patient?.user?.lastName}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {dayjs(record.createdAt).format('MMM DD, YYYY')}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>

                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    {record.diagnosis}
                  </Typography>

                  {record.symptoms?.length > 0 && (
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1 }}>
                      {record.symptoms.map((s: string) => (
                        <Chip key={s} label={s} size="small" variant="outlined" />
                      ))}
                    </Box>
                  )}

                  {record.notes && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      {record.notes}
                    </Typography>
                  )}

                  <Box sx={{ mt: 2 }}>
                    <Button size="small" startIcon={<Download />} onClick={() => handleDownload(record)}>
                      Download
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))
        )}
      </Grid>

      {/* Create Dialog */}
      <Dialog open={createDialog} onClose={() => setCreateDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Medical Record</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2, mb: 2 }}>
            <InputLabel>Patient *</InputLabel>
            <Select
              value={newRecord.patientId}
              label="Patient *"
              onChange={(e) => setNewRecord({ ...newRecord, patientId: e.target.value })}
            >
              {patients.map((p: any) => (
                <MenuItem key={p.id} value={p.id}>
                  {p.user?.firstName} {p.user?.lastName}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            fullWidth
            label="Diagnosis *"
            value={newRecord.diagnosis}
            onChange={(e) => setNewRecord({ ...newRecord, diagnosis: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Symptoms (comma separated)"
            value={newRecord.symptoms}
            onChange={(e) => setNewRecord({ ...newRecord, symptoms: e.target.value })}
            placeholder="Headache, Fever, Fatigue"
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Notes"
            value={newRecord.notes}
            onChange={(e) => setNewRecord({ ...newRecord, notes: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreate} disabled={saving}>
            {saving ? <CircularProgress size={20} /> : 'Create'}
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
