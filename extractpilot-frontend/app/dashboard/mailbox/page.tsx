import { redirect } from "next/navigation";

export default function MailboxRedirect() {
  redirect("/dashboard/workflow?step=2");
}
