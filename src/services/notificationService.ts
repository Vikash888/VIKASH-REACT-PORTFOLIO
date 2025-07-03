import { db } from '../config/firebase';
import { collection, addDoc, query, where, getDocs, updateDoc, doc, deleteDoc, orderBy, limit } from 'firebase/firestore';
import { User } from 'firebase/auth';

export interface Notification {
  id: string;
  type: 'info' | 'warning' | 'success';
  message: string;
  timestamp: Date;
  read: boolean;
  userId: string;
}

export class NotificationService {
  private static instance: NotificationService;
  private notificationsCollection = 'notifications';

  private constructor() {}

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  async createNotification(
    user: User,
    type: 'info' | 'warning' | 'success',
    message: string
  ): Promise<string> {
    try {
      const notificationData = {
        type,
        message,
        timestamp: new Date(),
        read: false,
        userId: user.uid
      };

      const docRef = await addDoc(
        collection(db, this.notificationsCollection),
        notificationData
      );
      return docRef.id;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  async getUserNotifications(user: User): Promise<Notification[]> {
    try {
      const q = query(
        collection(db, this.notificationsCollection),
        where('userId', '==', user.uid),
        orderBy('timestamp', 'desc'),
        limit(50)
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Notification[];
    } catch (error) {
      console.error('Error fetching notifications:', error);
      throw error;
    }
  }

  async markAsRead(notificationId: string): Promise<void> {
    try {
      const notificationRef = doc(db, this.notificationsCollection, notificationId);
      await updateDoc(notificationRef, {
        read: true
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  async markAllAsRead(user: User): Promise<void> {
    try {
      const notifications = await this.getUserNotifications(user);
      const updatePromises = notifications
        .filter(n => !n.read)
        .map(n => this.markAsRead(n.id));
      await Promise.all(updatePromises);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  async deleteNotification(notificationId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, this.notificationsCollection, notificationId));
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  }

  async clearAllNotifications(user: User): Promise<void> {
    try {
      const notifications = await this.getUserNotifications(user);
      const deletePromises = notifications.map(n => this.deleteNotification(n.id));
      await Promise.all(deletePromises);
    } catch (error) {
      console.error('Error clearing all notifications:', error);
      throw error;
    }
  }
}

export const notificationService = NotificationService.getInstance();