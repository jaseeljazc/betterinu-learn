import { sendWelcomeEmail } from "../src/lib/email";

async function testEmail() {
  console.log("Testing email sending...");
  await sendWelcomeEmail({
    name: "Test User",
    email: "betterinuithub@gmail.com", // Sending to self for test
    password: "test-password-123"
  });
  console.log("Test finished. Check console for any errors.");
}

testEmail();
