import { CampaignClient } from "@/components/campaigns/CampaignClient";
export const dynamic = "force-dynamic";
export default function ReactionsPage() {
  return <CampaignClient type="REACTION" />;
}
