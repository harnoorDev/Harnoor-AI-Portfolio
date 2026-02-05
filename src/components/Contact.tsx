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
  },
  {
    name: "GitHub",
    icon: Github,
    url: "https://github.com/harnoorDev",
    color: "#ffffff",
  },
  {
    name: "Email",
    icon: Mail,
    url: "mailto:hello@harnoor.dev",
    color: "#00d4ff",
  },
];

export default function Contact() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="contact" className="py-32 px-4 relative">
      <div className="max-w-4xl mx-auto text-center" ref={ref}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Let&apos;s <span className="gradient-text">Connect</span>
          </h2>
          <p className="text-gray-400 text-lg mb-4">
            Open to discussing AI projects, collaborations, or just geeking out about tech.
          </p>
          <div className="flex items-center justify-center gap-2 text-gray-500 mb-12">
            <MapPin className="w-4 h-4" />
            <span>Toronto, Canada</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="flex justify-center gap-6"
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
              whileHover={{ scale: 1.1, y: -5 }}
              whileTap={{ scale: 0.95 }}
              className="glass-card p-4 group"
            >
              <social.icon
                className="w-8 h-8 transition-colors"
                style={{ color: social.color }}
              />
              <span className="sr-only">{social.name}</span>
            </motion.a>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-24 pt-8 border-t border-white/10"
        >
          <p className="text-gray-500 text-sm">
            © {new Date().getFullYear()} Harnoor Singh. Built with Next.js & Framer Motion.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
