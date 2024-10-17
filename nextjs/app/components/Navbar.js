import Image from "next/image";
export default function Navbar() {
  return (
    <div className="bg-gradient-to-r from-[#012D65] to-[#0567A0] h-[15vh] flex items-center gap-8 p-4 w-screen">
      <Image src="/Logo.png" width={60} height={60} alt="Logo" />
      <h2 className="text-white font-bold text-xl max-w-[25ch]">
        Automated Interview Platform,
      </h2>
    </div>
  );
}
