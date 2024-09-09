import dynamic from "next/dynamic";

const FeedbackPage = dynamic(() => import("@/components/FeedbackPage"), {
    ssr: false,
});

export default function Feedback() {
    return <FeedbackPage />;
}
