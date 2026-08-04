import { createFileRoute } from "@tanstack/react-router";
import { CampusRollSplash } from "@/components/campus-roll-splash";

const title = "CampusRoll — YMCA BCA Data Science Attendance";
const description =
  "Offline-first attendance tracker for YMCA BCA Data Science: live sessions, student self check-in, history and CSV exports.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: Index,
});

function Index() {
  return <CampusRollSplash />;
}
