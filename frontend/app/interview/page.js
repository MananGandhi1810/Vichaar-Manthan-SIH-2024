import dynamic from "next/dynamic";

const InterviewPage = dynamic(() => import("@/components/InterviewPage"), {
  ssr: false,
});

export default function Interview() {
  return <InterviewPage />;
}
