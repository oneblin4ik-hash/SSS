import { CampaignClient } from "@/components/campaigns/CampaignClient";
export const dynamic = "force-dynamic";
export default function MailingPage() {
  return <CampaignClient type="MAILING" />;
}
