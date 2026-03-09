import cron from 'node-cron';
import webPush from 'web-push';
import prisma from '../config/db.js';

// Configure Web Push with VAPID keys
webPush.setVapidDetails(
  'mailto:support@todoapp.com', // Replace with a real email in production
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

export const startCronJobs = () => {
  console.log('Starting CRON jobs...');

  // 1. Minutely Cron Job: Check for due tasks and send reminders
  // Runs every minute
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();
      
      // Find tasks that need reminding
      // Condition: reminderEnabled = true, remindedAt = null, reminderAt <= now
      const tasksToRemind = await prisma.task.findMany({
        where: {
          reminderAt: { lte: now },
          reminderEnabled: true,
          remindedAt: null,
          status: { notIn: ['done'] },
        },
        include: {
          user: {
            select: { id: true, pushEnabled: true }
          }
        }
      });

      for (const task of tasksToRemind) {
        const timeText = task.dueTime ? `at ${task.dueTime}` : 'today';
        const notificationTitle = `Task Reminder: ${task.title}`;
        const notificationMessage = `This task is due ${timeText}.`;

          // 1. Create In-App Notification
          await prisma.notification.create({
            data: {
              userId: task.user.id,
              type: 'reminder',
              title: notificationTitle,
              message: notificationMessage,
              data: { taskId: task.id }
            }
          });

          // 2. Mark task as reminded so we don't spam them every minute
          await prisma.task.update({
            where: { id: task.id },
            data: { remindedAt: now }
          });

          // 3. Send Web Push Notification IF user has it enabled
          if (task.user.pushEnabled) {
            const subscriptions = await prisma.pushSubscription.findMany({
              where: { userId: task.user.id }
            });

            const payload = JSON.stringify({
              title: notificationTitle,
              body: notificationMessage,
              url: `/projects/${task.projectId}` // URL to open when clicked
            });

            for (const sub of subscriptions) {
              try {
                // The subscription from the DB matches what web-push expects natively
                const pushSubscription = {
                  endpoint: sub.endpoint,
                  keys: {
                    p256dh: sub.p256dh,
                    auth: sub.auth
                  }
                };
                
                await webPush.sendNotification(pushSubscription, payload);
              } catch (pushError) {
                console.error('Error sending push notification:', pushError);
                // If the subscription is no longer valid (e.g. user revoked permission), delete it
                if (pushError.statusCode === 410 || pushError.statusCode === 404) {
                  await prisma.pushSubscription.delete({ where: { id: sub.id } });
                }
              }
            }
          }
      }
    } catch (error) {
      console.error('Error in Reminder CRON Job:', error);
    }
  });


  // 2. Daily Cron Job: Garbage Collection / Archiving old read notifications
  // Runs every day at midnight (0 0 * * *)
  cron.schedule('0 0 * * *', async () => {
    try {
      // Find read notifications older than 3 days
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      const result = await prisma.notification.updateMany({
        where: {
          read: true,
          isArchived: false,
          readAt: { lte: threeDaysAgo }
        },
        data: {
          isArchived: true
        }
      });

      if (result.count > 0) {
        console.log(`Archived ${result.count} old notifications.`);
      }
    } catch (error) {
      console.error('Error in Archival CRON Job:', error);
    }
  });

};
