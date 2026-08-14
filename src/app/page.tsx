import Image from "next/image";

export default function HomePage() {
  return (
    <>
      <section className="relative flex h-[70vh] min-h-[480px] items-center overflow-hidden">
        <Image
          src="/images/hero.jpg"
          alt="Landentwicklung in Rheinland-Pfalz"
          fill
          priority
          className="object-cover"
        />
        <div className="absolute inset-0 bg-neutral-900/55" />
        <div className="relative mx-auto max-w-4xl px-4 sm:px-6">
          <p className="text-sm font-bold uppercase tracking-widest text-neutral-200">
            Verband der Teilnehmergemeinschaften
          </p>
          <h1 className="mt-3 font-heading text-4xl font-bold text-white sm:text-5xl">
            Herzlich willkommen beim VTG!
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-neutral-100">
            Gemeinsam für geordnete Bodenentwicklung in Rheinland-Pfalz.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="grid grid-cols-1 gap-12">
          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-vtg-orange">
              Wer wir sind
            </p>
            <h2 className="mt-3 font-heading text-2xl font-bold text-neutral-900 sm:text-3xl">
              Gemeinsam für geordnete Bodenentwicklung in Rheinland-Pfalz.
            </h2>
            <div className="mt-6 space-y-4 text-base leading-relaxed text-neutral-700">
              <p>
                VTG steht für „Verband der Teilnehmergemeinschaften
                Rheinland-Pfalz". In ihm haben sich die
                Teilnehmergemeinschaften von Bodenordnungsverfahren
                landesweit zu einem Dachverband zusammengeschlossen. Mehr zu
                den Teilnehmergemeinschaften selbst finden Sie unter &gt;{" "}
                <a
                  href="https://www.landentwicklung.rlp.de/Internet/global/inetcntr.nsf/dlr_web_full.xsp?src=EU4WP82QQ4&p1=title%3DTeilnehmergemeinschaft+TG%7E%7Eurl%3D%2FInternet%2Fglobal%2Fthemen.nsf%2F%28Web_P_LEW_UKat_XP%29%2FD3FFD1CAD808757DC1256F0A004783FC%3FOpenDocument&p3=J0PCX9RS7G&p4=78HV82A9P5"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-vtg-orange hover:underline"
                >
                  Landentwicklung.rlp.de
                </a>{" "}
                &lt;
              </p>
              <p>
                Serviceleistungen des VTG sind vor allem die Sicherstellung
                der Finanzierung von Bodenordnungsverfahren nach dem
                Flurbereinigungsgesetz und die gesamte Bauabwicklung.
                Außerdem vertritt er die Interessen seiner Mitglieder im
                politischen Raum.
              </p>
              <p>
                Der VTG ist wie die Teilnehmergemeinschaften eine Körperschaft
                des öffentlichen Rechts. Rechtliche Grundlage ist das &gt;{" "}
                <a
                  href="https://www.gesetze-im-internet.de/flurbg/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-vtg-orange hover:underline"
                >
                  Flurbereinigungsgesetz
                </a>{" "}
                &lt;. Er verwaltet sich im Rahmen dieses Gesetzes und seiner
                Satzung selbst.
              </p>
              <p>Sitz der Geschäftsstelle ist Neustadt / Weinstrasse.</p>
              <p>
                Die folgenden Seiten sollen Ihnen zum einen Überblick über
                den Aufbau und die Organisation des VTG geben; zum anderen
                erhalten die Mitglieder in einem passwortgeschützten Login –
                Bereich die Möglichkeit, aktuelle verfahrensspezifische Daten
                aus der Buchhaltung abzurufen.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
