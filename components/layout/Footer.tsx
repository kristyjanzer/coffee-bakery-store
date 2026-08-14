import Image from "next/image";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faInstagram,
  faTelegram,
  faWhatsapp,
} from "@fortawesome/free-brands-svg-icons";

// Адрес, часы работы и ссылки на соцсети — временные плейсхолдеры, станут
// редактируемыми через админку (docs/plan.md, пункт 20 "Управление страницами")
const socialLinks = [
  { href: "#", label: "Instagram", icon: faInstagram },
  { href: "#", label: "Telegram", icon: faTelegram },
  { href: "#", label: "WhatsApp", icon: faWhatsapp },
];

export function Footer() {
  return (
    <footer id="contacts" className="scroll-mt-20 border-t border-sage-mist/20 bg-black-olive px-6 py-12">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-10 md:flex-row md:justify-between">
        <Link href="/" className="flex items-center gap-3">
          <Image src="/images/logo.svg" alt="" width={40} height={40} className="size-10" />
          <span className="font-venuscom text-body-lg font-semibold uppercase tracking-[0.04em] text-warm-cream">
            Кофейня-пекарня
          </span>
        </Link>

        <div>
          <h2 className="font-venuscom text-caption uppercase tracking-[0.06em] text-sage-mist">
            О нас
          </h2>
          <p className="mt-3 font-venuscom text-body-sm text-warm-cream/80">
            г. Москва, ул. Кофейная, 12
          </p>
          <p className="font-venuscom text-body-sm text-warm-cream/80">
            Ежедневно 8:00–22:00
          </p>
        </div>

        <div>
          <h2 className="font-venuscom text-caption uppercase tracking-[0.06em] text-sage-mist">
            Связаться с нами
          </h2>
          <ul className="mt-3 flex gap-4">
            {socialLinks.map((social) => (
              <li key={social.label}>
                <a
                  href={social.href}
                  aria-label={social.label}
                  className="text-warm-cream hover:opacity-80"
                >
                  <FontAwesomeIcon icon={social.icon} className="size-5" />
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
