
import Navbar from "@/components/layout/Navbar";
import LoginTemplate from "@/components/templates/LoginTemplate";
import ApiConnectionTest from "@/components/ApiConnectionTest";

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main>
        <LoginTemplate />
        <ApiConnectionTest />
      </main>
    </>
  );
}
