"use client";
import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Register() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phoneNum: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [inputError, setInputError] = useState({});

  const router = useRouter();

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.id]: e.target.value,
    });
  };

  const validateInputs = () => {
    const errors = {};
    const passwordRegex =
      /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
    const phoneRegex = /^[0-9]{10}$/;

    if (!formData.password.match(passwordRegex)) {
      errors.password =
        "Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character.";
    }

    if (!formData.email.includes("@")) {
      errors.email = "Please enter a valid email address.";
    }

    if (!formData.phoneNum.match(phoneRegex)) {
      errors.phoneNum = "Please enter a valid 10-digit phone number.";
    }

    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    setInputError({});

    const errors = validateInputs();
    if (Object.keys(errors).length > 0) {
      setInputError(errors);
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/register`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
        },
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Registration failed. Please try again.",
        );
      }

      setSuccess("Registration successful!");
      router.push("/login");
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-gradient-to-r w-full from-[#012D65] to-[#0567A0] text-white p-4">
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

      <main className="container mx-auto mt-8 px-4 md:flex items-center">
        <div className="flex-1 pr-8">
          <Image
            src="/interview.png"
            alt="AIP Illustration"
            width={400}
            height={400}
            className="rounded-lg hidden md:block"
          />
        </div>
        <Card className="flex-1">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">
              Register Now!
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Input
                  id="name"
                  label="Name"
                  value={formData.name}
                  onChange={handleInputChange}
                />
              </div>
              <div className="space-y-2">
                <Input
                  id="email"
                  type="email"
                  label="Email"
                  value={formData.email}
                  onChange={handleInputChange}
                />
                {inputError.email && (
                  <p className="text-red-500">{inputError.email}</p>
                )}
              </div>
              <div className="space-y-2">
                <Input
                  id="phoneNum"
                  type="text"
                  label="Phone number"
                  value={formData.phoneNum}
                  onChange={handleInputChange}
                />
                {inputError.phoneNum && (
                  <p className="text-red-500">{inputError.phoneNum}</p>
                )}
              </div>
              <div className="space-y-2">
                <Input
                  id="password"
                  type="password"
                  label="Password"
                  value={formData.password}
                  onChange={handleInputChange}
                />
                {inputError.password && (
                  <p className="text-red-500">{inputError.password}</p>
                )}
              </div>
              {error && <p className="text-red-500">{error}</p>}
              {success && <p className="text-green-500">{success}</p>}
              <Button
                type="submit"
                className="w-full bg-[#0567A0] hover:bg-[#012D65]"
                disabled={loading}
              >
                {loading ? "Registering..." : "Register"}
              </Button>
            </form>
            <p className="mt-4 text-center">
              Already have an account?{" "}
              <a href="/login" className="text-blue-600 hover:underline">
                Login
              </a>
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
