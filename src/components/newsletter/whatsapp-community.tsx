import { whatsappCommunityUrl } from "@/lib/newsletter/site";

export function WhatsAppCommunityLink({ onDark = false }: { onDark?: boolean }) {
  return (
    <a
      className={onDark ? "btn btn-on-dark" : "btn btn-primary"}
      href={whatsappCommunityUrl}
      target="_blank"
      rel="noopener"
    >
      הצטרפות לקהילת הוואטסאפ
    </a>
  );
}
