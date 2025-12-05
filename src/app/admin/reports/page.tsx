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
  MenuItem,
} from '@mui/material';
import { Download, Assessment, TrendingUp, People, LocalHospital } from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import dayjs from 'dayjs';
import AdminLayout from '@/components/layouts/AdminLayout';
import PageHeader from '@/components/common/PageHeader';
import { dashboardApi, appointmentsApi, patientsApi, doctorsApi } from '@/lib/api';

const COLORS = ['#1976D2', '#9C27B0', '#2E7D32', '#ED6C02', '#D32F2F', '#00BCD4', '#FF5722'];

export default function AdminReportsPage() {
  const [reportType, setReportType] = useState('appointments');
  const [startDate, setStartDate] = useState<dayjs.Dayjs | null>(dayjs().subtract(6, 'month'));
  const [endDate, setEndDate] = useState<dayjs.Dayjs | null>(dayjs());
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ patients: 0, doctors: 0, appointments: 0, revenue: 0 });
  const [appointmentData, setAppointmentData] = useState<any[]>([]);
  const [departmentData, setDepartmentData] = useState<any[]>([]);
  const [revenueData, setRevenueData] = useState<any[]>([]);

  useEffect(() => {
    fetchReportData();
  }, []);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const [dashRes, aptsRes, patientsRes, doctorsRes] = await Promise.all([
        dashboardApi.getAdminStats(),
        appointmentsApi.getAll(),
        patientsApi.getAll(),
        doctorsApi.getAll(),
      ]);

      // Set stats
      if (dashRes.success && dashRes.data) {
        setStats({
          patients: dashRes.data.totalPatients || 0,
          doctors: dashRes.data.totalDoctors || 0,
          appointments: dashRes.data.totalAppointments || 0,
          revenue: dashRes.data.monthlyRevenue || 0,
        });
      }

      // Process appointments by month
      const appointments = aptsRes.data || [];
      const monthlyApts: Record<string, number> = {};
      appointments.forEach((apt: any) => {
        const month = dayjs(apt.scheduledAt).format('MMM');
        monthlyApts[month] = (monthlyApts[month] || 0) + 1;
      });
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      setAppointmentData(months.map(m => ({ month: m, appointments: monthlyApts[m] || 0 })));

      // Process department distribution
      const doctors = doctorsRes.data || [];
      const deptCount: Record<string, number> = {};
      doctors.forEach((doc: any) => {
        const spec = doc.specialization || 'General';
        deptCount[spec] = (deptCount[spec] || 0) + 1;
      });
      setDepartmentData(
        Object.entries(deptCount).map(([name, value], idx) => ({
          name,
          value,
          color: COLORS[idx % COLORS.length],
        }))
      );

      // Generate revenue trend (simulated based on appointments)
      setRevenueData(
        months.map(m => ({
          month: m,
          revenue: (monthlyApts[m] || 0) * 500 * (1 + Math.random() * 0.5),
        }))
      );
    } catch (error) {
      console.error('Failed to fetch report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    let csvContent = '';
    let filename = '';

    if (reportType === 'appointments') {
      csvContent = [
        ['Month', 'Appointments'].join(','),
        ...appointmentData.map(d => [d.month, d.appointments].join(',')),
      ].join('\n');
      filename = `appointments-report-${dayjs().format('YYYY-MM-DD')}.csv`;
    } else if (reportType === 'revenue') {
      csvContent = [
        ['Month', 'Revenue (₹)'].join(','),
        ...revenueData.map(d => [d.month, Math.round(d.revenue)].join(',')),
      ].join('\n');
      filename = `revenue-report-${dayjs().format('YYYY-MM-DD')}.csv`;
    } else if (reportType === 'doctors') {
      csvContent = [
        ['Department', 'Count'].join(','),
        ...departmentData.map(d => [d.name, d.value].join(',')),
      ].join('\n');
      filename = `department-report-${dayjs().format('YYYY-MM-DD')}.csv`;
    } else {
      csvContent = [
        ['Metric', 'Value'].join(','),
        ['Total Patients', stats.patients].join(','),
        ['Total Doctors', stats.doctors].join(','),
        ['Total Appointments', stats.appointments].join(','),
        ['Monthly Revenue', stats.revenue].join(','),
      ].join('\n');
      filename = `summary-report-${dayjs().format('YYYY-MM-DD')}.csv`;
    }

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AdminLayout>
      <PageHeader
        title="Reports & Analytics"
        subtitle="Generate and view system reports"
        action={
          <Button variant="contained" startIcon={<Download />} onClick={handleExport}>
            Export Report
          </Button>
        }
      />

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <TextField
              select
              size="small"
              label="Report Type"
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              sx={{ minWidth: 200 }}
            >
              <MenuItem value="appointments">Appointments Report</MenuItem>
              <MenuItem value="revenue">Revenue Report</MenuItem>
              <MenuItem value="patients">Patient Statistics</MenuItem>
              <MenuItem value="doctors">Doctor Performance</MenuItem>
            </TextField>
            <DatePicker
              label="Start Date"
              value={startDate}
              onChange={setStartDate}
              slotProps={{ textField: { size: 'small' } }}
            />
            <DatePicker
              label="End Date"
              value={endDate}
              onChange={setEndDate}
              slotProps={{ textField: { size: 'small' } }}
            />
            <Button variant="outlined">Generate Report</Button>
          </Box>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'primary.light' }}>
                  <People sx={{ color: 'primary.main' }} />
                </Box>
                <Box>
                  <Typography variant="h5" fontWeight={700}>{stats.patients.toLocaleString()}</Typography>
                  <Typography variant="body2" color="text.secondary">Total Patients</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'success.light' }}>
                  <LocalHospital sx={{ color: 'success.main' }} />
                </Box>
                <Box>
                  <Typography variant="h5" fontWeight={700}>{stats.doctors}</Typography>
                  <Typography variant="body2" color="text.secondary">Active Doctors</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'warning.light' }}>
                  <Assessment sx={{ color: 'warning.main' }} />
                </Box>
                <Box>
                  <Typography variant="h5" fontWeight={700}>{stats.appointments.toLocaleString()}</Typography>
                  <Typography variant="body2" color="text.secondary">Total Appointments</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'secondary.light' }}>
                  <TrendingUp sx={{ color: 'secondary.main' }} />
                </Box>
                <Box>
                  <Typography variant="h5" fontWeight={700}>₹{(stats.revenue / 100000).toFixed(1)}L</Typography>
                  <Typography variant="body2" color="text.secondary">Total Revenue</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Appointments Trend</Typography>
              <Box sx={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={appointmentData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="appointments" fill="#1976D2" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Department Distribution</Typography>
              <Box sx={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={departmentData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {departmentData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Revenue Trend (₹)</Typography>
              <Box sx={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => `₹${(value as number).toLocaleString('en-IN')}`} />
                    <Line type="monotone" dataKey="revenue" stroke="#9C27B0" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </AdminLayout>
  );
}
