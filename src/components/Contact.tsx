"use client";

import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { Linkedin, Github, Mail, MapPin, Phone } from "lucide-react";

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
            Open to discussing AI projects, cloud architecture, LLM security, or collaboration opportunities.
          </p>
          <div className="flex items-center justify-center gap-2 text-gray-500 mb-12">
            <MapPin className="w-4 h-4" />
            <span>Greater Toronto Area, Canada</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="flex justify-center gap-8 flex-wrap"
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
              className="glass-card p-6 group flex flex-col items-center gap-3"
            >
              <social.icon
                className="w-10 h-10 transition-colors"
                style={{ color: social.color }}
              />
              <span className="text-sm text-gray-400 group-hover:text-white transition-colors">
                {social.label}
              </span>
            </motion.a>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-16 p-6 glass-card"
        >
          <p className="text-gray-400">
            <span className="text-cyan-400 font-semibold">Cloud & AI Engineer 3</span> at Symcor
            <br />
            <span className="text-sm text-gray-500">4+ years building enterprise cloud & AI solutions</span>
            <br />
            <span className="text-sm text-gray-500">500+ connections on LinkedIn</span>
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.8 }}
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
