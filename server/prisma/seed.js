import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create demo user
  const hashedPassword = await bcrypt.hash('password123', 10);
  
  const user = await prisma.user.upsert({
    where: { email: 'demo@example.com' },
    update: {},
    create: {
      email: 'demo@example.com',
      password: hashedPassword,
      name: 'Demo User',
    },
  });

  console.log('Created demo user:', user.email);

  // Create demo projects
  const projects = [
    { name: 'Personal', color: '#3b82f6', position: 0 },
    { name: 'Work', color: '#ef4444', position: 1 },
    { name: 'Shopping', color: '#22c55e', position: 2 },
  ];

  for (const projectData of projects) {
    const project = await prisma.project.upsert({
      where: { id: `demo-${projectData.name.toLowerCase()}` },
      update: {},
      create: {
        id: `demo-${projectData.name.toLowerCase()}`,
        userId: user.id,
        ...projectData,
      },
    });

    // Create demo tasks
    const tasks = [
      { title: 'Sample task 1', status: 'todo', priority: 'high', position: 0 },
      { title: 'Sample task 2', status: 'todo', priority: 'medium', position: 1 },
      { title: 'In progress task', status: 'in_progress', priority: 'high', position: 0 },
      { title: 'Completed task', status: 'done', priority: 'low', position: 0 },
    ];

    for (const taskData of tasks) {
      await prisma.task.create({
        data: {
          projectId: project.id,
          userId: user.id,
          ...taskData,
        },
      });
    }

    console.log(`Created project: ${project.name}`);
  }

  console.log('Seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
