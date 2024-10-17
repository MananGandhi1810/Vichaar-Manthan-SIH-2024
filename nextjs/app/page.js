"use client";
import { useCallback, useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Image from "next/image";
import { CircleX } from "lucide-react";
import { useRouter } from "next/navigation";

export default function Page() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState("");
  const [selectedRole, setSelectedRole] = useState("Software Engineer");
  const [showUploadArea, setShowUploadArea] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authToken, setAuthToken] = useState("");
  const router = useRouter();

  useEffect(() => {
    const token = sessionStorage.getItem("authToken");
    if (!token) {
      router.push("/login");
    }
    setAuthToken(token);
  }, [router]);

  const onDrop = useCallback((acceptedFiles) => {
    const file = acceptedFiles[0];
    if (file && file.type === "application/pdf") {
      setSelectedFile(file);
      setUploadStatus("");
    } else {
      setUploadStatus("Please upload a PDF file.");
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [] },
    disabled: !showUploadArea,
  });

  const handleSubmit = async () => {
    if (!selectedFile) {
      setUploadStatus("No file selected.");
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append("resume", selectedFile);
    formData.append("roleSelect", selectedRole);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/user/resume/${selectedRole}`,
        {
          method: "POST",
          body: formData,
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        },
      );

      if (response.ok) {
        const data = await response.json();
        console.log({
          selectedRole: selectedRole,
          id: data.data.resumeId,
        });

        sessionStorage.setItem(
          "userData",
          JSON.stringify({
            selectedRole: selectedRole,
            id: data.data.resumeId,
          }),
        );
        router.push("/interview");
      } else {
        setUploadStatus(response.message);
      }
    } catch (error) {
      setUploadStatus("Error occurred during file upload.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setSelectedFile(null);
    setUploadStatus("");
  };

  function truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  }

  return (
    <div className="flex flex-col min-h-screen items-center text-black">
      <header className="bg-gradient-to-r w-screen from-[#012D65] to-[#0567A0] text-white p-4">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Image src="/Logo.png" alt="AIP Logo" width={60} height={60} />
            <div>
              <h1 className="text-xl font-bold">
                Automated Interview Platform
              </h1>
            </div>
          </div>
        </div>
      </header>

      <main className="flex flex-col-reverse justify-center items-center md:flex-row container p-8">
        <Card className="p-6 bg-[#E8F3FF] h-auto mx-0 md:mx-4 mb-8 md:mb-0 text-black md:w-1/3">
          <h2 className="text-xl text-center font-semibold mb-4">
            Kindly Upload Your Resume for a Professional Assessment
          </h2>
          <p className="text-sm text-gray-600 mb-4 text-center">
            Upload PDF Files only
          </p>
          <div className="mb-4">
            <label
              htmlFor="role"
              className="block text-sm font-medium text-gray-700"
            >
              Select Your Role
            </label>
            <select
              id="role"
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="mt-1 block w-full p-1 border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
              <option value="Software Engineer">Software Engineer</option>
              <option value="Scientist">Scientist</option>
              <option value="Researcher">Researcher</option>
              <option value="Analyst">Analyst</option>
            </select>
          </div>
          {!showUploadArea && (
            <Button
              className="w-full mt-4 bg-[#0A4B8F] hover:bg-[#0A3F7D]"
              onClick={() => setShowUploadArea(true)}
            >
              Upload Resume
            </Button>
          )}
          {showUploadArea && (
            <>
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-4 text-center ${
                  isDragActive ? "border-blue-500" : "border-gray-300"
                }`}
              >
                <input {...getInputProps()} />
                <Image
                  src={"/doc.png"}
                  className="mx-auto"
                  width={100}
                  height={100}
                />
                {isDragActive ? (
                  <p className="mt-2 text-sm text-gray-600">
                    Drop the file here...
                  </p>
                ) : (
                  <p className="mt-2 text-sm text-gray-600">
                    Drag your resume here or click to select
                  </p>
                )}
              </div>
              {selectedFile && (
                <div className="mt-4 flex flex-col w-full content-evenly justify-between space-y-2">
                  <div className="flex items-center justify-between space-x-2  mx-auto">
                    <span className="h-2 w-2 bg-green-500 rounded-full"></span>
                    <Image
                      src="/pdf.png"
                      alt="PDF icon"
                      width={25}
                      height={25}
                    />
                    <div className="">
                      <span className="text-sm text-gray-600 ">
                        {truncateText(selectedFile.name, 25)}
                      </span>
                      <p className="text-xs text-gray-400">
                        {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                      </p>
                    </div>
                    <CircleX
                      className="text-red-500 cursor-pointer"
                      onClick={handleCancel}
                      size={35}
                    />
                  </div>
                </div>
              )}
              {selectedFile && (
                <Button
                  className={`w-full mt-4 ${
                    loading ? "bg-gray-500" : "bg-[#0A4B8F]"
                  } ${loading ? "hover:bg-gray-500" : "hover:bg-[#0A3F7D]"}`}
                  onClick={handleSubmit}
                  disabled={loading} // Disable button while loading
                >
                  {loading ? "Processing..." : "Submit Resume"}
                </Button>
              )}
              {uploadStatus && (
                <p className="mt-2 text-sm text-gray-600">{uploadStatus}</p>
              )}
            </>
          )}
        </Card>
        <Image
          src={"/Frame.png"}
          width={1500}
          height={1500}
          alt="image"
          className="ml-0 hidden md:block md:ml-4 md:w-2/3"
        />
      </main>
    </div>
  );
}
