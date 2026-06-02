require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('./src/generated/prisma/client');
const prisma = new PrismaClient();

async function main() {
  const employees = await prisma.hr_employees.findMany({
    where: {
      email: {
        in: ["batgamer7904@gmail.com", "jaseeljazck2@gmail.com"]
      }
    }
  });

  console.log("Employees found:", employees.length);

  for (const emp of employees) {
    for (let i = 1; i <= 3; i++) {
      const task = await prisma.tasks_tasks.create({
        data: {
          title: `Mock task ${i} for ${emp.email}`,
          description: `This is a mock task created for testing purposes for ${emp.email}`,
          type: "task",
          priority: i === 1 ? "high" : i === 2 ? "medium" : "low",
          status: "todo",
          visibility: "public",
          assigned_to: emp.id,
          assigned_by: emp.id,
          is_active: true
        }
      });
      console.log(`Created task ${task.id} for ${emp.email}`);
    }
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
