import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
  const req = await fetch('http://localhost:3000/api/admin/employees/tasks', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // We don't have a session cookie here, so this will fail with Unauthorized.
    },
    body: JSON.stringify({
      title: 'Test Task from script',
      assignedTo: 'b1f958aa-2bd5-4b94-8bfd-472659864369', // Adith
    })
  });
  console.log(await req.json());
}
main().catch(console.error);
