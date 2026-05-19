async function run() {
  const res = await fetch("http://localhost:3000/api/admin/accounts/reports?startDate=2024-05-01&endDate=2026-05-31", {
    headers: {
      Cookie: '__rbac=%7B%22role%22%3A%22super_admin%22%2C%22permissions%22%3A%5B%5D%7D;'
    }
  });
  const text = await res.text();
  console.log("Status:", res.status);
  console.log("Body:", text);
}
run();
