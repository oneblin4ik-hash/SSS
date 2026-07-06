import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Users,
  Shield,
  Flame,
  Database,
  Radar,
  ListChecks,
  ThumbsUp,
  Send,
  UserPlus,
  Eye,
  Link2,
  BarChart3,
  Settings,
  MessageCircle,
} from "lucide-react";

export type NavItem = {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  section?: string;
};

export const NAV: NavItem[] = [
  { id: "dashboard", label: "Дашборд", href: "/dashboard", icon: LayoutDashboard, section: "Обзор" },
  { id: "analytics", label: "Аналитика", href: "/analytics", icon: BarChart3, section: "Обзор" },
  { id: "links", label: "Ссылки", href: "/links", icon: Link2, section: "Обзор" },
  { id: "accounts", label: "Аккаунты", href: "/accounts", icon: Users, section: "Аккаунты" },
  { id: "proxies", label: "Прокси", href: "/proxies", icon: Shield, section: "Аккаунты" },
  { id: "warming", label: "Прогрев", href: "/warming", icon: Flame, section: "Аккаунты" },
  { id: "parsing", label: "Парсинг", href: "/parsing", icon: Database, section: "Привлечение" },
  { id: "monitoring", label: "Мониторинг", href: "/monitoring", icon: Radar, section: "Привлечение" },
  { id: "neurochat", label: "Нейрочат", href: "/neurochat", icon: MessageCircle, section: "Привлечение" },
  { id: "queue", label: "Очередь", href: "/queue", icon: ListChecks, section: "Привлечение" },
  { id: "inviting", label: "Инвайтинг", href: "/inviting", icon: UserPlus, section: "Рассылки" },
  { id: "mailing", label: "Рассылка", href: "/mailing", icon: Send, section: "Рассылки" },
  { id: "reactions", label: "Масс-реакции", href: "/reactions", icon: ThumbsUp, section: "Рассылки" },
  { id: "masslooking", label: "Масслукинг", href: "/masslooking", icon: Eye, section: "Рассылки" },
  { id: "settings", label: "Настройки", href: "/settings", icon: Settings, section: "Аккаунт" },
];
