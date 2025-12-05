'use client';

import React, { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Menu,
  MenuItem,
  Divider,
  useTheme,
  useMediaQuery,
  Tooltip,
  Badge,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard,
  People,
  LocalHospital,
  EventNote,
  Description,
  MedicalServices,
  Assessment,
  Settings,
  History,
  Logout,
  Brightness4,
  Brightness7,
  Notifications,
  ChevronLeft,
  SupervisorAccount,
} from '@mui/icons-material';
import { useAuthStore } from '@/store/authStore';
import { useThemeMode } from '@/theme/ThemeProvider';
import Logo from '../common/Logo';
import NotificationBell from '../common/NotificationBell';

const DRAWER_WIDTH = 280;
const DRAWER_WIDTH_COLLAPSED = 80;

interface NavItem {
  label: string;
  icon: React.ReactNode;
  path: string;
  roles?: string[];
}

const navItems: NavItem[] = [
  { label: 'Dashboard', icon: <Dashboard />, path: '/admin' },
  { label: 'Patients', icon: <People />, path: '/admin/patients' },
  { label: 'Doctors', icon: <LocalHospital />, path: '/admin/doctors' },
  { label: 'Staff', icon: <SupervisorAccount />, path: '/admin/staff', roles: ['SUPERADMIN'] },
  { label: 'Appointments', icon: <EventNote />, path: '/admin/appointments' },
  { label: 'Records', icon: <Description />, path: '/admin/records' },
  { label: 'Prescriptions', icon: <MedicalServices />, path: '/admin/prescriptions' },
  { label: 'Reports', icon: <Assessment />, path: '/admin/reports' },
  { label: 'Settings', icon: <Settings />, path: '/admin/settings' },
  { label: 'Audit Logs', icon: <History />, path: '/admin/audit-logs', roles: ['SUPERADMIN'] },
];

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const { mode, toggleTheme } = useThemeMode();

  const handleDrawerToggle = () => {
    if (isMobile) {
      setMobileOpen(!mobileOpen);
    } else {
      setCollapsed(!collapsed);
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    router.push('/auth/login');
  };

  const drawerWidth = collapsed && !isMobile ? DRAWER_WIDTH_COLLAPSED : DRAWER_WIDTH;

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed && !isMobile ? 'center' : 'space-between',
        }}
      >
        {collapsed && !isMobile ? (
          <Box sx={{ width: 40, height: 40 }}>
            <Logo size="small" showText={false} />
          </Box>
        ) : (
          <>
            <Logo size="medium" />
            {!isMobile && (
              <IconButton onClick={() => setCollapsed(true)} size="small">
                <ChevronLeft />
              </IconButton>
            )}
          </>
        )}
      </Box>
      <Divider />
      <List sx={{ flex: 1, px: 1, py: 2 }}>
        {navItems
          .filter((item) => !item.roles || item.roles.includes(user?.role || ''))
          .map((item) => {
            const isActive = pathname === item.path;
            return (
              <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
                <Tooltip title={collapsed && !isMobile ? item.label : ''} placement="right">
                  <ListItemButton
                    onClick={() => {
                      router.push(item.path);
                      if (isMobile) setMobileOpen(false);
                    }}
                    sx={{
                      borderRadius: 2,
                      minHeight: 48,
                      justifyContent: collapsed && !isMobile ? 'center' : 'initial',
                      bgcolor: isActive ? 'primary.main' : 'transparent',
                      color: isActive ? 'primary.contrastText' : 'text.primary',
                      '&:hover': {
                        bgcolor: isActive ? 'primary.dark' : 'action.hover',
                      },
                    }}
                  >
                    <ListItemIcon
                      sx={{
                        minWidth: collapsed && !isMobile ? 0 : 40,
                        color: isActive ? 'primary.contrastText' : 'text.secondary',
                        justifyContent: 'center',
                      }}
                    >
                      {item.icon}
                    </ListItemIcon>
                    {(!collapsed || isMobile) && (
                      <ListItemText
                        primary={item.label}
                        primaryTypographyProps={{
                          fontWeight: isActive ? 600 : 400,
                        }}
                      />
                    )}
                  </ListItemButton>
                </Tooltip>
              </ListItem>
            );
          })}
      </List>
      <Divider />
      <Box sx={{ p: 2 }}>
        {(!collapsed || isMobile) && (
          <Box
            sx={{
              p: 2,
              bgcolor: 'action.hover',
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
            }}
          >
            <Avatar
              sx={{ bgcolor: 'primary.main', width: 40, height: 40 }}
            >
              {user?.name?.charAt(0) || 'A'}
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="body2" fontWeight={600} noWrap>
                {user?.name || 'Admin'}
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap>
                {user?.role || 'STAFF'}
              </Typography>
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          bgcolor: 'background.paper',
          color: 'text.primary',
          transition: theme.transitions.create(['width', 'margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
        }}
      >
        <Toolbar>
          <IconButton
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
          <Box sx={{ flex: 1 }} />
          <IconButton onClick={toggleTheme} sx={{ mr: 1 }}>
            {mode === 'dark' ? <Brightness7 /> : <Brightness4 />}
          </IconButton>
          <NotificationBell />
          <IconButton onClick={handleMenuOpen}>
            <Avatar sx={{ width: 36, height: 36, bgcolor: 'primary.main' }}>
              {user?.name?.charAt(0) || 'A'}
            </Avatar>
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          >
            <MenuItem onClick={() => router.push('/admin/settings')}>
              <ListItemIcon>
                <Settings fontSize="small" />
              </ListItemIcon>
              Settings
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleLogout}>
              <ListItemIcon>
                <Logout fontSize="small" />
              </ListItemIcon>
              Logout
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Box
        component="nav"
        sx={{
          width: { md: drawerWidth },
          flexShrink: { md: 0 },
          transition: theme.transitions.create('width', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
        }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: DRAWER_WIDTH,
              bgcolor: 'background.paper',
            },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
              bgcolor: 'background.paper',
              transition: theme.transitions.create('width', {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.leavingScreen,
              }),
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          bgcolor: 'background.default',
          minHeight: '100vh',
          transition: theme.transitions.create(['width', 'margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
        }}
      >
        <Toolbar />
        {children}
      </Box>
    </Box>
  );
}
