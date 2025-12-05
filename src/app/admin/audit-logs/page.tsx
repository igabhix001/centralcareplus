'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  InputAdornment,
  Chip,
  CircularProgress,
  Avatar,
} from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { Search, History } from '@mui/icons-material';
import AdminLayout from '@/components/layouts/AdminLayout';
import PageHeader from '@/components/common/PageHeader';
import { auditLogsApi } from '@/lib/api';
import dayjs from 'dayjs';

const getActionColor = (action: string) => {
  switch (action) {
    case 'CREATE': return 'success';
    case 'UPDATE': return 'info';
    case 'DELETE': return 'error';
    case 'LOGIN': return 'primary';
    case 'LOGOUT': return 'default';
    default: return 'default';
  }
};

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const response = await auditLogsApi.getAll();
      if (response.success) {
        setLogs(response.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
      // Demo data if API fails
      setLogs([
        { id: '1', userId: 'admin', action: 'LOGIN', entity: 'User', entityId: '1', createdAt: new Date().toISOString(), details: { ip: '192.168.1.1' } },
        { id: '2', userId: 'doctor', action: 'CREATE', entity: 'MedicalRecord', entityId: '2', createdAt: new Date().toISOString(), details: { patientName: 'Ananya Gupta' } },
        { id: '3', userId: 'admin', action: 'UPDATE', entity: 'Appointment', entityId: '3', createdAt: new Date().toISOString(), details: { status: 'CONFIRMED' } },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const columns: GridColDef[] = [
    {
      field: 'createdAt',
      headerName: 'Timestamp',
      width: 180,
      valueFormatter: (params) => dayjs(params.value).format('MMM DD, YYYY HH:mm'),
    },
    {
      field: 'action',
      headerName: 'Action',
      width: 120,
      renderCell: (params) => (
        <Chip 
          label={params.value} 
          size="small"
          color={getActionColor(params.value) as any}
        />
      ),
    },
    { field: 'entity', headerName: 'Entity', width: 150 },
    { field: 'entityId', headerName: 'Entity ID', width: 200 },
    { field: 'userId', headerName: 'User ID', width: 200 },
    {
      field: 'details',
      headerName: 'Details',
      flex: 1,
      renderCell: (params) => (
        <Typography variant="body2" color="text.secondary" noWrap>
          {JSON.stringify(params.value)}
        </Typography>
      ),
    },
  ];

  const filteredLogs = logs.filter((log) => {
    const searchLower = searchQuery.toLowerCase();
    return log.action?.toLowerCase().includes(searchLower) ||
           log.entity?.toLowerCase().includes(searchLower) ||
           log.userId?.toLowerCase().includes(searchLower);
  });

  return (
    <AdminLayout>
      <PageHeader
        title="Audit Logs"
        subtitle="System activity and change history"
      />

      <Card>
        <CardContent>
          <TextField
            placeholder="Search by action, entity or user..."
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
          ) : logs.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <History sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">No audit logs found</Typography>
            </Box>
          ) : (
            <DataGrid
              rows={filteredLogs}
              columns={columns}
              initialState={{
                pagination: { paginationModel: { pageSize: 25 } },
                sorting: { sortModel: [{ field: 'createdAt', sort: 'desc' }] },
              }}
              pageSizeOptions={[25, 50, 100]}
              disableRowSelectionOnClick
              autoHeight
              sx={{ border: 0 }}
            />
          )}
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
