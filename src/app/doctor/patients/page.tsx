'use client';

import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  InputAdornment,
  Avatar,
  Chip,
  Button,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  Divider,
} from '@mui/material';
import { Search, Person, EventNote, MedicalServices, Description } from '@mui/icons-material';
import DoctorLayout from '@/components/layouts/DoctorLayout';
import PageHeader from '@/components/common/PageHeader';

// Demo data
const patientsData = [
  {
    id: '1',
    name: 'Jane Doe',
    email: 'jane.doe@email.com',
    phone: '+1 234 567 890',
    dateOfBirth: '1990-05-15',
    gender: 'Female',
    bloodGroup: 'A+',
    lastVisit: 'Jan 15, 2024',
    condition: 'Hypertension',
    visits: 5,
  },
  {
    id: '2',
    name: 'John Wilson',
    email: 'john.wilson@email.com',
    phone: '+1 234 567 891',
    dateOfBirth: '1985-08-22',
    gender: 'Male',
    bloodGroup: 'O+',
    lastVisit: 'Jan 10, 2024',
    condition: 'Diabetes Type 2',
    visits: 8,
  },
  {
    id: '3',
    name: 'Mary Clark',
    email: 'mary.clark@email.com',
    phone: '+1 234 567 892',
    dateOfBirth: '1975-03-10',
    gender: 'Female',
    bloodGroup: 'B-',
    lastVisit: 'Jan 5, 2024',
    condition: 'Cardiac Checkup',
    visits: 3,
  },
];

const medicalHistory = [
  { date: 'Jan 15, 2024', diagnosis: 'Mild Hypertension', doctor: 'Dr. John Smith' },
  { date: 'Dec 20, 2023', diagnosis: 'Routine Checkup', doctor: 'Dr. John Smith' },
  { date: 'Nov 10, 2023', diagnosis: 'Flu', doctor: 'Dr. Emily Brown' },
];

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

export default function DoctorPatientsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<typeof patientsData[0] | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [tabValue, setTabValue] = useState(0);

  const filteredPatients = patientsData.filter((patient) =>
    patient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    patient.condition.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleViewPatient = (patient: typeof patientsData[0]) => {
    setSelectedPatient(patient);
    setDialogOpen(true);
    setTabValue(0);
  };

  return (
    <DoctorLayout>
      <PageHeader
        title="My Patients"
        subtitle="View and manage your patient records"
      />

      {/* Search */}
      <TextField
        placeholder="Search patients by name or condition..."
        fullWidth
        size="small"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        sx={{ mb: 3, maxWidth: 400 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Search />
            </InputAdornment>
          ),
        }}
      />

      {/* Patients List */}
      <Card>
        <List>
          {filteredPatients.map((patient, idx) => (
            <React.Fragment key={patient.id}>
              <ListItem
                sx={{ py: 2 }}
                secondaryAction={
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => handleViewPatient(patient)}
                    >
                      View Details
                    </Button>
                    <Button size="small" variant="contained" startIcon={<MedicalServices />}>
                      Add Record
                    </Button>
                  </Box>
                }
              >
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: 'primary.main', width: 48, height: 48 }}>
                    {patient.name.split(' ').map((n) => n[0]).join('')}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="subtitle1" fontWeight={600}>
                        {patient.name}
                      </Typography>
                      <Chip label={patient.bloodGroup} size="small" color="primary" />
                    </Box>
                  }
                  secondary={
                    <Box sx={{ mt: 0.5 }}>
                      <Typography variant="body2" color="text.secondary">
                        {patient.condition} • Last visit: {patient.lastVisit}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {patient.visits} total visits
                      </Typography>
                    </Box>
                  }
                />
              </ListItem>
              {idx < filteredPatients.length - 1 && <Divider />}
            </React.Fragment>
          ))}
        </List>
      </Card>

      {/* Patient Details Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ bgcolor: 'primary.main', width: 56, height: 56 }}>
              {selectedPatient?.name.split(' ').map((n) => n[0]).join('')}
            </Avatar>
            <Box>
              <Typography variant="h6">{selectedPatient?.name}</Typography>
              <Typography variant="body2" color="text.secondary">
                {selectedPatient?.email}
              </Typography>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Tabs
            value={tabValue}
            onChange={(_, newValue) => setTabValue(newValue)}
            sx={{ borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab icon={<Person />} iconPosition="start" label="Details" />
            <Tab icon={<Description />} iconPosition="start" label="Medical History" />
            <Tab icon={<EventNote />} iconPosition="start" label="Appointments" />
          </Tabs>

          <TabPanel value={tabValue} index={0}>
            {selectedPatient && (
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">Phone</Typography>
                  <Typography variant="body1">{selectedPatient.phone}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Date of Birth</Typography>
                  <Typography variant="body1">{selectedPatient.dateOfBirth}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Gender</Typography>
                  <Typography variant="body1">{selectedPatient.gender}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Blood Group</Typography>
                  <Typography variant="body1">{selectedPatient.bloodGroup}</Typography>
                </Box>
                <Box sx={{ gridColumn: '1 / -1' }}>
                  <Typography variant="caption" color="text.secondary">Current Condition</Typography>
                  <Typography variant="body1">{selectedPatient.condition}</Typography>
                </Box>
              </Box>
            )}
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            <List>
              {medicalHistory.map((record, idx) => (
                <ListItem key={idx} sx={{ px: 0 }}>
                  <ListItemText
                    primary={record.diagnosis}
                    secondary={`${record.date} • ${record.doctor}`}
                  />
                  <Button size="small">View</Button>
                </ListItem>
              ))}
            </List>
          </TabPanel>

          <TabPanel value={tabValue} index={2}>
            <Typography variant="body2" color="text.secondary">
              No upcoming appointments
            </Typography>
            <Button variant="outlined" sx={{ mt: 2 }}>
              Schedule Appointment
            </Button>
          </TabPanel>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Close</Button>
          <Button variant="contained" startIcon={<MedicalServices />}>
            Add Medical Record
          </Button>
        </DialogActions>
      </Dialog>
    </DoctorLayout>
  );
}
