import { ProfileView } from "@/components/admin/profile/profile-view";

export const metadata = { title: "My Profile | Betterinu Admin" };

export default function AdminProfilePage() {
  return (
    <div className="p-6 lg:p-8">
      <ProfileView />
    </div>
  );
}
