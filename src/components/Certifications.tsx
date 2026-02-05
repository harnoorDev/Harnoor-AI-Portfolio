"use client";

import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { Award } from "lucide-react";

const certifications = [
  {
    name: "Microsoft Azure Certifications",
    issuer: "Microsoft",
    description: "Multiple Azure cloud certifications",
    color: "#00A4EF",
  },
  {
    name: "CCNA",
    issuer: "Cisco",
    description: "Cisco Certified Network Associate",
    color: "#1BA0D7",
  },
  {
    name: "CompTIA",
    issuer: "CompTIA",
    description: "IT infrastructure and security",
    color: "#C8202F",
  },
  {
    name: "Oracle",
    issuer: "Oracle",
    description: "Database and cloud technologies",
    color: "#F80000",
  },
];

export default function Certifications() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="certifications" className="py-32 px-4 relative">
      <div className="max-w-6xl mx-auto" ref={ref}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="gradient-text">Certifications</span>
          </h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Industry-recognized credentials validating expertise
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {certifications.map((cert, index) => (
            <motion.div
              key={cert.name}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="glass-card p-6 text-center group"
            >
              <div
                className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center transition-transform group-hover:scale-110"
                style={{ backgroundColor: `${cert.color}20` }}
              >
                <Award className="w-8 h-8" style={{ color: cert.color }} />
              </div>
              <h3 className="font-semibold mb-1">{cert.name}</h3>
              <p className="text-sm text-cyan-400 mb-2">{cert.issuer}</p>
              <p className="text-sm text-gray-500">{cert.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
