import { motion, useScroll, useTransform } from "framer-motion";
import { useRef, useState } from "react";
import {
  Leaf,
  Dog,
  Snowflake,
  Car,
  Wind,
  Wrench,
  Flower,
  ClipboardList,
  Search,
  CheckCircle,
  Shield,
  MessageCircle,
  ArrowRight,
  Menu,
  X,
  HeartHandshake,
  MapPin,
  Lock,
  Sun,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router";
import { useAuth } from "@/hooks/use-auth";

const jobCategories = [
  { icon: Leaf, label: "Græsslåning", color: "text-[var(--trust)]" },
  { icon: Flower, label: "Havehjælp", color: "text-[var(--trust)]" },
  { icon: Dog, label: "Hundeluftning", color: "text-[var(--safety)]" },
  { icon: Snowflake, label: "Snerydning", color: "text-[var(--safety)]" },
  { icon: Car, label: "Bilvask", color: "text-[var(--trust)]" },
  { icon: Wind, label: "Løvrivning", color: "text-[var(--warning)]" },
];

const trustFeatures = [
  {
    icon: Shield,
    title: "MitID-verificerede kunder",
    description: "Alle kunder er verificeret via MitID — Danmarks officielle digitale ID.",
  },
  {
    icon: HeartHandshake,
    title: "Forældregodkendte unge",
    description: "Hjælpere under 18 har aktiv forældregodkendelse med tydelige rammer.",
  },
  {
    icon: MapPin,
    title: "Kun sikre udendørs opgaver",
    description: "Ingen indendørs arbejde, ingen transport, ingen private hjem.",
  },
  {
    icon: Lock,
    title: "Betaling i appen",
    description: "Sikker betaling via appen — ingen kontanter, ingen MobilePay uden for platformen.",
  },
  {
    icon: Sun,
    title: "Trygge arbejdstider",
    description: "Unge arbejder kun mellem kl. 08:00 og 18:00 i dagslys.",
  },
  {
    icon: MessageCircle,
    title: "Sikker beskedfunktion",
    description: "Al kommunikation bliver i appen. Ingen telefonnumre, ingen kontanter, ingen eksterne beskeder.",
  },
];

const steps = [
  {
    icon: ClipboardList,
    title: "Beskriv opgaven",
    description: "Fortæl hvad du har brug for — græsslåning, hundeluftning eller en anden udendørs opgave.",
  },
  {
    icon: Search,
    title: "Find en hjælper",
    description: "Verificerede lokale unge byder på opgaven. Se deres profil, bedømmelser og forældregodkendelse.",
  },
  {
    icon: CheckCircle,
    title: "Få det løst — sikkert",
    description: "Opgaven udføres, betaling sker i appen, og I kan begge skrive en anmeldelse.",
  },
];

export default function Landing() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const heroOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.6], [1, 0.98]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* ─── Navigation ─── */}
      <header className="sticky top-0 z-50 bg-background/85 backdrop-blur-md border-b border-border">
        <nav className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 font-bold text-lg tracking-tight hover:opacity-80 transition-all"
          >
            <div className="size-9 bg-[var(--trust)] flex items-center justify-center rounded-lg">
              <Wrench className="size-5 text-white" />
            </div>
            <span>Neighborly</span>
          </button>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6 text-sm font-medium">
            <a
              href="#how-it-works"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Sådan virker det
            </a>
            <a
              href="#categories"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Ydelser
            </a>
            <a
              href="#safety"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Sikkerhed
            </a>
            <Button
              onClick={() => navigate(isAuthenticated ? "/dashboard" : "/auth")}
              className="rounded-lg border border-border bg-[var(--trust)] text-white hover:bg-[var(--trust)]/90 shadow-sm transition-all px-5 h-10"
            >
              {isAuthenticated ? "Dashboard" : "Log ind"}
              <ArrowRight className="size-4 ml-1" />
            </Button>
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-muted transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </nav>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="md:hidden border-t border-border bg-background px-4 py-4 flex flex-col gap-2"
          >
            {[
              { href: "#how-it-works", label: "Sådan virker det" },
              { href: "#categories", label: "Ydelser" },
              { href: "#safety", label: "Sikkerhed" },
            ].map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors py-2 px-3 rounded-lg hover:bg-muted"
              >
                {link.label}
              </a>
            ))}
            <Button
              onClick={() => {
                setMobileMenuOpen(false);
                navigate("/auth");
              }}
              className="rounded-lg border border-border bg-[var(--trust)] text-white mt-2 w-full"
            >
              {isAuthenticated ? "Dashboard" : "Log ind"}
              <ArrowRight className="size-4 ml-1" />
            </Button>
          </motion.div>
        )}
      </header>

      {/* ─── Hero Section ─── */}
      <motion.section
        ref={heroRef}
        style={{ opacity: heroOpacity, scale: heroScale }}
        className="relative overflow-hidden"
      >
        {/* Subtle background */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-background via-muted/30 to-background" />

        <div className="max-w-6xl mx-auto px-4 pt-20 pb-16 md:pt-28 md:pb-24">
          <div className="max-w-3xl mx-auto text-center">
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="inline-flex items-center gap-2 bg-[var(--trust)]/10 text-[var(--trust)] border border-[var(--trust)]/20 rounded-full px-4 py-1.5 mb-8"
            >
              <HeartHandshake className="size-4" />
              <span className="text-sm font-semibold">
                Tryg hjælp fra unge i nabolaget
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.08] tracking-tight mb-6"
            >
              Tryg hjælp fra{" "}
              <span className="text-[var(--trust)]">unge i dit nabolag</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 leading-relaxed"
            >
              Book verificerede lokale hjælpere til sikre udendørs opgaver — med
              forældregodkendelse for unge under 18. Al betaling og kommunikation
              foregår i appen.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-4 justify-center mb-12"
            >
              <Button
                onClick={() => navigate("/auth")}
                size="lg"
                className="rounded-xl bg-[var(--trust)] text-white hover:bg-[var(--trust)]/90 shadow-sm transition-all text-base px-8 h-14 font-semibold"
              >
                Book hjælp
                <ArrowRight className="size-5 ml-2" />
              </Button>
              <Button
                onClick={() => navigate("/auth")}
                size="lg"
                variant="outline"
                className="rounded-xl border-2 border-border bg-card text-foreground hover:bg-muted shadow-sm transition-all text-base px-8 h-14 font-semibold"
              >
                Bliv hjælper
              </Button>
            </motion.div>

            {/* Trust row */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-3xl mx-auto"
            >
              {[
                { icon: Shield, text: "MitID-verificerede kunder" },
                { icon: HeartHandshake, text: "Forældregodkendte unge" },
                { icon: MapPin, text: "Kun sikre udendørs opgaver" },
                { icon: Lock, text: "Betaling i appen" },
              ].map((item) => (
                <div
                  key={item.text}
                  className="flex items-center gap-2 bg-card border border-border rounded-xl px-3 py-2.5"
                >
                  <item.icon className="size-4 shrink-0 text-[var(--trust)]" />
                  <span className="text-xs font-medium text-muted-foreground leading-tight">
                    {item.text}
                  </span>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* ─── How It Works ─── */}
      <section id="how-it-works" className="py-20 md:py-28 bg-card border-y border-border">
        <div className="max-w-6xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
              Sådan virker det
            </h2>
            <p className="text-muted-foreground text-lg max-w-lg mx-auto">
              Tre enkle trin til at booke tryg hjælp i dit nabolag.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6 md:gap-8">
            {steps.map((step, i) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.5, delay: i * 0.12 }}
                className="bg-background border border-border rounded-2xl p-8 text-center relative"
              >
                <div className="absolute -top-3 -left-3 size-8 bg-[var(--trust)] rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-sm">{i + 1}</span>
                </div>
                <div className="inline-flex items-center justify-center size-14 bg-[var(--trust)]/10 rounded-xl mb-5">
                  <step.icon className="size-6 text-[var(--trust)]" />
                </div>
                <h3 className="text-lg font-bold mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Categories (safe outdoor only) ─── */}
      <section id="categories" className="py-20 md:py-28">
        <div className="max-w-6xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
              Udendørs nabolagsydelser
            </h2>
            <p className="text-muted-foreground text-lg max-w-lg mx-auto">
              Kun sikre udendørs opgaver — ingen indendørs arbejde, ingen
              transport, ingen private hjem.
            </p>
          </motion.div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
            {jobCategories.map((cat, i) => (
              <motion.div
                key={cat.label}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
                className="bg-card border border-border rounded-2xl p-5 text-center cursor-default hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 transition-all duration-200"
              >
                <cat.icon className={`size-8 mx-auto mb-3 ${cat.color}`} />
                <p className="text-sm font-semibold">{cat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Safety / Trust Features ─── */}
      <section id="safety" className="py-20 md:py-28 bg-card border-y border-border">
        <div className="max-w-6xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
              Tryghed for alle
            </h2>
            <p className="text-muted-foreground text-lg max-w-lg mx-auto">
              Neighborly er bygget på tillid — med sikkerhed som fundamentet for
              hver eneste interaktion.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {trustFeatures.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className="bg-background border border-border rounded-2xl p-6 hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] transition-all duration-200"
              >
                <div className="size-11 bg-[var(--trust)]/10 rounded-xl flex items-center justify-center mb-4">
                  <feature.icon className="size-5 text-[var(--trust)]" />
                </div>
                <h3 className="text-base font-bold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA Section ─── */}
      <section className="py-20 md:py-28 bg-[var(--trust)] relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]">
          <div className="absolute inset-0 bg-[radial-gradient(circle,_white_1px,transparent_1px)] bg-[size:24px_24px]" />
        </div>

        <div className="max-w-3xl mx-auto px-4 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-6 text-white">
              Klar til tryg hjælp fra nabolaget?
            </h2>
            <p className="text-white/80 text-lg max-w-lg mx-auto mb-10 leading-relaxed">
              Book en verificeret lokal hjælper eller tilmeld dig som hjælper.
              Det tager under et minut.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                onClick={() => navigate("/auth")}
                size="lg"
                className="rounded-xl bg-white text-[var(--trust)] hover:bg-white/90 shadow-sm transition-all text-base px-8 h-14 font-bold"
              >
                Kom gratis i gang
                <ArrowRight className="size-5 ml-2" />
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-border bg-card py-12">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid sm:grid-cols-2 gap-8 mb-10">
            <div>
              <div className="flex items-center gap-2 font-bold text-lg mb-3">
                <div className="size-8 bg-[var(--trust)] flex items-center justify-center rounded-lg">
                  <Wrench className="size-4 text-white" />
                </div>
                Neighborly
              </div>
              <p className="text-sm text-muted-foreground max-w-xs">
                Tryg hjælp fra unge i dit nabolag. Forældregodkendt. MitID-verificeret.
                Kun udendørs.
              </p>
            </div>

            <div>
              <h4 className="font-bold text-sm mb-3">Platform</h4>
              <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                <a href="#how-it-works" className="hover:text-foreground transition-colors">Sådan virker det</a>
                <a href="#categories" className="hover:text-foreground transition-colors">Ydelser</a>
                <a href="#safety" className="hover:text-foreground transition-colors">Sikkerhed</a>
              </div>
            </div>
          </div>

          <div className="border-t border-border pt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-xs text-muted-foreground">
              &copy; {new Date().getFullYear()} Neighborly. Alle rettigheder forbeholdes.
            </p>
            <p className="text-xs text-muted-foreground">
              Bygget på tillid — for trygge nabolag.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
