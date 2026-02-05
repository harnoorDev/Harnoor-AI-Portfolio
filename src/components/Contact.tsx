"use client";

import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { Linkedin, Github, Mail, MapPin } from "lucide-react";

const socials = [
  {
    name: "LinkedIn",
    icon: Linkedin,
    url: "https://www.linkedin.com/in/harnoors",
    color: "#0A66C2",
    label: "Connect with me",
  },
  {
    name: "GitHub",
    icon: Github,
    url: "https://github.com/harnoorDev",
    color: "#ffffff",
    label: "See my code",
  },
  {
    name: "Email",
    icon: Mail,
    url: "mailto:harnoor24@outlook.com",
    color: "#00d4ff",
    label: "harnoor24@outlook.com",
  },
];

export default function Contact() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="contact" className="py-32 px-6 md:px-8 relative">
      <div className="max-w-4xl mx-auto text-center" ref={ref}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
            Let&apos;s <span className="gradient-text">Connect</span>
          </h2>
          <p className="text-gray-400 text-lg md:text-xl mb-6 leading-relaxed">
            Open to discussing AI projects, cloud architecture, LLM security, or collaboration opportunities.
          </p>
          <div className="flex items-center justify-center gap-2 text-gray-500 mb-16">
            <MapPin className="w-5 h-5" />
            <span className="text-lg">Greater Toronto Area, Canada</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="flex flex-col sm:flex-row justify-center gap-6 sm:gap-8"
        >
          {socials.map((social, index) => (
            <motion.a
              key={social.name}
              href={social.url}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={isInView ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: 0.4, delay: 0.3 + index * 0.1 }}
              whileHover={{ scale: 1.05, y: -5 }}
              whileTap={{ scale: 0.95 }}
              className="glass-card px-8 py-8 group flex flex-col items-center gap-4 min-w-[200px]"
            >
              <social.icon
                className="w-12 h-12 transition-colors"
                style={{ color: social.color }}
              />
              <span className="text-sm text-gray-400 group-hover:text-white transition-colors font-medium">
                {social.label}
              </span>
            </motion.a>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-20 p-8 glass-card"
        >
          <p className="text-gray-400 text-lg">
            <span className="text-cyan-400 font-semibold text-xl">Cloud & AI Engineer 3</span>
            <span className="text-gray-500"> at Symcor</span>
          </p>
          <p className="text-gray-500 mt-2">4+ years building enterprise cloud & AI solutions</p>
          <p className="text-gray-600 mt-1">500+ connections on LinkedIn</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="mt-24 pt-8 border-t border-white/5"
        >
          <p className="text-gray-600 text-sm">
            © {new Date().getFullYear()} Harnoor Singh. Built with Next.js & Framer Motion.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
