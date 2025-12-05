'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Avatar,
  Divider,
  CircularProgress,
} from '@mui/material';
import {
  Description,
  MedicalServices,
  ExpandMore,
  Download,
  Visibility,
  LocalHospital,
  EventNote,
  AttachFile,
} from '@mui/icons-material';
import PatientLayout from '@/components/layouts/PatientLayout';
import PageHeader from '@/components/common/PageHeader';
import { recordsApi, prescriptionsApi } from '@/lib/api';
import dayjs from 'dayjs';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
}

export default function PatientRecordsPage() {
  const [tabValue, setTabValue] = useState(0);
  const [medicalRecords, setMedicalRecords] = useState<any[]>([]);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [recordsRes, prescriptionsRes] = await Promise.all([
        recordsApi.getAll(),
        prescriptionsApi.getAll(),
      ]);
      
      if (recordsRes.success) {
        setMedicalRecords(recordsRes.data || []);
      }
      if (prescriptionsRes.success) {
        setPrescriptions(prescriptionsRes.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch records:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (record: any) => {
    // Generate a simple text file for download
    const content = `
Medical Record
==============
Date: ${dayjs(record.createdAt).format('MMMM DD, YYYY')}
Doctor: Dr. ${record.doctor?.user?.firstName} ${record.doctor?.user?.lastName}
Specialization: ${record.doctor?.specialization}
Diagnosis: ${record.diagnosis}
Symptoms: ${record.symptoms?.join(', ') || 'None'}
Notes: ${record.notes || 'No notes'}
    `.trim();
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `medical-record-${dayjs(record.createdAt).format('YYYY-MM-DD')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadPrescription = (rx: any) => {
    const medications = rx.medications?.map((med: any) => 
      `- ${med.name}: ${med.dosage}, ${med.frequency}, ${med.duration}`
    ).join('\n') || 'No medications';
    
    const content = `
PRESCRIPTION
============
Date: ${dayjs(rx.createdAt).format('MMMM DD, YYYY')}
Doctor: Dr. ${rx.doctor?.user?.firstName} ${rx.doctor?.user?.lastName}
Valid Until: ${dayjs(rx.validUntil).format('MMMM DD, YYYY')}

Medications:
${medications}

Instructions: ${rx.instructions || 'None'}
    `.trim();
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prescription-${dayjs(rx.createdAt).format('YYYY-MM-DD')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
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
        title="My Medical Records"
        subtitle="View your medical history and prescriptions"
      />

      <Card>
        <CardContent>
          <Tabs
            value={tabValue}
            onChange={(_, newValue) => setTabValue(newValue)}
            sx={{ borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab icon={<Description />} iconPosition="start" label="Medical Records" />
            <Tab icon={<MedicalServices />} iconPosition="start" label="Prescriptions" />
          </Tabs>

          {/* Medical Records Tab */}
          <TabPanel value={tabValue} index={0}>
            {medicalRecords.length === 0 ? (
              <Typography color="text.secondary" textAlign="center" py={4}>
                No medical records found
              </Typography>
            ) : medicalRecords.map((record: any) => (
              <Accordion key={record.id} sx={{ mb: 2, '&:before': { display: 'none' } }}>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%', pr: 2 }}>
                    <Avatar sx={{ bgcolor: 'primary.light' }}>
                      <LocalHospital />
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle1" fontWeight={600}>
                        {record.diagnosis}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Dr. {record.doctor?.user?.firstName} {record.doctor?.user?.lastName} • {record.doctor?.specialization}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <EventNote sx={{ fontSize: 16, color: 'text.secondary' }} />
                      <Typography variant="caption" color="text.secondary">
                        {dayjs(record.createdAt).format('MMM DD, YYYY')}
                      </Typography>
                    </Box>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Divider sx={{ mb: 2 }} />
                  
                  {record.symptoms?.length > 0 && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Symptoms
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        {record.symptoms.map((symptom: string) => (
                          <Chip key={symptom} label={symptom} size="small" />
                        ))}
                      </Box>
                    </Box>
                  )}

                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Doctor Notes
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {record.notes || 'No notes available'}
                    </Typography>
                  </Box>

                  <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                    <Button size="small" variant="outlined" startIcon={<Download />} onClick={() => handleDownload(record)}>
                      Download Record
                    </Button>
                  </Box>
                </AccordionDetails>
              </Accordion>
            ))}
          </TabPanel>

          {/* Prescriptions Tab */}
          <TabPanel value={tabValue} index={1}>
            {prescriptions.length === 0 ? (
              <Typography color="text.secondary" textAlign="center" py={4}>
                No prescriptions found
              </Typography>
            ) : prescriptions.map((rx: any) => {
              const isExpired = dayjs(rx.validUntil).isBefore(dayjs());
              return (
              <Card
                key={rx.id}
                variant="outlined"
                sx={{ mb: 2, borderColor: isExpired ? 'divider' : 'success.main' }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                    <Box>
                      <Typography variant="subtitle1" fontWeight={600}>
                        Prescription from Dr. {rx.doctor?.user?.firstName} {rx.doctor?.user?.lastName}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {dayjs(rx.createdAt).format('MMM DD, YYYY')} • Valid until {dayjs(rx.validUntil).format('MMM DD, YYYY')}
                      </Typography>
                    </Box>
                    <Chip
                      label={isExpired ? 'Expired' : 'Active'}
                      size="small"
                      color={isExpired ? 'default' : 'success'}
                    />
                  </Box>

                  <Typography variant="subtitle2" gutterBottom>
                    Medications
                  </Typography>
                  {rx.medications?.map((med: any, idx: number) => (
                    <Box
                      key={idx}
                      sx={{
                        p: 1.5,
                        mb: 1,
                        borderRadius: 1,
                        bgcolor: 'action.hover',
                      }}
                    >
                      <Typography variant="body2" fontWeight={500}>
                        {med.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {med.dosage} • {med.frequency} • {med.duration}
                      </Typography>
                    </Box>
                  ))}

                  {rx.instructions && (
                    <Box sx={{ mt: 2, p: 1.5, bgcolor: 'info.light', borderRadius: 1 }}>
                      <Typography variant="caption" fontWeight={500}>
                        Instructions:
                      </Typography>
                      <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                        {rx.instructions}
                      </Typography>
                    </Box>
                  )}

                  <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                    <Button size="small" variant="outlined" startIcon={<Download />} onClick={() => handleDownloadPrescription(rx)}>
                      Download PDF
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            )})}
          </TabPanel>
        </CardContent>
      </Card>
    </PatientLayout>
  );
}
