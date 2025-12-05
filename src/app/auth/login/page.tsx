'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Tabs,
  Tab,
  InputAdornment,
  IconButton,
  Alert,
  MenuItem,
  Grid,
  Divider,
  CircularProgress,
} from '@mui/material';
import {
  Email,
  Lock,
  Visibility,
  VisibilityOff,
  Person,
  Phone,
  CalendarMonth,
  Home,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '@/store/authStore';
import Logo from '@/components/common/Logo';
import { authApi } from '@/lib/api';

// Login Schema
const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

// Signup Schema
const signupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(10, 'Phone number must be at least 10 digits'),
  dob: z.string().min(1, 'Date of birth is required'),
  gender: z.enum(['male', 'female', 'other'], { required_error: 'Gender is required' }),
  address: z.string().min(5, 'Address must be at least 5 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type LoginFormData = z.infer<typeof loginSchema>;
type SignupFormData = z.infer<typeof signupSchema>;

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [tab, setTab] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const signupForm = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      dob: '',
      gender: undefined,
      address: '',
      password: '',
      confirmPassword: '',
    },
  });

  const handleLogin = async (data: LoginFormData) => {
    setLoading(true);
    setError('');
    
    try {
      const response = await authApi.login(data.email, data.password);
      
      if (response.success && response.data) {
        const { user, token } = response.data;
        
        const authUser = {
          id: user.id,
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          patientId: user.patientId,
          doctorId: user.doctorId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        
        login(authUser, token);
        
        // Redirect based on role
        switch (user.role) {
          case 'SUPERADMIN':
          case 'STAFF':
            router.push('/admin');
            break;
          case 'DOCTOR':
            router.push('/doctor');
            break;
          case 'PATIENT':
            router.push('/patient');
            break;
          default:
            router.push('/');
        }
      } else {
        setError(response.error || 'Invalid email or password');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.response?.data?.error || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (data: SignupFormData) => {
    setLoading(true);
    setError('');
    
    try {
      const [firstName, ...lastNameParts] = data.name.split(' ');
      const lastName = lastNameParts.join(' ') || firstName;
      
      const response = await authApi.register({
        email: data.email,
        password: data.password,
        firstName,
        lastName,
        phone: data.phone,
      });
      
      if (response.success && response.data) {
        const { user, token } = response.data;
        
        const authUser = {
          id: user.id,
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          patientId: user.patientId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        
        login(authUser, token);
        router.push('/patient');
      } else {
        setError(response.error || 'Registration failed');
      }
    } catch (err: any) {
      console.error('Signup error:', err);
      setError(err.response?.data?.error || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        p: 2,
        backgroundImage: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      }}
    >
      <Card
        sx={{
          maxWidth: 500,
          width: '100%',
          borderRadius: 3,
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
        }}
      >
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
              <Logo size="large" />
            </Box>
            <Typography variant="body2" color="text.secondary">
              Hospital Management System
            </Typography>
          </Box>

          <Tabs
            value={tab}
            onChange={(_, newValue) => {
              setTab(newValue);
              setError('');
            }}
            variant="fullWidth"
            sx={{ borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab label="Login" />
            <Tab label="Sign Up" />
          </Tabs>

          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}

          {/* Login Tab */}
          <TabPanel value={tab} index={0}>
            <form onSubmit={loginForm.handleSubmit(handleLogin)}>
              <Controller
                name="email"
                control={loginForm.control}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Email"
                    type="email"
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                    sx={{ mb: 2 }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Email color="action" />
                        </InputAdornment>
                      ),
                    }}
                  />
                )}
              />

              <Controller
                name="password"
                control={loginForm.control}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Password"
                    type={showPassword ? 'text' : 'password'}
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                    sx={{ mb: 3 }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Lock color="action" />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => setShowPassword(!showPassword)}
                            edge="end"
                          >
                            {showPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                )}
              />

              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={loading}
                sx={{ mb: 2 }}
              >
                {loading ? <CircularProgress size={24} /> : 'Login'}
              </Button>
            </form>

            <Divider sx={{ my: 2 }}>
              <Typography variant="caption" color="text.secondary">
                Demo Credentials
              </Typography>
            </Divider>

            <Box sx={{ bgcolor: 'action.hover', borderRadius: 2, p: 2 }}>
              <Typography variant="caption" component="div" sx={{ mb: 1 }}>
                <strong>Admin:</strong> admin@centralcare.com
              </Typography>
              <Typography variant="caption" component="div" sx={{ mb: 1 }}>
                <strong>Doctor:</strong> doctor@centralcare.com
              </Typography>
              <Typography variant="caption" component="div" sx={{ mb: 1 }}>
                <strong>Patient:</strong> patient@centralcare.com
              </Typography>
              <Typography variant="caption" component="div">
                <strong>Password:</strong> password123
              </Typography>
            </Box>
          </TabPanel>

          {/* Signup Tab */}
          <TabPanel value={tab} index={1}>
            <form onSubmit={signupForm.handleSubmit(handleSignup)}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Controller
                    name="name"
                    control={signupForm.control}
                    render={({ field, fieldState }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label="Full Name"
                        error={!!fieldState.error}
                        helperText={fieldState.error?.message}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <Person color="action" />
                            </InputAdornment>
                          ),
                        }}
                      />
                    )}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Controller
                    name="email"
                    control={signupForm.control}
                    render={({ field, fieldState }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label="Email"
                        type="email"
                        error={!!fieldState.error}
                        helperText={fieldState.error?.message}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <Email color="action" />
                            </InputAdornment>
                          ),
                        }}
                      />
                    )}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Controller
                    name="phone"
                    control={signupForm.control}
                    render={({ field, fieldState }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label="Phone"
                        error={!!fieldState.error}
                        helperText={fieldState.error?.message}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <Phone color="action" />
                            </InputAdornment>
                          ),
                        }}
                      />
                    )}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Controller
                    name="dob"
                    control={signupForm.control}
                    render={({ field, fieldState }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label="Date of Birth"
                        type="date"
                        error={!!fieldState.error}
                        helperText={fieldState.error?.message}
                        InputLabelProps={{ shrink: true }}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <CalendarMonth color="action" />
                            </InputAdornment>
                          ),
                        }}
                      />
                    )}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Controller
                    name="gender"
                    control={signupForm.control}
                    render={({ field, fieldState }) => (
                      <TextField
                        {...field}
                        select
                        fullWidth
                        label="Gender"
                        error={!!fieldState.error}
                        helperText={fieldState.error?.message}
                      >
                        <MenuItem value="male">Male</MenuItem>
                        <MenuItem value="female">Female</MenuItem>
                        <MenuItem value="other">Other</MenuItem>
                      </TextField>
                    )}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Controller
                    name="address"
                    control={signupForm.control}
                    render={({ field, fieldState }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label="Address"
                        multiline
                        rows={2}
                        error={!!fieldState.error}
                        helperText={fieldState.error?.message}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <Home color="action" />
                            </InputAdornment>
                          ),
                        }}
                      />
                    )}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Controller
                    name="password"
                    control={signupForm.control}
                    render={({ field, fieldState }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label="Password"
                        type={showPassword ? 'text' : 'password'}
                        error={!!fieldState.error}
                        helperText={fieldState.error?.message}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <Lock color="action" />
                            </InputAdornment>
                          ),
                          endAdornment: (
                            <InputAdornment position="end">
                              <IconButton
                                onClick={() => setShowPassword(!showPassword)}
                                edge="end"
                                size="small"
                              >
                                {showPassword ? <VisibilityOff /> : <Visibility />}
                              </IconButton>
                            </InputAdornment>
                          ),
                        }}
                      />
                    )}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Controller
                    name="confirmPassword"
                    control={signupForm.control}
                    render={({ field, fieldState }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label="Confirm Password"
                        type={showConfirmPassword ? 'text' : 'password'}
                        error={!!fieldState.error}
                        helperText={fieldState.error?.message}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <Lock color="action" />
                            </InputAdornment>
                          ),
                          endAdornment: (
                            <InputAdornment position="end">
                              <IconButton
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                edge="end"
                                size="small"
                              >
                                {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                              </IconButton>
                            </InputAdornment>
                          ),
                        }}
                      />
                    )}
                  />
                </Grid>
              </Grid>

              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={loading}
                sx={{ mt: 3 }}
              >
                {loading ? <CircularProgress size={24} /> : 'Create Account'}
              </Button>
            </form>
          </TabPanel>
        </CardContent>
      </Card>
    </Box>
  );
}
