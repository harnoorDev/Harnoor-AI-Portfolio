"use client";

import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { Award, Shield, Cloud, Database, Network } from "lucide-react";

const certifications = [
  {
    name: "Azure Security Engineer",
    issuer: "Microsoft",
    icon: Shield,
    description: "Platform protection, identity & access, security operations with Sentinel",
    color: "#00A4EF",
  },
  {
    name: "Azure Cloud Certifications",
    issuer: "Microsoft",
    icon: Cloud,
    description: "Multiple Azure certifications for cloud architecture and services",
    color: "#00A4EF",
  },
  {
    name: "CCNA",
    issuer: "Cisco",
    icon: Network,
    description: "Cisco Certified Network Associate - Networking fundamentals",
    color: "#1BA0D7",
  },
  {
    name: "CompTIA",
    issuer: "CompTIA",
    icon: Award,
    description: "IT infrastructure and security foundations",
    color: "#C8202F",
  },
  {
    name: "Oracle",
    issuer: "Oracle",
    icon: Database,
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
            Industry-recognized credentials validating expertise in cloud, security, and infrastructure
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {certifications.map((cert, index) => (
            <motion.div
              key={cert.name}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="glass-card p-6 group"
            >
              <div className="flex items-start gap-4">
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 flex-shrink-0"
                  style={{ backgroundColor: `${cert.color}15` }}
                >
                  <cert.icon className="w-7 h-7" style={{ color: cert.color }} />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">{cert.name}</h3>
                  <p className="text-sm text-cyan-400 mb-2">{cert.issuer}</p>
                  <p className="text-sm text-gray-500">{cert.description}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
