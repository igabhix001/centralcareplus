'use client';

import React, { useState, useEffect } from 'react';
import {
  IconButton,
  Badge,
  Menu,
  MenuItem,
  Typography,
  Box,
  Divider,
  Button,
  ListItemText,
  ListItemIcon,
  CircularProgress,
} from '@mui/material';
import {
  Notifications,
  NotificationsNone,
  Event,
  Receipt,
  LocalHospital,
  Check,
  Delete,
} from '@mui/icons-material';
import { notificationsApi } from '@/lib/api';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { useRouter } from 'next/navigation';

dayjs.extend(relativeTime);

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  link?: string;
  createdAt: string;
}

export default function NotificationBell() {
  const router = useRouter();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const response = await notificationsApi.getAll({ limit: 10 }) as any;
      if (response.success) {
        setNotifications(response.data || []);
        setUnreadCount((response as any).unreadCount || 0);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
    fetchNotifications();
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.isRead) {
      await notificationsApi.markAsRead(notification.id);
      setUnreadCount((prev) => Math.max(0, prev - 1));
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n))
      );
    }
    if (notification.link) {
      router.push(notification.link);
    }
    handleClose();
  };

  const handleMarkAllRead = async () => {
    await notificationsApi.markAllAsRead();
    setUnreadCount(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'APPOINTMENT_REMINDER':
      case 'APPOINTMENT_CONFIRMED':
      case 'APPOINTMENT_CANCELLED':
        return <Event fontSize="small" color="primary" />;
      case 'PAYMENT_DUE':
      case 'PAYMENT_RECEIVED':
        return <Receipt fontSize="small" color="success" />;
      case 'PRESCRIPTION_READY':
      case 'LAB_RESULTS':
        return <LocalHospital fontSize="small" color="error" />;
      default:
        return <Notifications fontSize="small" />;
    }
  };

  return (
    <>
      <IconButton color="inherit" onClick={handleClick}>
        <Badge badgeContent={unreadCount} color="error">
          {unreadCount > 0 ? <Notifications /> : <NotificationsNone />}
        </Badge>
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        PaperProps={{
          sx: { width: 360, maxHeight: 480 },
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Notifications</Typography>
          {unreadCount > 0 && (
            <Button size="small" onClick={handleMarkAllRead} startIcon={<Check />}>
              Mark all read
            </Button>
          )}
        </Box>
        <Divider />

        {loading && notifications.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <CircularProgress size={24} />
          </Box>
        ) : notifications.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <NotificationsNone sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
            <Typography color="text.secondary">No notifications</Typography>
          </Box>
        ) : (
          notifications.map((notification) => (
            <MenuItem
              key={notification.id}
              onClick={() => handleNotificationClick(notification)}
              sx={{
                py: 1.5,
                px: 2,
                backgroundColor: notification.isRead ? 'transparent' : 'action.hover',
                '&:hover': { backgroundColor: 'action.selected' },
              }}
            >
              <ListItemIcon>{getIcon(notification.type)}</ListItemIcon>
              <ListItemText
                primary={
                  <Typography
                    variant="body2"
                    fontWeight={notification.isRead ? 'normal' : 'bold'}
                    noWrap
                  >
                    {notification.title}
                  </Typography>
                }
                secondary={
                  <>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{
                        display: 'block',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {notification.message}
                    </Typography>
                    <Typography variant="caption" color="text.disabled">
                      {dayjs(notification.createdAt).fromNow()}
                    </Typography>
                  </>
                }
              />
            </MenuItem>
          ))
        )}

        {notifications.length > 0 && (
          <>
            <Divider />
            <Box sx={{ p: 1, textAlign: 'center' }}>
              <Button size="small" onClick={handleClose}>
                View All Notifications
              </Button>
            </Box>
          </>
        )}
      </Menu>
    </>
  );
}
