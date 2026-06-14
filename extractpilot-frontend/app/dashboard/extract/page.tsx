import { redirect } from "next/navigation";

export default function ExtractRedirect() {
  redirect("/dashboard/workflow?step=3");
}
