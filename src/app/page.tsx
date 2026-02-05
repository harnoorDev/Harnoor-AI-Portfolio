import AnimatedBackground from "@/components/AnimatedBackground";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import About from "@/components/About";
import Skills from "@/components/Skills";
import Articles from "@/components/Articles";
import Certifications from "@/components/Certifications";
import Contact from "@/components/Contact";

export default function Home() {
  return (
    <main className="relative min-h-screen grid-bg">
      <AnimatedBackground />
      <Navbar />
      <Hero />
      <About />
      <Skills />
      <Articles />
      <Certifications />
      <Contact />
    </main>
  );
}
