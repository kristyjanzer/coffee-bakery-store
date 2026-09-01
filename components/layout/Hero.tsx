import Image from "next/image";
import { ParallaxLayer } from "@/components/ui/ParallaxLayer";

// DESIGN.md, "Hero Overlay Display Text" + "Hero Sub-Line": фото на всю секцию,
// тёмный градиент-скрим поверх для читаемости текста (в Do's/Don'ts запрещены
// градиенты как декоративный эффект на карточках/кнопках — здесь это не декор,
// а условие контраста текста, тот же приём, которым в макете текст "делит тёмный
// холст" с фотографией).
export function Hero() {
  return (
    <section className="relative flex min-h-[calc(100vh-80px)] items-center overflow-hidden bg-black-olive px-6 py-16">
      <ParallaxLayer>
        <Image
          src="/images/hero.jpg"
          alt="Витрина кофейни-пекарни со свежей выпечкой"
          fill
          priority
          // Next 16 при priority больше не проставляет fetchpriority сам — без
          // этого LCP-картинка грузится обычным приоритетом (PageSpeed это ловит).
          fetchPriority="high"
          quality={65}
          sizes="100vw"
          className="scale-125 object-cover"
        />
      </ParallaxLayer>
      <div className="absolute inset-0 bg-gradient-to-t from-black-olive via-black-olive/70 to-black-olive/30" />
      <div className="relative z-10 mx-auto w-full max-w-[1200px]">
        <h1 className="max-w-2xl text-balance font-dela-gothic-one text-[30px] font-normal uppercase leading-none text-lemon-zest md:text-[55px]">
          Утро начинается здесь
        </h1>
        <p className="mt-5 max-w-md font-dela-gothic-one text-body-lg text-warm-cream">
          Свежая выпечка и авторский кофе каждый день
        </p>
      </div>
    </section>
  );
}
