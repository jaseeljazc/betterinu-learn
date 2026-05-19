fetch('http://localhost:3000/api/admin/accounts/transactions?type=all').then(r => r.text()).then(t => console.log(t)).catch(e => console.error(e));
