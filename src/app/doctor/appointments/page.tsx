'use client';

import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Chip,
  Button,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import { AccessTime, CheckCircle, PlayArrow, Edit, MedicalServices } from '@mui/icons-material';
import DoctorLayout from '@/components/layouts/DoctorLayout';
import PageHeader from '@/components/common/PageHeader';

// Demo data
const appointments = {
  today: [
    { id: '1', patient: 'Jane Doe', time: '09:00 AM', type: 'Checkup', status: 'completed', notes: 'Regular checkup' },
    { id: '2', patient: 'John Wilson', time: '10:30 AM', type: 'Follow-up', status: 'in-progress', notes: 'Diabetes follow-up' },
    { id: '3', patient: 'Mary Clark', time: '11:00 AM', type: 'Consultation', status: 'waiting', notes: 'New patient' },
    { id: '4', patient: 'Tom Anderson', time: '02:00 PM', type: 'Checkup', status: 'scheduled', notes: '' },
    { id: '5', patient: 'Sarah Davis', time: '03:30 PM', type: 'Follow-up', status: 'scheduled', notes: 'Blood pressure check' },
  ],
  upcoming: [
    { id: '6', patient: 'Mike Johnson', date: 'Jan 22, 2024', time: '10:00 AM', type: 'Consultation', status: 'confirmed' },
    { id: '7', patient: 'Lisa Brown', date: 'Jan 23, 2024', time: '11:30 AM', type: 'Checkup', status: 'confirmed' },
    { id: '8', patient: 'David Lee', date: 'Jan 24, 2024', time: '09:00 AM', type: 'Follow-up', status: 'pending' },
  ],
  past: [
    { id: '9', patient: 'Jane Doe', date: 'Jan 15, 2024', time: '10:00 AM', type: 'Checkup', status: 'completed' },
    { id: '10', patient: 'John Wilson', date: 'Jan 10, 2024', time: '02:00 PM', type: 'Follow-up', status: 'completed' },
  ],
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed': return 'success';
    case 'in-progress': return 'primary';
    case 'waiting': return 'warning';
    case 'scheduled': return 'info';
    case 'confirmed': return 'success';
    case 'pending': return 'warning';
    default: return 'default';
  }
};

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

export default function DoctorAppointmentsPage() {
  const [tabValue, setTabValue] = useState(0);
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [notes, setNotes] = useState('');

  const handleStartAppointment = (apt: any) => {
    console.log('Starting appointment:', apt);
  };

  const handleCompleteAppointment = (apt: any) => {
    setSelectedAppointment(apt);
    setNotes(apt.notes || '');
    setNotesDialogOpen(true);
  };

  const handleSaveNotes = () => {
    console.log('Saving notes for:', selectedAppointment, notes);
    setNotesDialogOpen(false);
  };

  return (
    <DoctorLayout>
      <PageHeader
        title="Appointments"
        subtitle="Manage your appointment schedule"
      />

      <Card>
        <CardContent>
          <Tabs
            value={tabValue}
            onChange={(_, newValue) => setTabValue(newValue)}
            sx={{ borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab label={`Today (${appointments.today.length})`} />
            <Tab label={`Upcoming (${appointments.upcoming.length})`} />
            <Tab label={`Past (${appointments.past.length})`} />
          </Tabs>

          {/* Today's Appointments */}
          <TabPanel value={tabValue} index={0}>
            <List>
              {appointments.today.map((apt, idx) => (
                <React.Fragment key={apt.id}>
                  <ListItem
                    sx={{
                      py: 2,
                      opacity: apt.status === 'completed' ? 0.6 : 1,
                    }}
                    secondaryAction={
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <Chip
                          label={apt.status.replace('-', ' ')}
                          size="small"
                          color={getStatusColor(apt.status) as any}
                          sx={{ textTransform: 'capitalize' }}
                        />
                        {apt.status === 'waiting' && (
                          <Button
                            size="small"
                            variant="contained"
                            startIcon={<PlayArrow />}
                            onClick={() => handleStartAppointment(apt)}
                          >
                            Start
                          </Button>
                        )}
                        {apt.status === 'in-progress' && (
                          <Button
                            size="small"
                            variant="contained"
                            color="success"
                            startIcon={<CheckCircle />}
                            onClick={() => handleCompleteAppointment(apt)}
                          >
                            Complete
                          </Button>
                        )}
                        {apt.status === 'completed' && (
                          <Button size="small" variant="outlined" startIcon={<Edit />}>
                            View Notes
                          </Button>
                        )}
                      </Box>
                    }
                  >
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: apt.status === 'in-progress' ? 'primary.main' : 'grey.300' }}>
                        {apt.patient.split(' ').map((n) => n[0]).join('')}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="subtitle2">{apt.patient}</Typography>
                          <Chip label={apt.type} size="small" variant="outlined" sx={{ height: 20 }} />
                        </Box>
                      }
                      secondary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                          <AccessTime sx={{ fontSize: 14 }} />
                          <Typography variant="caption">{apt.time}</Typography>
                          {apt.notes && (
                            <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                              • {apt.notes}
                            </Typography>
                          )}
                        </Box>
                      }
                    />
                  </ListItem>
                  {idx < appointments.today.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          </TabPanel>

          {/* Upcoming Appointments */}
          <TabPanel value={tabValue} index={1}>
            <List>
              {appointments.upcoming.map((apt, idx) => (
                <React.Fragment key={apt.id}>
                  <ListItem sx={{ py: 2 }}>
                    <ListItemAvatar>
                      <Avatar>{apt.patient.split(' ').map((n) => n[0]).join('')}</Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="subtitle2">{apt.patient}</Typography>
                          <Chip label={apt.type} size="small" variant="outlined" sx={{ height: 20 }} />
                        </Box>
                      }
                      secondary={`${apt.date} at ${apt.time}`}
                    />
                    <Chip
                      label={apt.status}
                      size="small"
                      color={getStatusColor(apt.status) as any}
                      sx={{ textTransform: 'capitalize' }}
                    />
                  </ListItem>
                  {idx < appointments.upcoming.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          </TabPanel>

          {/* Past Appointments */}
          <TabPanel value={tabValue} index={2}>
            <List>
              {appointments.past.map((apt, idx) => (
                <React.Fragment key={apt.id}>
                  <ListItem
                    sx={{ py: 2 }}
                    secondaryAction={
                      <Button size="small" variant="outlined">
                        View Record
                      </Button>
                    }
                  >
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: 'grey.300' }}>
                        {apt.patient.split(' ').map((n) => n[0]).join('')}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={apt.patient}
                      secondary={`${apt.date} at ${apt.time} • ${apt.type}`}
                    />
                  </ListItem>
                  {idx < appointments.past.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          </TabPanel>
        </CardContent>
      </Card>

      {/* Notes Dialog */}
      <Dialog open={notesDialogOpen} onClose={() => setNotesDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Complete Appointment</DialogTitle>
        <DialogContent>
          <Typography variant="subtitle2" gutterBottom sx={{ mt: 1 }}>
            Patient: {selectedAppointment?.patient}
          </Typography>
          <TextField
            label="Session Notes"
            multiline
            rows={4}
            fullWidth
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNotesDialogOpen(false)}>Cancel</Button>
          <Button variant="outlined" startIcon={<MedicalServices />}>
            Add Medical Record
          </Button>
          <Button variant="contained" onClick={handleSaveNotes}>
            Complete & Save
          </Button>
        </DialogActions>
      </Dialog>
    </DoctorLayout>
  );
}
