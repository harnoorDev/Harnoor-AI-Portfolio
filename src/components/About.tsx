"use client";

import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { Shield, Cloud, Brain, Cpu, Target, Server, GraduationCap, Building } from "lucide-react";

const highlights = [
  {
    icon: Brain,
    title: "LLM Engineering & MLOps",
    description: "Building enterprise AI with Azure OpenAI, LangChain, LangGraph, LangSmith. Multi-agent workflows, LoRA fine-tuning, model quantization.",
  },
  {
    icon: Cpu,
    title: "Advanced RAG Systems",
    description: "Hybrid search architectures, semantic chunking, reranking with cross-encoders, HyDE, multi-query expansion.",
  },
  {
    icon: Target,
    title: "AI Red Teaming",
    description: "Adversarial assessments with OWASP LLM Top 10 & MITRE ATLAS. Prompt injection, jailbreak exploits, PyRIT, Garak.",
  },
  {
    icon: Cloud,
    title: "Cloud Architecture",
    description: "Azure AI Services, Functions, Cosmos DB, Sentinel. NVIDIA NIM, Triton Inference Server, TensorRT-LLM on Kubernetes.",
  },
  {
    icon: Shield,
    title: "Security & Compliance",
    description: "mTLS/TLS/SSL protocols, Azure WAF, Cloudflare WAF, PKI infrastructure, certificate-based authentication.",
  },
  {
    icon: Server,
    title: "Infrastructure & DevOps",
    description: "Docker, Kubernetes, Helm, Terraform, ARM templates. CI/CD with Azure DevOps and Jenkins.",
  },
  {
    icon: Building,
    title: "4+ Years at Symcor",
    description: "Cloud Engineer 1 → 2 → 3. Canadian Open Banking project, enterprise GenAI solutions, AI governance frameworks.",
  },
  {
    icon: GraduationCap,
    title: "Sheridan College",
    description: "Foundation in software development, cloud technologies, and systems design.",
  },
];

export default function About() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="about" className="py-32 px-6 md:px-8 relative">
      <div className="max-w-7xl mx-auto" ref={ref}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
            About <span className="gradient-text">Me</span>
          </h2>
          <p className="text-gray-400 text-lg md:text-xl max-w-3xl mx-auto leading-relaxed">
            Cloud & AI Engineer specializing in designing and deploying secure, production-grade 
            enterprise solutions across cloud infrastructure, LLM operations, and generative AI systems.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
          {highlights.map((item, index) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="glass-card p-6 lg:p-8 flex gap-5"
            >
              <div className="flex-shrink-0">
                <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 flex items-center justify-center">
                  <item.icon className="w-7 h-7 text-cyan-400" />
                </div>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-3">{item.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{item.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
