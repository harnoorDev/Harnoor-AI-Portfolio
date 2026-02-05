"use client";

import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { Award, Cloud, Brain, Network, Shield, Database } from "lucide-react";

const certifications = [
  {
    name: "Azure AI Engineer Associate",
    code: "AI-102",
    issuer: "Microsoft",
    icon: Brain,
    description: "Design and implement AI solutions using Azure Cognitive Services and Azure OpenAI",
    color: "#00A4EF",
  },
  {
    name: "Azure Administrator Associate",
    code: "AZ-104",
    issuer: "Microsoft",
    icon: Cloud,
    description: "Implement, manage, and monitor Azure environments",
    color: "#00A4EF",
  },
  {
    name: "Azure Fundamentals",
    code: "AZ-900",
    issuer: "Microsoft",
    icon: Cloud,
    description: "Cloud concepts, Azure services, security, privacy, and compliance",
    color: "#00A4EF",
  },
  {
    name: "NVIDIA AI Engineer",
    code: "",
    issuer: "NVIDIA",
    icon: Brain,
    description: "Deep learning, GPU-accelerated computing, and AI deployment",
    color: "#76B900",
  },
  {
    name: "CCNA",
    code: "",
    issuer: "Cisco",
    icon: Network,
    description: "Network fundamentals, IP connectivity, security fundamentals",
    color: "#1BA0D7",
  },
  {
    name: "CompTIA",
    code: "",
    issuer: "CompTIA",
    icon: Shield,
    description: "IT infrastructure and security foundations",
    color: "#C8202F",
  },
  {
    name: "Oracle Certified",
    code: "",
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
            Industry-recognized credentials in cloud, AI, networking, and security
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
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-lg">{cert.name}</h3>
                    {cert.code && (
                      <span className="text-xs px-2 py-0.5 rounded bg-white/10 text-gray-400">
                        {cert.code}
                      </span>
                    )}
                  </div>
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
