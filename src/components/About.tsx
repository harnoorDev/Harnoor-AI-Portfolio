"use client";

import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { Shield, Cloud, Brain, Lock } from "lucide-react";

const highlights = [
  {
    icon: Brain,
    title: "AI Engineering",
    description: "Designing and deploying intelligent systems with LLMs and ML",
  },
  {
    icon: Cloud,
    title: "Cloud Architecture",
    description: "Scalable solutions on Azure, AWS, and modern cloud platforms",
  },
  {
    icon: Shield,
    title: "AI Security",
    description: "Securing LLM applications against OWASP top 10 risks",
  },
  {
    icon: Lock,
    title: "Production-Grade",
    description: "Building robust, secure systems ready for enterprise deployment",
  },
];

export default function About() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="about" className="py-32 px-4 relative">
      <div className="max-w-6xl mx-auto" ref={ref}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            About <span className="gradient-text">Me</span>
          </h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Cloud & AI Engineer with a passion for building secure, intelligent systems
            that solve real-world problems.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6">
          {highlights.map((item, index) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="glass-card p-6 flex gap-4"
            >
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                  <item.icon className="w-6 h-6 text-cyan-400" />
                </div>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                <p className="text-gray-400">{item.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
