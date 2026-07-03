import { motion, useScroll, useTransform } from "framer-motion";
import { useRef, useState } from "react";
import {
  Leaf,
  Dog,
  Snowflake,
  Car,
  ShoppingCart,
  Sofa,
  Bike,
  ClipboardList,
  Search,
  CheckCircle,
  Shield,
  Star,
  Clock,
  MessageCircle,
  ArrowRight,
  Menu,
  X,
  Sparkles,
  Wrench,
  Flower,
  Wind,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router";
import { useAuth } from "@/hooks/use-auth";

const jobCategories = [
  { icon: Leaf, label: "Lawn Mowing", color: "text-green-600" },
  { icon: Flower, label: "Gardening", color: "text-emerald-600" },
  { icon: Dog, label: "Dog Walking", color: "text-amber-600" },
  { icon: Snowflake, label: "Snow Shoveling", color: "text-blue-500" },
  { icon: Car, label: "Car Washing", color: "text-sky-500" },
  { icon: Wind, label: "Leaf Raking", color: "text-orange-600" },
  { icon: ShoppingCart, label: "Grocery Delivery", color: "text-rose-500" },
  { icon: Sofa, label: "Furniture Moving", color: "text-purple-600" },
  { icon: Bike, label: "Bike Repair", color: "text-cyan-600" },
];

const features = [
  {
    icon: Shield,
    title: "Verified Neighbors",
    description:
      "Every helper is verified through our community trust system. Know who's coming to your door.",
  },
  {
    icon: Star,
    title: "Rated & Reviewed",
    description:
      "Read honest reviews from your actual neighbors. Build trust through shared experiences.",
  },
  {
    icon: Clock,
    title: "Fast & Flexible",
    description:
      "Book help for today or schedule ahead. Find someone available when you need them.",
  },
  {
    icon: MessageCircle,
    title: "Direct Messaging",
    description:
      "Chat with your helper before they arrive. Discuss details, share photos, stay in sync.",
  },
];

const steps = [
  {
    icon: ClipboardList,
    title: "Post a Task",
    description: "Describe what you need done, set your price, and pick a time.",
  },
  {
    icon: Search,
    title: "Get Matched",
    description:
      "Trusted helpers in your neighborhood see your task and offer to help.",
  },
  {
    icon: CheckCircle,
    title: "Job Done Right",
    description:
      "Your neighbor shows up, gets it done, and you both rate the experience.",
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
  const heroScale = useTransform(scrollYProgress, [0, 0.6], [1, 0.95]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* ─── Navigation ─── */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm border-b-2 border-foreground">
        <nav className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 font-bold text-xl tracking-tight hover:opacity-80 transition-opacity"
          >
            <div className="size-9 bg-primary flex items-center justify-center rounded-none">
              <Wrench className="size-5 text-primary-foreground" />
            </div>
            Neighborly
          </button>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6 text-sm font-medium">
            <a
              href="#how-it-works"
              className="hover:text-primary transition-colors"
            >
              How It Works
            </a>
            <a
              href="#categories"
              className="hover:text-primary transition-colors"
            >
              Services
            </a>
            <a
              href="#features"
              className="hover:text-primary transition-colors"
            >
              Why Neighborly
            </a>
            <Button
              onClick={() => navigate("/auth")}
              className="rounded-none border-2 border-foreground shadow-[3px_3px_0px_0px_var(--color-foreground)] hover:shadow-[1px_1px_0px_0px_var(--color-foreground)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
            >
              {isAuthenticated ? "Dashboard" : "Sign In"}
              <ArrowRight className="size-4" />
            </Button>
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <X className="size-6" />
            ) : (
              <Menu className="size-6" />
            )}
          </button>
        </nav>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="md:hidden border-t-2 border-foreground bg-background px-4 py-4 flex flex-col gap-3"
          >
            <a
              href="#how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="text-sm font-medium hover:text-primary transition-colors py-2"
            >
              How It Works
            </a>
            <a
              href="#categories"
              onClick={() => setMobileMenuOpen(false)}
              className="text-sm font-medium hover:text-primary transition-colors py-2"
            >
              Services
            </a>
            <a
              href="#features"
              onClick={() => setMobileMenuOpen(false)}
              className="text-sm font-medium hover:text-primary transition-colors py-2"
            >
              Why Neighborly
            </a>
            <Button
              onClick={() => {
                setMobileMenuOpen(false);
                navigate("/auth");
              }}
              className="rounded-none border-2 border-foreground shadow-[3px_3px_0px_0px_var(--color-foreground)] w-full mt-2"
            >
              {isAuthenticated ? "Dashboard" : "Sign In"}
              <ArrowRight className="size-4" />
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
        {/* Decorative background pattern */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--color-foreground)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-foreground)_1px,transparent_1px)] bg-[size:64px_64px] opacity-[0.03]" />
        </div>

        <div className="max-w-6xl mx-auto px-4 pt-24 pb-20 md:pt-32 md:pb-28">
          <div className="max-w-3xl mx-auto text-center">
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 bg-accent border-2 border-foreground px-4 py-1.5 mb-8"
            >
              <Sparkles className="size-4" />
              <span className="text-sm font-semibold uppercase tracking-wider">
                Your Neighborhood, Connected
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black leading-[1.05] tracking-tight mb-6"
            >
              Get things done by{" "}
              <span className="text-primary">people next door</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-lg sm:text-xl text-muted-foreground max-w-xl mx-auto mb-10 leading-relaxed"
            >
              Hire trusted neighbors for lawn care, dog walking, snow shoveling,
              and more. Or earn money helping out in your own community.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <Button
                onClick={() => navigate("/auth")}
                size="lg"
                className="rounded-none border-2 border-foreground shadow-[4px_4px_0px_0px_var(--color-foreground)] hover:shadow-[2px_2px_0px_0px_var(--color-foreground)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all text-base px-8 h-14"
              >
                Get Started
                <ArrowRight className="size-5" />
              </Button>
              <a href="#how-it-works">
                <Button
                  variant="outline"
                  size="lg"
                  className="rounded-none border-2 border-foreground shadow-[4px_4px_0px_0px_var(--color-foreground)] hover:shadow-[2px_2px_0px_0px_var(--color-foreground)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all text-base px-8 h-14"
                >
                  How It Works
                </Button>
              </a>
            </motion.div>
          </div>
        </div>


      </motion.section>

      {/* ─── How It Works ─── */}
      <section id="how-it-works" className="py-20 md:py-28 bg-muted border-y-2 border-foreground">
        <div className="max-w-6xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight mb-4">
              How it works
            </h2>
            <p className="text-muted-foreground text-lg max-w-lg mx-auto">
              Three simple steps to get help or start earning in your
              neighborhood.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6 md:gap-8">
            {steps.map((step, i) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.5, delay: i * 0.15 }}
                className="border-2 border-foreground bg-card p-8 text-center relative group hover:shadow-[4px_4px_0px_0px_var(--color-foreground)] hover:-translate-x-[2px] hover:-translate-y-[2px] transition-all"
              >
                {/* Step number */}
                <div className="absolute -top-4 -left-4 size-8 bg-primary border-2 border-foreground flex items-center justify-center">
                  <span className="text-primary-foreground font-black text-sm">
                    {i + 1}
                  </span>
                </div>
                <div className="inline-flex items-center justify-center size-16 bg-accent border-2 border-foreground mb-6">
                  <step.icon className="size-7" />
                </div>
                <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Categories ─── */}
      <section id="categories" className="py-20 md:py-28">
        <div className="max-w-6xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight mb-4">
              Neighborhood services
            </h2>
            <p className="text-muted-foreground text-lg max-w-lg mx-auto">
              From lawn care to furniture moving — whatever you need, a neighbor
              can help.
            </p>
          </motion.div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {jobCategories.map((cat, i) => (
              <motion.div
                key={cat.label}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
                className="border-2 border-foreground bg-card p-5 text-center cursor-default hover:shadow-[3px_3px_0px_0px_var(--color-foreground)] hover:-translate-x-[1px] hover:-translate-y-[1px] transition-all group"
              >
                <cat.icon
                  className={`size-8 mx-auto mb-3 ${cat.color} group-hover:scale-110 transition-transform`}
                />
                <p className="text-sm font-semibold">{cat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Features ─── */}
      <section id="features" className="py-20 md:py-28 bg-muted border-y-2 border-foreground">
        <div className="max-w-6xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight mb-4">
              Why neighbors trust Neighborly
            </h2>
            <p className="text-muted-foreground text-lg max-w-lg mx-auto">
              We're building the safest, most reliable way to get things done
              locally.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="border-2 border-foreground bg-card p-6 group hover:shadow-[4px_4px_0px_0px_var(--color-foreground)] transition-all"
              >
                <div className="size-12 bg-primary border-2 border-foreground flex items-center justify-center mb-4">
                  <feature.icon className="size-6 text-primary-foreground" />
                </div>
                <h3 className="text-lg font-bold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA Section ─── */}
      <section className="py-20 md:py-28 bg-primary border-y-2 border-foreground relative overflow-hidden">
        {/* Decorative pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle,var(--color-primary-foreground)_1px,transparent_1px)] bg-[size:20px_20px]" />
        </div>

        <div className="max-w-3xl mx-auto px-4 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight mb-6 text-primary-foreground">
              Ready to meet your neighbors?
            </h2>
            <p className="text-primary-foreground/80 text-lg max-w-lg mx-auto mb-10 leading-relaxed">
              Join the neighborhood. Post your first task or sign up to help
              others. It takes less than a minute.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                onClick={() => navigate("/auth")}
                size="lg"
                variant="outline"
                className="rounded-none border-2 border-primary-foreground bg-primary-foreground text-foreground shadow-[4px_4px_0px_0px_var(--color-foreground)] hover:shadow-[2px_2px_0px_0px_var(--color-foreground)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all text-base px-8 h-14 font-bold"
              >
                Get Started Free
                <ArrowRight className="size-5" />
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t-2 border-foreground bg-card py-12">
        <div className="max-w-6xl mx-auto px-4">
          <div className="            grid sm:grid-cols-2 md:grid-cols-2 gap-8 mb-10">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-2 font-bold text-lg mb-3">
                <div className="size-8 bg-primary flex items-center justify-center rounded-none">
                  <Wrench className="size-4 text-primary-foreground" />
                </div>
                Neighborly
              </div>
              <p className="text-sm text-muted-foreground">
                Connecting neighbors, one task at a time.
              </p>
            </div>

            {/* Links */}
            <div>
              <h4 className="font-bold text-sm mb-3 uppercase tracking-wider">
                Platform
              </h4>
              <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                <a href="#how-it-works" className="hover:text-foreground transition-colors">How It Works</a>
                <a href="#categories" className="hover:text-foreground transition-colors">Services</a>
                <a href="#features" className="hover:text-foreground transition-colors">Safety</a>
              </div>
            </div>

          </div>

          <div className="border-t-2 border-foreground pt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-xs text-muted-foreground">
              &copy; {new Date().getFullYear()} Neighborly. All rights reserved.
            </p>
            <p className="text-xs text-muted-foreground">
              Made with &hearts; for neighborhoods everywhere.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
